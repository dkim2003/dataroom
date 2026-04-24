# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server on port 3000
npm run build    # Production build
npm start        # Start production server
npm run lint     # ESLint (Next.js config)
```

No test framework is configured. Env vars are in `.env` (not `.env.local`).

## Architecture

**Virtual Data Room (VDR) for Space Launch Technologies** — a secure document management platform with AI-powered assistant, built on Next.js App Router + Supabase.

### Tech Stack
- **Frontend**: Next.js 16 (App Router), React 19, Tailwind CSS v4
- **Backend**: Next.js API Routes (server-side)
- **Database & Auth**: Supabase (PostgreSQL + RLS + Storage)
- **AI**: Anthropic Claude API (`claude-sonnet-4-20250514`) via `@anthropic-ai/sdk`
- **NDA signing**: DocuSign JWT service integration (sandbox: `account-d.docusign.com`)
- **PDF rendering**: PDF.js CDN (`3.11.174`) loaded in `layout.js` via `<Script>` with SRI integrity hash; worker self-hosted at `public/pdf.worker.min.js`
- **Folder zip download**: JSZip CDN (`3.10.1`) loaded in `layout.js` via `<Script>` with SRI integrity hash

### App Structure

```
app/
  page.js                               — Redirects to /login
  layout.js                             — Root layout; loads PDF.js + JSZip via CDN (with SRI hashes); title "SpaceLaunch VDR"
  login/page.js                         — Multi-step auth UI (greeting → type select → sign in)
  dashboard/page.js                     — Main VDR: document library + Sol AI chat + due diligence
  dashboard/admin/page.js               — Admin panel: user management, role assignment, "Create Standard Subfolders" button
  nda/page.js                           — NDA signing page (DocuSign embedded flow); useSearchParams wrapped in <Suspense>
  api/sol/route.js                      — Sol AI assistant endpoint (Claude + doc reading + web_search tool); all authenticated users
  api/documents/route.js                — Document listing; returns { documents, folderPaths } — folderPaths includes ALL subdirs (even empty)
  api/documents/signed-url/route.js     — Temporary download/view URLs (60s expiry); returns { requiresNda: true } for restricted docs
  api/documents/preview-urls/route.js   — Batch signed URLs for grid view thumbnails (POST, array of paths)
  api/documents/download/route.js       — Streams file bytes for direct download (avoids browser redirect to signed URL)
  api/documents/move/route.js           — Move/rename docs (download → re-upload → delete); same-prefix only, path-validated
  api/upload/route.js                   — File upload to Supabase Storage (admin + employees); path-validated, 100 MB limit, blocks pending users
  api/sort/route.js                     — AI auto-sort: reads PDF with Claude, returns folder + isRestricted + diligenceChecked; rate-limited
  api/sort-link/route.js                — AI auto-sort for links: returns folder + isRestricted; rate-limited, employee/admin only
  api/folders/route.js                  — POST: creates subfolder .keep placeholder; DELETE: removes .keep (path-validated, .keep-only)
  api/folders/purge/route.js            — POST (admin/employee): recursively removes .keep + .emptyFolderPlaceholder sentinels for a top-level folder across all prefixes; used after deleteTopLevelFolder to clear Supabase-dashboard-created artifacts
  api/pitch-deck/route.js               — GET: returns signed URL for current pitch deck (any approved user); POST: upload new pitch deck PDF (replaces existing, upsert, 100 MB limit, admin/employee only); DELETE: remove pitch deck
  api/trash/route.js                    — GET: list trash items (auto-purges expired); POST: move file to trash
  api/trash/restore/route.js            — POST: restore a trashed file back to its original path
  api/trash/delete/route.js             — POST: permanently delete a file from trash
  api/activity/route.js                 — GET: audit log entries for the activity feed
  api/activity/user-recents/route.js    — GET: per-user last-opened timestamps for "Last Opened" column
  api/nda-sign/route.js                 — Creates DocuSign envelope from template, returns embedded signing URL
  api/nda-complete/route.js             — Upgrades user role from pre_nda_* to post_nda_* after signing
  api/tutorial-complete/route.js        — Sets has_seen_tutorial = true (uses service role to bypass RLS)
  api/setup/subfolders/route.js         — POST (admin only): creates 27 standard subfolder .keep placeholders
  api/folder-names/route.js             — GET/POST/DELETE: display name overrides for top-level folders, stored in settings table (key='folder_names')
  api/folder-order/route.js             — GET (auth required)/POST: drag-to-reorder folder list, stored in settings table (key='folder_order'); validates array
  api/signup/route.js                   — Server-side signup. Sanitizes role to pre_nda_investor or pre_nda_employee. Min 8-char password.
  api/verify-email/route.js             — POST: sets profiles.email_verified = true ONLY if Supabase user.email_confirmed_at is set
  api/admin/approve/route.js            — POST: approve pending user, send magic-link email. Looks up email/name from DB (not body). HTML-escapes fullName.
  api/private/route.js                  — CRUD for private_items table (notes/items); scoped to user.id via RLS
  api/private-files/route.js            — GET/POST/PATCH/DELETE for private Storage files; path-validated, confined to private/{userId}/
  api/links/route.js                    — CRUD for document_links; URL-validated (http(s) only); PATCH/DELETE owner-or-admin
  api/re-request-access/route.js        — POST: re-request access after rejection
