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

### App Structure

```
app/
  page.js                            — Redirects to /login
  layout.js                          — Root layout (Exo 2 font)
  login/page.js                      — Multi-step auth UI (greeting → type select → sign in)
  dashboard/page.js                  — Main VDR: document library + Sol AI chat + due diligence
  dashboard/admin/page.js            — Admin panel: user management, file upload
  nda/page.js                        — NDA signing page (DocuSign embedded flow)
  api/sol/route.js                   — Sol AI assistant endpoint (Claude + doc reading)
  api/documents/route.js             — Document listing with role-based filtering
  api/documents/signed-url/route.js  — Temporary download/view URLs (60s expiry); returns { requiresNda: true } for restricted docs
  api/documents/move/route.js        — Move/rename docs (download → re-upload → delete)
  api/upload/route.js                — File upload to Supabase Storage (admin + employees)
  api/sort/route.js                  — AI auto-sort: reads PDF with Claude, returns folder + isRestricted + diligenceChecked
  api/nda-sign/route.js              — Creates DocuSign envelope from template, returns embedded signing URL
  api/nda-complete/route.js          — Upgrades user role from pre_nda_* to post_nda_* after signing
  api/tutorial-complete/route.js     — Sets has_seen_tutorial = true (uses service role to bypass RLS)
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

Path format: `{general|restricted}/{folder}/{filename}`

The `due_diligence` table tracks investor checklist items with `id`, `item`, `position`, `checked` fields. The sort API auto-checks items when matching documents are uploaded.

All document views are logged to `audit_log` table.

### NDA Flow

Pre-NDA users who click a restricted document get redirected to `/nda`. The flow:
1. `/nda` page → calls `/api/nda-sign` → gets DocuSign embedded signing URL
2. User signs on DocuSign → redirected back to `/nda?event=signing_complete`
3. `/api/nda-complete` upgrades role: `pre_nda_investor` → `post_nda_investor`, `pre_nda_employee` → `post_nda_employee`

DocuSign uses RS256 JWT auth (service integration). Private key stored in `.env` as single-line with `\n` literals wrapped in double quotes. The `roleName` in the envelope template roles must match the role name configured in the DocuSign template (default: `"Signer"`).

**Known issue**: DocuSign sandbox `/oauth/userinfo` endpoint intermittently returns 401 with `internal_server_error`. Currently using `DOCUSIGN_ACCOUNT_ID` from env directly. `AUTHORIZATION_INVALID_TOKEN` from the envelope API is an unresolved issue — needs investigation when resuming Step 9.

### Tutorial System

Dashboard shows a spotlight tutorial on first login (tracked via `profiles.has_seen_tutorial`).
- Investors see `INVESTOR_TUTORIAL_STEPS`, employees see `EMPLOYEE_TUTORIAL_STEPS`
- Spotlight uses `box-shadow: 0 0 0 9999px rgba(0,0,0,0.78)` trick with `data-tutorial` attributes
- Completion calls `/api/tutorial-complete` (service role) to bypass RLS

### Sol AI Assistant

`/api/sol/route.js` handles the Sol chatbot. For PDF-related queries, it fetches a signed URL, downloads the PDF, base64-encodes it, and passes it as a `document` block to Claude. Sol has web search via Claude's `web_search` tool. Conversation history (last 10 messages) passed per request. Responses strip markdown (asterisks removed, custom bullet style).

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
