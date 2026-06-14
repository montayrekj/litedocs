# AI Workflow Note

## Tools Used

- **Cursor** (this session) — primary coding assistant throughout the build
- **Supabase dashboard** — SQL editor for testing RLS policies interactively

---

## Where AI Materially Sped Up My Work

**Boilerplate elimination (~40% of time saved):**
Cursor generated the Next.js + Supabase SSR wiring (`createServerClient`, cookie adapter, middleware) in one pass. This pattern is well-documented but tedious — 60+ lines of cookie-handling code that is easy to get subtly wrong. Having it generated and immediately reviewable saved ~30 minutes.

**RLS SQL drafts:**
The four RLS policies (select/insert/update/delete on `documents`, plus shares and storage) were drafted by AI based on my plain-English description of the access model. I reviewed each `using()` clause against the intended semantics and corrected one edge case: the initial draft allowed shared editors to insert into `document_shares` (re-sharing), which I rejected and fixed to owner-only.

**TipTap toolbar wiring:**
The `EditorToolbar` component — mapping each button to the correct `editor.chain().focus().toggle*()` call with active-state detection — was generated in one shot. I verified each command name against the TipTap docs.

**Test structure:**
The 13-test suite skeleton was generated from a description of the four access functions and the three actor types (owner, shared editor, stranger). I added the viewer-role edge case (a user in the share list with a non-editor role should be denied) which the initial draft missed.

**`.docx` import pipeline:**
The `mammoth` → HTML → TipTap JSON pipeline was generated; I iteratively corrected style maps, list detection, and whitespace handling to match the actual Word output. AI was especially useful for the `convertImage` callback that uploads images to Supabase Storage before mammoth finishes processing.

**Image resize NodeView:**
The drag-resize handles (right / bottom / bottom-right) with aspect-ratio locking were generated as a React NodeView component. I corrected the aspect ratio calculation to use `naturalWidth/naturalHeight` from the `<img>` element rather than the DOM bounding rect (which is affected by CSS), and removed the `naturalWidth` state from the display path so imported images default to `max-width:100%` rather than overflowing at their pixel dimensions.

**Serialization bug diagnosis:**
The most non-obvious bug in the project: ProseMirror's `Node.toJSON()` creates `attrs` objects with `Object.create(null)` (null-prototype), which React Flight (Next.js server actions) silently drops when deeply nested. The client had the correct URLs; the server received `null`. I diagnosed this by adding staged logs at the client boundary (before insert, after insert, before send) and confirmed the data vanished during the server action call — not in TipTap or Supabase. The fix (`JSON.parse(JSON.stringify(content))` before the server action call) was straightforward once the boundary was identified.

---

## What AI-Generated Output I Changed or Rejected

| Output | What I changed | Why |
|--------|---------------|-----|
| RLS share insert policy | Changed `shared_with_user_id = auth.uid()` to owner-only check | Initial draft let recipients insert new shares (privilege escalation) |
| `DocumentEditor` save bridge | Replaced global `window.__editorTitle` string with a function reference | Avoids race condition when title changes faster than save fires |
| Sign-out button | Replaced inline dynamic import with a proper `SignOutButton` component | Initial version used a form POST which conflicted with server action routing |
| Viewer-only role | Rejected the suggestion to add a `viewer` role | Out of scope for the timebox; adds complexity without reviewer value |
| Real-time collaboration skeleton | Fully rejected | Would require Yjs/CRDT, Supabase Realtime, and significant UI work — not feasible in timebox |
| Image `naturalWidth` as display width | Removed from display path, kept for aspect-ratio only | Imported images were rendering at their pixel dimensions (often 1000px+), overflowing the document |
| mammoth style map | Extended with additional heading and list mappings | AI-generated map missed `Heading3` and multi-level list variants present in the test `.docx` |
| `insertContentAt` called directly in `useEffect` | Wrapped in `setTimeout(fn, 0)` | TipTap's internal `flushSync` conflicted with React concurrent rendering, causing a console error and occasional missed saves |

---

## How I Verified Correctness, UX Quality, and Implementation Reliability

**Access control:**
- Ran the 13 Vitest unit tests after every change to the access functions
- Cross-checked each RLS policy against the test cases manually in the Supabase SQL editor

**Editor persistence:**
- Typed formatted content (bold, headings, lists), navigated away, returned — verified TipTap JSON loaded correctly
- Added staged debug logs to confirm `src` attribute survived the full pipeline: client JSON → server action → Supabase JSONB → reload

**Sharing flow:**
- Full Alice → Bob flow: create doc, share by email, sign in as Bob, verify "Shared with me" section, edit as Bob, confirm changes persist

**File import:**
- Tested with a real `.docx` file containing headings, lists, bold/italic, and embedded images
- Verified images upload to Supabase Storage bucket and load correctly after page refresh
- Tested with `.md` file (multi-heading, bullet list) and verified heading levels
- Tested with `.txt` — confirmed plain-paragraph conversion
- Tested with a 2 MB file — confirmed 1 MB limit error

**Image UX:**
- Verified delete button (×) appears on click and removes the node
- Verified drag-resize handles preserve aspect ratio and persist width after refresh

**TypeScript:**
- Ran `npx tsc --noEmit` after each feature to catch type errors before committing

**UX review:**
- Checked all empty states (no documents, no shares)
- Verified loading states on async operations (creating doc, sharing, sign-out)
- Confirmed error toasts appear for all failure paths