lib/
  docusign.js                           — Shared DocuSign JWT / envelope helpers: getAccessToken, getAccountInfo, getEnvelopeStatus
  pathSafety.js                         — isSafeSegment (with Unicode NFC normalization), isSafeRelativePath, isSafeStoragePath, escapeHtml — used by all file-path routes
  rateLimit.js                          — In-memory sliding-window per-user rate limiter with periodic stale-entry eviction (60s sweep)
public/
  favicon.svg                           — Rocket SVG favicon
  pdf.worker.min.js                     — Self-hosted PDF.js worker (v3.11.174) — eliminates CDN trust for worker thread
```

All pages are client components (`"use client"`). API routes run server-side and use `SUPABASE_SERVICE_ROLE_KEY`.

`next.config.mjs` sets security headers on all routes: `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, and CSP with `default-src 'self'`, `script-src` (self + cdnjs + unsafe-inline/eval for Next.js), `style-src` (self + Google Fonts), `font-src`, `img-src` (self + data/blob), `connect-src` (self + Supabase + Anthropic), `frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'self'`. A nonce-based `script-src` CSP (to drop `unsafe-inline`/`unsafe-eval`) requires middleware and is a separate project.

### Access Control Model

Four user roles (stored in `profiles.role`):
- **`pre_nda_investor`** — approved investor, pre-NDA; sees general docs only, Sol AI limited to general docs
- **`post_nda_investor`** — signed NDA; sees all docs including restricted, full Sol AI
- **`pre_nda_employee`** — employee before NDA; can upload/sort/move docs
- **`post_nda_employee`** — employee after NDA; full access
- **`admin`** — identified by email `contact@kimduhyun.com` OR `profiles.is_admin === true`; full access + user management

Users start with status `pending` after signup. Admin approves/rejects from admin panel.

`isPostNda` check must cover both `post_nda_investor` AND `post_nda_employee`.
`isEmployee` check must cover both `pre_nda_employee` AND `post_nda_employee`.

### Document System

