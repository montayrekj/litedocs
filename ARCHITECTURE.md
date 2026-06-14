# Architecture Note

## What I Prioritized and Why

Given a 4–6 hour window, I made deliberate scope cuts to ship a **narrow, polished product slice** rather than a shallow Google Docs clone.

**Chosen priorities (in order):**

1. **Usable rich-text editing with reliable persistence** — The editor is the core value. TipTap stores content as `jsonb` (TipTap JSON), which roundtrips perfectly through Postgres. Formatting survives refresh with no serialization loss.

2. **Working share model enforced at the database layer** — Row-level security is Supabase's strongest feature. The share semantics (owner-only share, editor access) are enforced in Postgres, not just in application code. Even if someone crafts a direct API call, they cannot read or write documents they don't own or have been shared with.

3. **Clear owned vs shared UX** — Reviewers can immediately see which documents they created vs received. Owner/Shared badges appear in both the dashboard and the document header.

4. **Rich file import including `.docx`** — Documents in the wild are `.docx`. The import pipeline (`mammoth` → HTML → TipTap JSON) preserves headings, lists, bold/italic, and inline images. Images are uploaded to Supabase Storage (not embedded as base64) so they persist correctly after reload.

5. **Frictionless reviewer path** — Demo credentials on the landing page, quick-fill login buttons, seeded sample content.

**Intentionally out of scope:**
- Real-time collaboration / presence (would require Supabase Realtime + significant UI complexity)
- Document version history
- Viewer-only access (owner vs editor is sufficient to demonstrate the pattern)
- Export to PDF/Markdown
- Comments / suggestions

---

## Data Model

```
auth.users (Supabase built-in)
    │
    ├── profiles (id, email, display_name)
    │       Trigger: auto-created on sign-up
    │       Purpose: allows share-by-email lookup without exposing auth.users directly
    │
    ├── documents (id, owner_id, title, content jsonb, created_at, updated_at)
    │       content: TipTap JSON — {"type":"doc","content":[...nodes...]}
    │       updated_at: auto-updated by trigger on every UPDATE
    │
    └── document_shares (id, document_id, shared_with_user_id, role, created_at)
            role: 'editor' only (viewer role omitted for scope)
            UNIQUE(document_id, shared_with_user_id) — prevents duplicates

storage.buckets
    └── document-images (public bucket)
            Stores images extracted from .docx imports
            Path: {user_id}/{timestamp}-{index}.{ext}
            RLS: authenticated users can upload to their own folder; public read
```

---

## Row-Level Security Design

All tables have RLS enabled. The policies mirror the access functions in `lib/documents/access.ts` so they can be unit-tested in isolation.

| Operation | Who |
|-----------|-----|
| SELECT documents | `owner_id = auth.uid()` OR exists row in `document_shares` |
| INSERT documents | `owner_id = auth.uid()` (authenticated only) |
| UPDATE documents | Owner OR shared editor |
| DELETE documents | Owner only |
| INSERT shares | Document owner only |
| DELETE shares | Document owner only |
| SELECT profiles | Any authenticated user (needed for email lookup) |
| INSERT storage.objects | Authenticated, path starts with own `uid` |
| SELECT storage.objects | Public (images served directly) |

The `profiles` table acts as a safe indirection layer — we look up users by email via `profiles` rather than querying `auth.users` directly (which is restricted in Supabase).

---

## Request Flow

```
Browser                      Next.js (Vercel)              Supabase
  │                                │                            │
  │  GET /documents/[id]           │                            │
  │──────────────────────────────> │                            │
  │                                │  getUser() via cookie      │
  │                                │──────────────────────────> │
  │                                │  <── user or null          │
  │                                │                            │
  │                                │  SELECT documents WHERE    │
  │                                │  id=? (RLS filters)        │
  │                                │──────────────────────────> │
  │                                │  <── doc or empty          │
  │  <── HTML (with doc content)   │                            │
  │                                │                            │
  │  (autosave) updateDocument()   │                            │
  │──────────────────────────────> │                            │
  │  Server Action                 │  UPDATE documents SET      │
  │                                │  content=?, updated_at=now │
  │                                │──────────────────────────> │
  │  <── { revalidatePath }        │  <── ok (RLS check)        │
  │                                │                            │
  │  POST /api/parse-docx          │                            │
  │──────────────────────────────> │                            │
  │                                │  mammoth → HTML → TipTap   │
  │                                │  images → storage.upload() │
  │                                │──────────────────────────> │
  │  <── { json: TipTapDoc }       │  <── public URLs           │
```

---

## Editor Autosave Strategy

The editor debounces saves by 800ms. Every keystroke resets the timer. When the timer fires, `editor.getJSON()` is JSON-round-tripped (`JSON.parse(JSON.stringify(...))`) before being sent as a server action argument. This is required because ProseMirror's `Node.toJSON()` creates `attrs` objects with `Object.create(null)` (null-prototype), which React's Flight serialization silently drops when deeply nested. The round-trip converts them to regular `Object.prototype` objects.

The title field has its own parallel 800ms debounce. A `window.__editorLatestTitle` bridge lets the title debounce share the most recent title value with the editor's save cycle.

**Why not optimistic updates?** For a single-user demo scope, the server-action roundtrip is fast enough and avoids complexity. Real-time collaboration would require a CRDT or OT approach (e.g., Yjs + Supabase Realtime).

---

## File Import

**`.txt` / `.md`:** Read client-side (`File.text()`), converted to TipTap JSON by `plainTextToTipTap()`, saved as a new document.

**`.docx`:** Sent to `/api/parse-docx` (server-side, multipart). `mammoth` converts `.docx` to HTML with a custom style map. Each inline image is extracted, uploaded to Supabase Storage (`document-images` bucket), and replaced with a public URL. The resulting HTML is converted to TipTap JSON via `@tiptap/html`. The document is then appended to the current editor state via `insertContentAt`.

Images in the editor support:
- Click to select → delete button (×)
- Drag-resize handles on right, bottom, and bottom-right corners
- Explicit `width` attribute stored in TipTap JSON so resize state persists

---

## Testing Strategy

`tests/document-access.test.ts` tests the pure access-control functions in `lib/documents/access.ts`. These functions mirror the RLS policies, so:

- The logic is verifiable without a live database
- Policy regressions surface as test failures
- The tests document the intended access semantics clearly

13 tests covering `canRead`, `canEdit`, `canDelete`, `canShare` across owner / shared-editor / stranger scenarios.
