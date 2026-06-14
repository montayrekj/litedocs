# AI Workflow Note

## Tools Used

- **Cursor** (this session) — primary coding assistant throughout the build
- **Supabase dashboard** — SQL editor for testing RLS policies interactively

---

## Where AI Materially Sped Up My Work

**Boilerplate elimination (~40% of time saved):**
Cursor generated the Next.js + Supabase SSR wiring (`createServerClient`, cookie adapter, middleware) in one pass. This pattern is well-documented but tedious — 60+ lines of cookie-handling code that is easy to get subtly wrong. Having it generated and immediately reviewable saved ~30 minutes.

**RLS SQL drafts:**
The four RLS policies (select/insert/update/delete on `documents`, plus shares) were drafted by AI based on my plain-English description of the access model. I reviewed each `using()` clause against the intended semantics and corrected one edge case: the initial draft allowed shared editors to insert into `document_shares` (re-sharing), which I rejected and fixed to owner-only.

**TipTap toolbar wiring:**
The `EditorToolbar` component — mapping each button to the correct `editor.chain().focus().toggle*()` call with active-state detection — was generated in one shot. I verified each command name against the TipTap docs.

**Test structure:**
The 13-test suite skeleton was generated from a description of the four access functions and the three actor types (owner, shared editor, stranger). I added the viewer-role edge case (a user in the share list with a non-editor role should be denied) which the initial draft missed.

**`plainTextToTipTap` utility:**
Initial implementation generated; I added the `### ` heading-3 case and changed the bullet detection regex from `/^- /` to `/^[-*]\s/` to match standard Markdown conventions more broadly.

---

## What AI-Generated Output I Changed or Rejected

| Output | What I changed | Why |
|--------|---------------|-----|
| RLS share insert policy | Changed `shared_with_user_id = auth.uid()` to owner-only check | Initial draft let recipients insert new shares (privilege escalation) |
| `DocumentEditor` save bridge | Replaced global `window.__editorTitle` string with a function reference | Avoids race condition when title changes faster than save fires |
| Sign-out button | Replaced inline dynamic import with a proper `SignOutButton` component | Initial version used a form POST which conflicted with server action routing |
| Viewer-only role | Rejected the suggestion to add a `viewer` role | Out of scope for the timebox; adds complexity without reviewer value |
| Real-time collaboration skeleton | Fully rejected | Would require Yjs/CRDT, Supabase Realtime, and significant UI work — not feasible in 4–6h |
| DOCX import with `mammoth` | Fully rejected | Adds a large dependency for brittle formatting output; `.md` import proves the concept cleanly |

---

## How I Verified Correctness, UX Quality, and Implementation Reliability

**Access control:**
- Ran the 13 Vitest unit tests after every change to the access functions
- Cross-checked each RLS policy against the test cases manually in the Supabase SQL editor

**Editor persistence:**
- Typed formatted content (bold, headings, lists), navigated away, returned — verified TipTap JSON loaded correctly via `editor.commands.setContent()`
- Checked `documents.content` column in Supabase table editor to confirm JSON structure

**Sharing flow:**
- Full Alice → Bob flow: create doc, share by email, sign in as Bob, verify "Shared with me" section, edit as Bob, confirm changes persist

**File import:**
- Tested with a real `.md` file (multi-heading, bullet list) and verified heading levels were detected
- Tested with `.docx` — confirmed rejection with the correct error message
- Tested with a 2 MB `.txt` file — confirmed 1 MB limit error

**TypeScript:**
- Ran `npx tsc --noEmit` after each feature to catch type errors before committing

**UX review:**
- Checked all empty states (no documents, no shares)
- Verified loading states on async operations (creating doc, sharing, sign-out)
- Confirmed error toasts appear for all failure paths