Documents live in Supabase Storage (`documents` bucket) under four path prefixes:
- `general/` — visible to all approved users
- `restricted/` — visible to `post_nda_*` and admin only; file names visible to pre-NDA users (so they see what's behind the NDA gate) but not openable/downloadable
- `internal/` — visible to employees and admin only (not investors)
- `private/{userId}/` — visible only to the owning user and admin
- `trash/{trashId}/` — managed by trash endpoints, not directly accessible

Path format: `{prefix}/{folder}/{subfolder}/{filename}` (subfolder is optional). All user-supplied path segments are validated via `lib/pathSafety.js` to prevent traversal (`..`), null bytes, and cross-prefix escape.

The `documents` API returns both `documents` (files) and `folderPaths` (all folder paths including empty ones). The dashboard builds `subfolderMap` from `folderPaths` to display empty subfolders.

**Folder navigation in dashboard:**
- Top-level folder click → shows subfolders + direct files only (files inside subfolders are NOT shown at parent level)
- `filteredDocs` for top-level folder uses `p.length === 3` to exclude subfolder files
- Subfolder click → shows files in that subfolder
- Back button (below upload zone, always reserves space with `visibility: hidden` when not in subfolder)

**Subfolder display modes:**
- Grid view: folder cards with preview area (big folder icon), footer (name + three-dot menu), draggable
- List view: rows matching file list style — NAME / LAST OPENED / DATE CREATED / three-dot menu columns

**Top-level folder display names:** Right-click a sidebar folder → Rename saves a display name override to `settings` table via `/api/folder-names`. The `folderNames` state maps original storage folder name → display name. Content heading and sidebar both use `folderNames[folder] || folder.replace(/_/g,' ').replace(/^\d+\s+/,'')`. Does NOT rename storage paths.

**Three-dot menu on files:** Open, Download, Rename (move API), Move to trash
- `openMenuPath` state tracks which file's menu is open; closed via `useEffect` document-level click listener

**Three-dot menu on subfolders:** Open, Download (JSZip all files → .zip), Rename (moves all files), Move to trash (moves all files)
- `openFolderMenu` state tracks which folder's menu is open; closed via `useEffect` document-level click listener
- `draggingFolder` state enables drag-and-drop of subfolders to other top-level folders

**Trash system:** Deleted files (via three-dot menu) are moved to a `trash` table in Supabase, not hard-deleted. "Recently Deleted" sidebar button (employees/admin only) shows trashed items. From there users can Restore (moves file back to original path) or permanently Delete. Auto-purge of expired items runs on GET.

**New Folder button:** Blue button in action bar (top-right above document list) when creating a top-level folder or when inside a folder. Creates a `.keep` placeholder file via `/api/folders`. Access dropdown (Public / Restricted / Internal) is shown for top-level creation; inherits parent's access level for subfolders.

**Top-level folder deletion:** `deleteTopLevelFolder` trashes all documents, deletes `.keep` placeholders, calls `/api/folders/purge` to remove Supabase-dashboard `.emptyFolderPlaceholder` files, removes folder from `folderOrder` and `folderNames`, and clears `activeFolder` if inside the deleted folder.

**Folder display names:** `/api/folder-names` GET is accessible to any authenticated user so investors see the same display-name overrides as admins/employees. Write operations (POST/DELETE) remain admin/employee only.

**Move prefix detection:** `handleMoveDoc` and `handleMoveFolder` explicitly check all three storage prefixes (internal > restricted > general) and refuse the move with an error if the target folder is not found in any prefix. No silent fallback to `general/`. This prevents files being silently routed to the wrong access tier during drag-and-drop.

**Pitch deck tab:** Admins and employees can upload a PDF directly from the Pitch Deck tab. Upload replaces the existing pitch deck (`pitch_deck/current.pdf` in Supabase Storage). All approved users can view it via a signed URL fetched from `/api/pitch-deck`.

**Standard subfolder structure** (27 subfolders across 10 top-level folders) created via admin panel → "Create Standard Subfolders". All currently in `general/` prefix.

The `due_diligence` table tracks investor checklist items with `id`, `item`, `position`, `checked` fields. The sort API auto-checks items when matching documents are uploaded.

**settings table** (Supabase Postgres): stores key/value pairs for app config. Must exist — create with:
```sql
create table public.settings (key text primary key, value jsonb not null default '{}');
```
Current keys: `folder_names` (display name overrides), `folder_order` (sidebar folder order).
`/api/folder-names` POST uses UPDATE/INSERT (not upsert) to avoid primary key conflicts.

All document views are logged to `audit_log` table. Last-opened timestamps per user come from `/api/activity/user-recents` and are shown in the "Last Opened" column in list view.

### Document View (dashboard)

- **List/grid toggle** (`docView` state): buttons in top-right of doc library header; `data-tutorial="view-toggle"`
- **Grid view**: batch-fetches preview URLs via `/api/documents/preview-urls`, then renders PDF thumbnails via PDF.js canvas (not iframe — avoids Chrome PDF toolbar); saved as JPEG data URLs in `pdfThumbnails` state
- **List view**: shows NAME / LAST OPENED / DATE CREATED / action columns — grid `1fr 180px 150px 40px` used consistently across all sections (subfolders, files, links); last-opened pulled from `userRecents` state
- **No lock styling** on restricted docs in grid — restricted badge shown instead; clicking redirects to NDA
- **Action bar** (below upload zone, above content): back button left + New folder button right (blue); always rendered when `activeFolder` is set
- **New folder button**: bright blue styling (`rgba(59,130,246,0.15)` bg, `#93c5fd` text)
- **Drag-and-drop**: files and subfolders can be dragged to sidebar folders; `draggingDoc` / `draggingFolder` states

### NDA Flow

Pre-NDA users who click a restricted document get redirected to `/nda`. The flow:
1. `/nda` page → calls `/api/nda-sign` → gets DocuSign embedded signing URL. The envelopeId is persisted to `profiles.docusign_envelope_id`.
2. User signs on DocuSign → redirected back to `/nda?event=signing_complete`
3. `/api/nda-complete` **re-fetches the envelope from DocuSign** (using `lib/docusign.js` → `getEnvelopeStatus`), confirms `status === 'completed'` AND that the signer with `clientUserId === user.id` is marked completed, THEN upgrades the role. The return-URL event param is NOT trusted.

DocuSign uses RS256 JWT auth (service integration). Private key stored in `.env` as single-line with `\n` literals wrapped in double quotes. The `roleName` in the envelope template roles must match the role name configured in the DocuSign template (default: `"Signer"`).

**Known issue**: DocuSign sandbox `/oauth/userinfo` endpoint intermittently returns 401 with `internal_server_error`. Currently using `DOCUSIGN_ACCOUNT_ID` from env directly. `AUTHORIZATION_INVALID_TOKEN` from the envelope API is an unresolved issue — **next task: investigate and fix DocuSign flow**.

### Tutorial System

Dashboard shows a spotlight tutorial on first login (tracked via `profiles.has_seen_tutorial`).
- Investors see `INVESTOR_TUTORIAL_STEPS` (5 steps), employees see `EMPLOYEE_TUTORIAL_STEPS` (6 steps)
- Spotlight uses `box-shadow: 0 0 0 9999px rgba(0,0,0,0.78)` trick with `data-tutorial` attributes
- `data-tutorial` targets in use: `folders`, `doc-library`, `view-toggle`, `sol-panel`, `pitchdeck-tab`, `upload-zone`, `trash-nav`, `diligence-tab`
- Completion calls `/api/tutorial-complete` (service role) to bypass RLS

### Sol AI Assistant

`/api/sol/route.js` handles the Sol chatbot. For PDF-related queries, it fetches a signed URL, downloads the PDF, base64-encodes it, and passes it as a `document` block to Claude. Sol has web search via Claude's `web_search` tool. Conversation history (last 10 messages) passed per request. Responses strip markdown (asterisks removed, custom bullet style).

**Access**: all authenticated, approved users (pending/rejected users blocked). The `isAdmin` / `hasRestrictedAccess` flags control what documents Sol can read and what it reveals, not whether the user can use Sol. Conversation history from the client is validated: only `{ role: 'user' | 'assistant', content: string }` entries are accepted; injected system messages or non-string content are stripped. User messages are sent as a separate message block from instruction text (prompt injection mitigation).

### Upcoming Work

1. **DocuSign fix** — `AUTHORIZATION_INVALID_TOKEN` error from envelope API; investigate JWT auth flow and sandbox configuration

### Recent Fixes (session 2026-04-20/23)

1. **Pitch deck tab** — added `/api/pitch-deck` (GET/POST/DELETE) with a dedicated `pitch_deck/current.pdf` storage path. Admins/employees can upload from the Pitch Deck tab directly; upload replaces the existing file. No longer reliant on Sol or hardcoded folders.
2. **Dynamic AI sort** — `/api/sort` and `/api/sort-link` no longer use hardcoded folder lists. Both accept `folderPaths` from the client and build the folder list dynamically each call. Sort endpoints now require employee/admin (any auth'd user could previously trigger Claude API).
3. **Hardcoded `FALLBACK_FOLDERS` removed** — dashboard no longer re-injects deleted folders. `baseFolders` is now built purely from live `folderPaths`. Folders can now be deleted permanently without reappearing.
4. **Top-level folder deletion fixed** — `deleteTopLevelFolder` now removes the folder from `folderOrder` and `folderNames` state and calls `/api/folders/purge` to clean up `.emptyFolderPlaceholder` files created by Supabase's dashboard UI. This was the root cause of folders like "Market Opportunity", "Product Technology" surviving deletion.
5. **`/api/folders/purge`** — new endpoint that recursively removes `.keep` and `.emptyFolderPlaceholder` sentinel files across all storage prefixes for a given top-level folder name.
6. **Move prefix detection hardened** — `handleMoveDoc` and `handleMoveFolder` now explicitly check all three prefixes (internal > restricted > general) and refuse with an error message if the target folder is not present in any prefix. Previously silently defaulted to `general/`, causing files to land in the wrong access tier.
7. **`/api/folder-names` GET opened to all auth'd users** — investors now see the same display name overrides as admins/employees, fixing sidebar folder names showing as "- Corporate, Legal" instead of "1 - Corporate, Legal".
8. **Back button label fixed** — back button now resolves folder segments via `folderNames` override map, matching the heading.
9. **Cross-prefix move policy** — `/api/documents/move` now allows escalating moves (general → restricted, general → internal) while blocking demotion moves (internal → general). Previously cross-prefix was blocked entirely.

### Recent Fixes (session ending 2026-04-08)

- **Internal links visible to investors** — fixed server-side in `/api/links`: fetches top-level folder names from `internal/` storage prefix and checks `link.folder.split('/')[0]` against that set, instead of trusting the DB `internal` flag (which was always stored as false)
- **Folder rename not persisting** — root cause: `settings` table didn't exist in Supabase. Created table. Also fixed `saveTopFolderName` to use UPDATE/INSERT instead of upsert (avoids primary key conflict), and checks API response before updating state
- **Content heading not reflecting rename** — heading now resolves first path segment via `folderNames` state
- **List view column misalignment** — standardised all list rows (subfolders, files, links) to `1fr 180px 150px 40px`; DATE CREATED now shown for all users (was conditionally hidden for non-employees in file rows)

### Security Fixes (session 2026-04-16)

A full codebase audit identified nine CRITICAL/HIGH issues. All are now fixed.

**Required one-time DB change** — add a column to `profiles` so the NDA fix has somewhere to store the envelopeId:
```sql
alter table public.profiles add column if not exists docusign_envelope_id text;
```

1. **NDA bypass fix** (`/api/nda-complete`) — previously upgraded any pre-NDA caller to post-NDA on demand. Now re-fetches the envelope from DocuSign via `lib/docusign.js` and requires `envelope.status === 'completed'` AND a signer with `clientUserId === user.id && status === 'completed'`. `/api/nda-sign` persists `envelopeId` to `profiles.docusign_envelope_id` when creating the envelope.
2. **Email verification fix** (`/api/verify-email`) — previously any authenticated user could POST and set `email_verified = true`. Now requires `user.email_confirmed_at` on the Supabase auth record (set only when the magic link is actually clicked).
3. **Signup role self-assignment fix** — previously `login/page.js` called `supabase.auth.signUp` directly with a client-supplied `role` in `options.data`, which an attacker could tamper with (e.g. to send `role: 'post_nda_employee'` or `'admin'`). Now signup goes through `/api/signup`, which uses `supabase.auth.admin.createUser` with a server-derived role. The login page sends `userType: 'investor' | 'employee'`, and the server maps it to `pre_nda_investor` / `pre_nda_employee`. Defense-in-depth: the route also writes the sanitized role to the profile row after creation, in case the DB trigger copies something else.
4. **`internal/` access check added to download route** — `/api/documents/download` previously only checked `private/` and `restricted/`. An investor could craft a direct download of `internal/...` paths. Added explicit `isEmployee || isAdmin` gate for `internal/` and `trash/`.
5. **Full access checks on `/api/documents/preview-urls`** — previously only checked `restricted/`. Now mirrors `signed-url` logic: private (owner-or-admin), internal (employees+admin), restricted (post-NDA+admin), trash (blocked).
6. **XSS hardening on link URLs** — `/api/links` POST now normalizes and validates the URL, rejecting anything other than `http(s)`. Dashboard now routes all "Open" clicks on links through `openSafeLink()`, which blocks `javascript:`, `data:`, `vbscript:`, `file:` schemes and opens with `noopener,noreferrer` window features so the target cannot hijack the opener.
7. **Private-file trash ownership** — POST/restore/delete on `/api/trash*` now reject non-admin non-owner attempts to trash or restore a file whose `original_path` is under `private/{otherUserId}/...`. The trash GET also hides other users' private items from non-admin employees.
8. **Link ownership on PATCH/DELETE** — `/api/links` PATCH and DELETE now require `link.created_by === user.id` (or admin). Previously any employee/admin could rename/delete any link, including other users' private-tab links.
9. **Admin profile PATCH whitelist** — `/api/admin/profiles` PATCH now filters `updates` to a whitelist (`status`, `role`, `is_admin`, `full_name`, `email_verified`, `has_seen_tutorial`) and validates enum values for role/status. Previously an admin (or XSS-via-admin) could write to any profile column, including `docusign_envelope_id` or `id`.

**UI/UX impact**:
- NDA: if a user clicks "I've signed" before actually completing DocuSign, they now see an error instead of silently being upgraded. Expected behavior, but different from before.
- Signup: visually identical. The network call target changed (`/api/signup` instead of a direct Supabase call), but the form, validation, error messages, and pending/rejected screens are the same.
- Email verification: users who haven't clicked the magic link will still see the "Please confirm your email first" message on login, as before. Unchanged UX for the normal flow.
- Link open: invalid/non-http(s) links now show a browser `alert()` and refuse to open. Existing http(s) links work unchanged.
- Links PATCH/DELETE: employees can no longer rename/delete links they didn't create. If this breaks a workflow, an admin can always do it.
- Trash: non-admin employees no longer see other users' private items in "Recently Deleted" list. Everything else (general/restricted/internal) is unchanged.
- Admin panel: if any existing admin UI was sending extra columns in `updates`, those are now silently dropped. The legitimate fields (role, status, is_admin, etc.) still work.

### Security Fixes — Second Pass (session 2026-04-17)

Exhaustive data-flow audit of every route identified 20+ additional issues. All fixed.

**New shared modules:**
- `lib/pathSafety.js` — `isSafeSegment()`, `isSafeRelativePath()`, `isSafeStoragePath()`, `escapeHtml()`. Used by folders, move, upload, private-files, trash, approve.
- `lib/rateLimit.js` — in-memory sliding-window per-user rate limiter for Claude API endpoints.

**Tier 1 — Critical path traversal / file escape:**
1. **`/api/folders` DELETE** — previously accepted arbitrary `keepPath` and called `storage.remove()` on it. Any employee could delete ANY file. Now validates path is safe, under allowed prefix, and ends with `/.keep`.
2. **`/api/folders` POST** — `folderPath` now validated via `isSafeRelativePath()`.
3. **`/api/documents/move`** — no validation on `oldPath`/`newPath`. Could move `private/` files to `general/`, cross prefixes, or use `..` traversal. Now: both paths must be safe and share the same top-level prefix. `upsert` changed to `false` (no silent overwrite).
4. **`/api/private-files` PATCH** — `explicitNewPath` accepted without validation. Could relocate a file from `private/{userId}/` to `general/`. Now: newPath must stay under `private/{pathUserId}/`, validated via `isSafeRelativePath()`.
5. **`/api/upload`** — `file.name`, `folder`, `privateSubfolder` all user-controlled and unvalidated. Path traversal via `../../` in any of them. Now: all validated (`isSafeSegment` for filename, `isSafeRelativePath` for folder/subfolder). 100 MB size limit enforced server-side. Pending/rejected users blocked.

**Tier 2 — Admin trust boundary:**
6. **`/api/admin/approve`** — body-supplied `email` and `fullName` trusted. An attacker (or XSS-via-admin) could redirect the magic link to a different email, or inject HTML via fullName into the approval email. Now: email and fullName looked up from Supabase auth/profiles by `userId`. `fullName` HTML-escaped via `escapeHtml()`.

**Tier 3 — Access control & cost ceiling:**
7. **`/api/sol`** — admin check used only `ADMIN_EMAIL`, ignoring `is_admin` flag. Fixed: `is_admin` now included. All authenticated users retain full Sol access (no role gate or rate limit — by design).
8. **`/api/sort-link`** — no role check at all. Any authenticated user could trigger Claude API calls. Now requires employee/admin. Rate limited (20 / 5 min).
9. **`/api/sort`** — admin check used only `ADMIN_EMAIL`. Now includes `is_admin`. Rate limited (20 / 5 min).
10. **`/api/folder-order` GET** — no auth required. Leaked folder names to unauthenticated visitors. Now requires auth. POST now validates `order` is an array of strings, capped at 200 entries.
11. **`/api/documents`** — restricted file names were initially redacted for pre-NDA investors, but this was reverted in the third pass per explicit user request. Pre-NDA users can see restricted file names but cannot open/download them.
12. **`/api/signup`** — no password length validation. Now requires >= 8 characters.
13. **Recursion depth cap** — `listAll` / `listAllFolders` in documents, sol, private-files routes now capped at depth 8 to prevent pathological folder trees from blowing the event loop.

**Tier 4 — Hardening:**
14. **Generic error messages** — all API route catch blocks now return `'Server error'` instead of `err.message`, preventing internal details (DB connection strings, file paths, stack traces) from leaking to clients.
15. **Security headers** (`next.config.mjs`) — added `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, baseline CSP (`frame-ancestors 'none'; object-src 'none'; base-uri 'self'`).
16. **SRI on CDN scripts** (`layout.js`) — PDF.js and JSZip `<Script>` tags now include `integrity` (SHA-384) and `crossOrigin="anonymous"` attributes.
17. **Trash POST** — `path` and `fileName` now validated via `isSafeRelativePath` / `isSafeSegment` before interpolation into storage paths.

**UI/UX impact from second-pass fixes:**
- **Move/rename**: if the destination path already exists, the API now returns 409 instead of silently overwriting.
- **Private file rename**: same 409-on-conflict behavior. Also, moves that would escape the user's private directory are now rejected.
- **Sol AI**: no access change — all authenticated users can still use Sol. Only the admin detection was fixed (`is_admin` flag now recognized).
- **Sort / sort-link**: investors can no longer trigger these endpoints. Rate-limited users get 429.
- **Folder order**: GET now requires auth header. If the dashboard fetches folder order before auth is ready, it will get a 401 (should already be sending the header).
- **Upload**: pending/rejected users can no longer upload to their private folder. Uploads over 100 MB are rejected with 413.
- **Approval email**: no visible change (fullName still shown), but HTML tags in a name are now escaped instead of rendered.

### Security Fixes — Third Pass (session 2026-04-18/19)

Exhaustive penetration test via 8 parallel audit agents covering every file in the codebase. Identified 30 issues across CRITICAL/HIGH/MEDIUM/LOW. All actionable items fixed.

**Fixes implemented:**

1. **Due diligence client-side role guards** — `handleDiligenceToggle`, `handleDiligenceAdd`, `handleDiligenceEditConfirm`, `handleDiligenceDelete` now check `isEmployee || isAdmin` before executing. Previously callable from browser console by any authenticated user. **Note: RLS on `due_diligence` table should be verified — if it allows writes from any authenticated user, add a policy restricting to employees/admin.**
2. **Unicode normalization in pathSafety.js** — `isSafeSegment()` now calls `s.normalize('NFC')` and rejects fullwidth solidus (`U+FF0F`), fullwidth backslash (`U+FF3C`), fraction slash (`U+2044`), division slash (`U+2215`). Prevents lookalike-character path traversal.
3. **Rate limiter stale-entry eviction** — `rateLimit.js` now sweeps expired entries from the `buckets` Map every 60 seconds, preventing unbounded memory growth in long-running processes.
4. **Error message leaks fixed across 18 locations in 15 routes** — all inner error paths that returned `error.message`, `uploadError.message`, `insertError.message`, etc. now return generic `'Server error'` or context-appropriate messages. Prevents leaking Supabase table/column names, connection details, or stack traces. Routes fixed: signed-url, download, upload, folder-names, folders, trash, trash/restore, links, private, private-files, admin/profiles, admin/approve, nda-complete, re-request-access, signup.
5. **Sol pending/rejected user block** — Sol now fetches `profile.status` and returns 403 for pending/rejected users. Prevents unapproved users from triggering Claude API calls via saved tokens or direct API access.
6. **Trash prefix-aware access control** — trash POST and trash/restore now check `hasRestrictedAccess`. Pre-NDA employees cannot trash or restore `restricted/` files.
7. **Optimistic folder rename rollback** — `renameFolder` in dashboard saves state snapshots before optimistic update. If any move API call fails, it rolls back `documents`, `folderPaths`, and `activeFolder` to their previous values and reloads from the server.
8. **Sol conversation history validation** — the `history` array from the client is filtered to only accept `{ role: 'user' | 'assistant', content: string }`. Injected system messages, tool-use blocks, non-string content, or unexpected roles are stripped. Mitigates prompt injection via crafted history.
9. **DocuSign envelopeId UUID validation** — `getEnvelopeStatus()` validates envelopeId matches UUID format before URL interpolation, preventing path injection against the DocuSign API. Also removed `JSON.stringify(data)` from error message that could leak DocuSign account metadata.
10. **CSP expansion** — `next.config.mjs` CSP now includes `default-src 'self'`, `script-src` (self + cdnjs + unsafe-inline/eval), `style-src` (self + Google Fonts), `font-src`, `img-src` (self + data/blob), `connect-src` (self + Supabase URL + Anthropic API), plus existing `frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'self'`.
11. **Preview-urls array cap** — max 50 paths per batch request. Prevents DoS via thousands of concurrent `createSignedUrl` calls.
12. **Upload no-overwrite for non-private files** — changed `upsert: true` to `upsert: false`. Returns 409 with "A file with that name already exists in this folder" instead of silently replacing. Private uploads still allow overwrite (owner-only files).
13. **Sort endpoint file size cap** — 100 MB limit matching the upload route. Prevents memory exhaustion from loading huge files into memory for base64 encoding.
14. **Path validation on signed-url, download, preview-urls** — all three routes now import and use `isSafeRelativePath()` to validate the `path` parameter. Previously had access-control checks but no path traversal prevention.
15. **Restricted file name visibility reverted** — per explicit user request, pre-NDA users can see restricted file names (not redacted). Files remain unopenable/undownloadable until NDA is signed. This is an intentional design choice, not an oversight.
16. **Self-hosted PDF.js worker** — `pdf.worker.min.js` now served from `/public/` instead of loaded from CDN, eliminating CDN trust dependency for the worker thread.
17. **Sol prompt separation** — user's raw message sent as a separate message block from instruction/document context, not embedded inside instruction text. Reduces prompt injection surface.
18. **Mobile Sol markdown cleaning** — mobile Sol drawer now applies `cleanMarkdown()` to assistant messages (was missing, unlike desktop panel).
19. **Folder-order fetch auth** — dashboard now sends `authorization` header when fetching folder order (was missing after prior session's auth requirement was added).
20. **deleteTopLevelFolder field name fix** — changed `name: doc.name` to `fileName: doc.name` in trash API call (API expects `fileName`).
21. **Multi-byte safe audit logging** — Sol audit log uses `[...message].slice(0, 100).join('')` instead of `substring()` to correctly handle multi-byte Unicode characters.

**UI/UX impact from third-pass fixes:**
- **Upload duplicate names**: uploading a file with the same name as an existing one now returns an error instead of silently replacing. Users must rename or delete the existing file first.
- **Folder rename failures**: if a rename partially fails, the UI snaps back to original names and shows an error toast, instead of getting stuck in a broken state.
- **CSP**: if new CDN scripts, analytics, or third-party embeds are added later, their domains must be added to the CSP in `next.config.mjs` or they will be blocked.
- All other changes are invisible server-side hardening.

### Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY        # Server-side only
ANTHROPIC_API_KEY
DOCUSIGN_INTEGRATION_KEY         # OAuth client ID
DOCUSIGN_USER_ID                 # Admin's DocuSign API Username (UUID)
DOCUSIGN_ACCOUNT_ID              # DocuSign account UUID
DOCUSIGN_TEMPLATE_ID             # NDA template ID
DOCUSIGN_PRIVATE_KEY             # RSA private key — single line, \n literals, double-quoted
```

### Path Aliases

`@/*` maps to the project root (configured in `jsconfig.json`).
