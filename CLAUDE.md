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
  page.js                            — Redirects to /login
  layout.js                          — Root layout; loads PDF.js + JSZip via CDN; title "SpaceLaunch VDR"
  login/page.js                      — Multi-step auth UI (greeting → type select → sign in)
  dashboard/page.js                  — Main VDR: document library + Sol AI chat + due diligence
  dashboard/admin/page.js            — Admin panel: user management, role assignment, "Create Standard Subfolders" button
  nda/page.js                        — NDA signing page (DocuSign embedded flow)
  api/sol/route.js                   — Sol AI assistant endpoint (Claude + doc reading)
  api/documents/route.js             — Document listing; returns { documents, folderPaths } — folderPaths includes ALL subdirs (even empty)
  api/documents/signed-url/route.js  — Temporary download/view URLs (60s expiry); returns { requiresNda: true } for restricted docs
  api/documents/move/route.js        — Move/rename docs (download → re-upload → delete)
  api/upload/route.js                — File upload to Supabase Storage (admin + employees)
  api/sort/route.js                  — AI auto-sort: reads PDF with Claude, returns folder + isRestricted + diligenceChecked
  api/nda-sign/route.js              — Creates DocuSign envelope from template, returns embedded signing URL
  api/nda-complete/route.js          — Upgrades user role from pre_nda_* to post_nda_* after signing
  api/tutorial-complete/route.js     — Sets has_seen_tutorial = true (uses service role to bypass RLS)
  api/setup/subfolders/route.js      — POST (admin only): creates 27 standard subfolder .keep placeholders
public/
  favicon.svg                        — Rocket SVG favicon
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
- List view: rows matching file list style — NAME / LAST OPENED / three-dot menu columns

**Three-dot menu on subfolders:** Open, Download (JSZip all files → .zip), Rename (moves all files), Move to trash (moves all files)
- `openFolderMenu` state tracks which folder's menu is open; closed via `useEffect` document-level click listener
- `draggingFolder` state enables drag-and-drop of subfolders to other top-level folders

**Standard subfolder structure** (27 subfolders across 10 top-level folders) created via admin panel → "Create Standard Subfolders". All currently in `general/` prefix.

The `due_diligence` table tracks investor checklist items with `id`, `item`, `position`, `checked` fields. The sort API auto-checks items when matching documents are uploaded.

All document views are logged to `audit_log` table.

### Document View (dashboard)

- **List/grid toggle** (`docView` state): persists within session
- **Grid view**: PDF thumbnails rendered via PDF.js canvas (not iframe — avoids Chrome PDF toolbar); saved as JPEG data URLs in `pdfThumbnails` state
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
- Investors see `INVESTOR_TUTORIAL_STEPS`, employees see `EMPLOYEE_TUTORIAL_STEPS`
- Spotlight uses `box-shadow: 0 0 0 9999px rgba(0,0,0,0.78)` trick with `data-tutorial` attributes
- Completion calls `/api/tutorial-complete` (service role) to bypass RLS

### Sol AI Assistant

`/api/sol/route.js` handles the Sol chatbot. For PDF-related queries, it fetches a signed URL, downloads the PDF, base64-encodes it, and passes it as a `document` block to Claude. Sol has web search via Claude's `web_search` tool. Conversation history (last 10 messages) passed per request. Responses strip markdown (asterisks removed, custom bullet style).

### Upcoming Work

1. **DocuSign fix** — `AUTHORIZATION_INVALID_TOKEN` error from envelope API; investigate JWT auth flow and sandbox configuration
2. **Pitch deck upload** — upload the actual pitch deck PDF after DocuSign is working

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
