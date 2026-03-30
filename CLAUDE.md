# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server on port 3000
npm run build    # Production build
npm start        # Start production server
npm run lint     # ESLint (Next.js config)
```

No test framework is configured.

## Architecture

**Virtual Data Room (VDR) for Space Launch Technologies** — a secure document management platform with AI-powered assistant, built on Next.js App Router + Supabase.

### Tech Stack
- **Frontend**: Next.js 16 (App Router), React 19, Tailwind CSS v4
- **Backend**: Next.js API Routes (server-side)
- **Database & Auth**: Supabase (PostgreSQL + RLS + Storage)
- **AI**: Anthropic Claude API (`claude-sonnet-4-20250514`) via `@anthropic-ai/sdk`

### App Structure

```
app/
  page.js                        — Redirects to /login
  layout.js                      — Root layout (Exo 2 font)
  login/page.js                  — Multi-step auth UI (greeting → type select → sign in)
  dashboard/page.js              — Main VDR: document library + Sol AI chat
  dashboard/admin/page.js        — Admin panel: user management, file upload
  api/sol/route.js               — Sol AI assistant endpoint (Claude + doc reading)
  api/documents/route.js         — Document listing with role-based filtering
  api/documents/signed-url/route.js — Temporary download/view URLs (60s expiry)
  api/upload/route.js            — Admin-only file upload to Supabase Storage
```

All pages are client components (`"use client"`). API routes run server-side and use `SUPABASE_SERVICE_ROLE_KEY`.

### Access Control Model

Three user roles drive all access gating:
- **`pre_nda`** — approved investors before NDA signing; sees general documents, no Sol AI
- **`post_nda`** — signed NDA; sees all documents including restricted ones, full Sol AI access
- **`admin`** — full access + user management + file upload

Users start with status `pending` after signup. Admins approve/reject from the admin panel. Admin is identified by hardcoded email (`contact@kimduhyun.com`).

### Document System

Documents live in Supabase Storage (`documents` bucket) and are catalogued in a `documents` table. They're organized into 10 folders: `pitch`, `market`, `technology`, `traction`, `financials`, `legal`, `team`, `fundraising`, `updates`, `appendix`.

Each document has a boolean `restricted` field — restricted documents are only visible to `post_nda` and `admin` users. The API routes filter based on the calling user's role via their JWT.

All document views are logged to `audit_log` table.

### Sol AI Assistant

`/api/sol/route.js` handles the Sol chatbot. For PDF-related queries, it:
1. Fetches a signed URL for the relevant document
2. Downloads the PDF and base64-encodes it
3. Passes it as a `document` block to Claude alongside the user's message

Sol has web search capability via Claude's `web_search` tool. Conversation history (last 10 messages) is passed on each request. All queries are audit-logged.

Sol responses strip markdown formatting (asterisks removed, custom bullet style).

### Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY      # Server-side only — never expose to client
ANTHROPIC_API_KEY
```

### Path Aliases

`@/*` maps to the project root (configured in `jsconfig.json`).
