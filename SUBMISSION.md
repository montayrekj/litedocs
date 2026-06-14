# Submission

**Candidate:** King Joshua Montayre (kmontayre07@gmail.com)
**Assignment:** Ajaia LLC — AI-Native Full Stack Developer

---

## Deliverables

| Item                 | Location                    | Status |
| -------------------- | --------------------------- | ------ |
| Source code          | This repository             | ✅     |
| README.md            | `README.md`                 | ✅     |
| Architecture note    | `ARCHITECTURE.md`           | ✅     |
| AI workflow note     | `AI_WORKFLOW.md`            | ✅     |
| Submission inventory | `SUBMISSION.md` (this file) | ✅     |
| Walkthrough video    | `VIDEO_URL.txt`             | ✅     |
| Live deployment URL  | See below + README          | ✅     |
| Demo credentials     | README + landing page       | ✅     |

---

## Live Deployment

**URL:** http://litedocs-git-main-montayrekjs-projects.vercel.app/

**Demo accounts:**

| User  | Email              | Password    |
| ----- | ------------------ | ----------- |
| Alice | `alice@demo.local` | `Demo1234!` |
| Bob   | `bob@demo.local`   | `Demo1234!` |

---

## What Is Working

- ✅ Create new documents
- ✅ Rename documents (inline in dashboard + title bar in editor)
- ✅ Rich-text editing: Bold, Italic, Underline, H1, H2, Bullet list, Ordered list
- ✅ Autosave with visual "Saving…" / "Saved" indicator (800ms debounce)
- ✅ Content persistence: TipTap JSON stored in Postgres, formatting survives refresh
- ✅ Import `.txt` and `.md` files — appended into current document
- ✅ Import `.docx` files — headings, lists, bold/italic, and inline images preserved
- ✅ Inline images: click-to-select, delete button (×), drag-resize handles with aspect-ratio lock
- ✅ Images uploaded to Supabase Storage and served via public URLs (survive refresh)
- ✅ Share document by email → collaborator sees it under "Shared with me"
- ✅ Owner vs Shared badges in dashboard and editor
- ✅ Remove collaborator access from Share dialog
- ✅ Delete documents (owners only)
- ✅ Sign in / sign out with Supabase Auth (email + password)
- ✅ Route protection via middleware (unauthenticated → /login)
- ✅ 404 page for inaccessible documents
- ✅ 13 automated unit tests for access-control logic
- ✅ Row-level security enforced at the Postgres layer

---

## What Is Incomplete / Out of Scope

| Feature                  | Status    | Notes                                                                      |
| ------------------------ | --------- | -------------------------------------------------------------------------- |
| Real-time collaboration  | Not built | Would require Yjs + Supabase Realtime; out of scope for timebox            |
| Version history          | Not built | Stated out of scope in architecture note                                   |
| Viewer-only role         | Not built | Owner vs Editor is sufficient for the demo; viewer would add UI complexity |
| Commenting / suggestions | Not built | Stated out of scope                                                        |
| Export to PDF/Markdown   | Not built | Stated out of scope                                                        |
| `.pdf` import            | Not built | No reliable free-tier PDF-to-text library without external APIs            |

---

## What I Would Build Next (With 2–4 More Hours)

1. **Version history** — Store snapshots in a `document_versions` table on each save. Allow reverting to a previous version. Builds directly on the existing JSON persistence pattern.

2. **Real-time presence indicators** — Subscribe to Supabase Realtime channel per document. Show active editors' avatars in the header. Would not require a full CRDT for single-document, turn-based editing.

3. **Export to Markdown** — Convert TipTap JSON back to Markdown using a simple node-type map. Would leverage the existing `plainTextToTipTap` converter in reverse.

4. **Viewer-only sharing role** — Add `viewer` to the role check enum. Show document in read-only mode (disable TipTap `editable`). Already modeled in the RLS policies.

---

## Branch Structure (Git History)

Each feature was developed on its own branch, chaining from the previous:

```
main              → feat: bootstrap (todo 1 + 2)
  └── 2nd-todo    → (branches from main, no new commits — todo 2 captured in main)
        └── 3rd-todo  → feat: dashboard (todo 3)
              └── 4th-todo  → feat: editor (todo 4)
                    └── 5th-todo  → feat: sharing (todo 5)
                          └── 6th-todo  → feat: import (todo 6)
                                └── 7th-todo  → feat: tests + docs (todo 7)
```

---

## Local Setup (Quick Reference)

```bash
git clone <repo>
cd ajaia-assignment
npm install
cp .env.example .env.local   # add Supabase URL + keys
# Run supabase/migrations/001_init.sql in Supabase SQL editor
# Create alice@demo.local and bob@demo.local in Supabase Auth dashboard
npm run dev                  # http://localhost:3000
npm test                     # 13 unit tests
```

Full instructions in `README.md`.
