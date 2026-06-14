# Ajaia Docs

A lightweight collaborative document editor built as the Ajaia LLC full-stack developer assignment. Built with Next.js 15, TipTap, and Supabase.

**Live demo:** `[add after Vercel deploy]`

---

## Demo Credentials

| User | Email | Password | Role |
|------|-------|----------|------|
| Alice | `alice@demo.local` | `Demo1234!` | Owner — creates and shares documents |
| Bob | `bob@demo.local` | `Demo1234!` | Collaborator — receives shared documents |

**Suggested reviewer flow:**
1. Sign in as Alice → create a document → format text (bold, headings, lists)
2. Open Share → enter `bob@demo.local` → share
3. Sign out → sign in as Bob → see document under "Shared with me"
4. Edit the document as Bob → verify changes persist after refresh
5. Back as Alice → import a `.md` or `.txt` file from the Import button

---

## Local Setup

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) account (free tier)

### 1. Clone and install

```bash
git clone <repo-url>
cd ajaia-assignment
npm install
```

### 2. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) → New project
2. Copy your project URL and anon key from **Settings → API**

### 3. Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 4. Run the database migration

In the Supabase dashboard → **SQL Editor**, paste and run the contents of:
```
supabase/migrations/001_init.sql
```

This creates the `profiles`, `documents`, and `document_shares` tables with all RLS policies.

### 5. Create demo users

In Supabase dashboard → **Authentication → Users → Add user**:

| Email | Password | Email confirm |
|-------|----------|---------------|
| `alice@demo.local` | `Demo1234!` | ✓ Auto-confirm |
| `bob@demo.local` | `Demo1234!` | ✓ Auto-confirm |

> Alternatively run the seed SQL in `supabase/seed.sql` after replacing the placeholder UUIDs with the real user IDs from the Users table.

### 6. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 7. Run tests

```bash
npm test
```

---

## Supported File Import Types

| Extension | MIME | Notes |
|-----------|------|-------|
| `.txt` | `text/plain` | Imported as plain paragraphs |
| `.md` | `text/markdown` | Headings (#, ##, ###) and bullet lists detected |

`.docx`, `.pdf`, and other types are **not supported** and will show an error message. Max file size: **1 MB**.

---

## Project Structure

```
app/
  page.tsx                 # Landing page with demo credentials
  login/page.tsx           # Email/password login
  dashboard/page.tsx       # Server component — fetches owned + shared docs
  documents/[id]/page.tsx  # Server component — fetches doc, 404 if no access
  api/import/route.ts      # File import endpoint (multipart + JSON)
  api/sign-out/route.ts    # Sign-out endpoint

components/
  dashboard/DashboardClient.tsx     # Dashboard UI (owned / shared sections)
  dashboard/ImportFileButton.tsx    # Drag-and-drop + file picker
  editor/DocumentEditor.tsx         # TipTap editor (SSR-disabled)
  editor/EditorToolbar.tsx          # Bold/Italic/Underline/H1/H2/Lists
  editor/DocumentPageClient.tsx     # Document page shell (title, save status, share)
  sharing/ShareDocumentDialog.tsx   # Share by email, list/remove collaborators
  ui/Toaster.tsx                    # Lightweight toast notification

lib/
  supabase/{client,server}.ts   # Supabase SSR helpers
  documents/access.ts           # Pure access-control logic (unit-tested)
  documents/actions.ts          # All server actions (CRUD, share, import)
  editor/plainTextToTipTap.ts   # Text → TipTap JSON converter
  types.ts                      # Shared TypeScript types

supabase/
  migrations/001_init.sql   # Tables + RLS policies
  seed.sql                  # Sample document seed (instructions)

tests/
  document-access.test.ts   # 13 unit tests for access-control logic
```

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 15 App Router |
| Language | TypeScript |
| UI | Tailwind CSS |
| Editor | TipTap (StarterKit + Underline + Placeholder) |
| Auth / DB / Storage | Supabase (free tier) |
| Validation | Zod |
| Tests | Vitest |
| Deploy | Vercel + Supabase Cloud |
