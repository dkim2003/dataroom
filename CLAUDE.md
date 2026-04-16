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
- **PDF rendering**: PDF.js CDN (`3.11.174`) loaded in `layout.js` via `<Script>`
- **Folder zip download**: JSZip CDN (`3.10.1`) loaded in `layout.js` via `<Script>`

### App Structure

```
app/
  page.js                               — Redirects to /login
  layout.js                             — Root layout; loads PDF.js + JSZip via CDN; title "SpaceLaunch VDR"
  login/page.js                         — Multi-step auth UI (greeting → type select → sign in)
  dashboard/page.js                     — Main VDR: document library + Sol AI chat + due diligence
  dashboard/admin/page.js               — Admin panel: user management, role assignment, "Create Standard Subfolders" button
  nda/page.js                           — NDA signing page (DocuSign embedded flow); useSearchParams wrapped in <Suspense>
  api/sol/route.js                      — Sol AI assistant endpoint (Claude + doc reading + web_search tool)
  api/documents/route.js                — Document listing; returns { documents, folderPaths } — folderPaths includes ALL subdirs (even empty)
  api/documents/signed-url/route.js     — Temporary download/view URLs (60s expiry); returns { requiresNda: true } for restricted docs
  api/documents/preview-urls/route.js   — Batch signed URLs for grid view thumbnails (POST, array of paths)
  api/documents/download/route.js       — Streams file bytes for direct download (avoids browser redirect to signed URL)
  api/documents/move/route.js           — Move/rename docs (download → re-upload → delete)
  api/upload/route.js                   — File upload to Supabase Storage (admin + employees)
  api/sort/route.js                     — AI auto-sort: reads PDF with Claude, returns folder + isRestricted + diligenceChecked
  api/folders/route.js                  — POST: creates a new subfolder .keep placeholder
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
  api/folder-order/route.js             — GET/POST: drag-to-reorder folder list, stored in settings table (key='folder_order')
public/
  favicon.svg                           — Rocket SVG favicon
```

All pages are client components (`"use client"`). API routes run server-side and use `SUPABASE_SERVICE_ROLE_KEY`.

### Access Control Model

Four user roles (stored in `profiles.role`):
- **`pre_nda_investor`** — approved investor, pre-NDA; sees general docs only, no Sol AI
- **`post_nda_investor`** — signed NDA; sees all docs including restricted, full Sol AI
- **`pre_nda_employee`** — employee before NDA; can upload/sort/move docs
- **`post_nda_employee`** — employee after NDA; full access
- **`admin`** — identified by hardcoded email `contact@kimduhyun.com`; full access + user management

Users start with status `pending` after signup. Admin approves/rejects from admin panel.

`isPostNda` check must cover both `post_nda_investor` AND `post_nda_employee`.
`isEmployee` check must cover both `pre_nda_employee` AND `post_nda_employee`.

### Document System

Documents live in Supabase Storage (`documents` bucket) under two path prefixes:
- `general/` — visible to all approved users
- `restricted/` — visible to `post_nda_*` and admin only

Path format: `{general|restricted}/{folder}/{subfolder}/{filename}` (subfolder is optional)

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

**New Folder button:** Blue button in action bar (top-right above document list) when inside a top-level folder. Creates a `.keep` placeholder file via `/api/folders`.

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
1. `/nda` page → calls `/api/nda-sign` → gets DocuSign embedded signing URL
2. User signs on DocuSign → redirected back to `/nda?event=signing_complete`
3. `/api/nda-complete` upgrades role: `pre_nda_investor` → `post_nda_investor`, `pre_nda_employee` → `post_nda_employee`

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

### Upcoming Work

1. **DocuSign fix** — `AUTHORIZATION_INVALID_TOKEN` error from envelope API; investigate JWT auth flow and sandbox configuration
2. **Pitch deck upload** — upload the actual pitch deck PDF after DocuSign is working

### Recent Fixes (session ending 2026-04-08)

- **Internal links visible to investors** — fixed server-side in `/api/links`: fetches top-level folder names from `internal/` storage prefix and checks `link.folder.split('/')[0]` against that set, instead of trusting the DB `internal` flag (which was always stored as false)
- **Folder rename not persisting** — root cause: `settings` table didn't exist in Supabase. Created table. Also fixed `saveTopFolderName` to use UPDATE/INSERT instead of upsert (avoids primary key conflict), and checks API response before updating state
- **Content heading not reflecting rename** — heading now resolves first path segment via `folderNames` state
- **List view column misalignment** — standardised all list rows (subfolders, files, links) to `1fr 180px 150px 40px`; DATE CREATED now shown for all users (was conditionally hidden for non-employees in file rows)

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
