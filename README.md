# Notes App — Scitara Take-Home

A production-quality notes application with a rich-text editor, real-time auto-save, tag filtering, full-text search, and dark/light theming.

**Live demo:** https://notes-app-new-neon.vercel.app  
**API:** https://notes-app-new-3vf6.onrender.com/health

---

## Setup & Run

**Requirements:** Node.js 22.5+ (uses the built-in `node:sqlite` module)

```bash
# Clone the repo
git clone <repo-url>
cd notes-app

# Backend (terminal 1)
cd backend
npm install
npm run dev          # → http://localhost:3001

# Frontend (terminal 2)
cd frontend
npm install
npm run dev          # → http://localhost:5173
```

The frontend Vite dev server proxies `/api/*` requests to `localhost:3001`, so no CORS configuration is needed in development.

---

## Tech Stack & Why

### Backend

| Choice | Reason |
|---|---|
| **Node.js + Express + TypeScript** | Minimal overhead; familiar to most reviewers; strong typing throughout |
| **`node:sqlite` (Node 22 built-in)** | Zero install, zero native compilation. Identical synchronous API to `better-sqlite3`. The spec lists `better-sqlite3`, but `node-gyp` failed on this machine (Python 3.14 is unsupported by node-gyp ≤ v11). `node:sqlite` was the pragmatic call — same API, no toolchain debt. Requires Node 22.5+. |
| **Zod** | Runtime schema validation with TypeScript type inference — validates body and query params on every mutating endpoint |
| **WAL journal mode** | Allows concurrent reads while a write is in progress — better for a web server than SQLite's default DELETE mode |

### Frontend

| Choice | Reason |
|---|---|
| **React 18 + TypeScript + Vite** | Fast HMR, native ESM, per brief |
| **TipTap (ProseMirror)** | Rich text with heading/list/code/blockquote support; stores HTML; extensible |
| **Zustand** | 40-line store vs 4–5 Redux files. Right-sized for ~8 UI state values |
| **TanStack Query** | Server state caching, optimistic updates with rollback, background refetch, stale-time control |
| **Tailwind CSS v3** | Utility-first, zero runtime. Pinned to v3 — v4 moved the PostCSS plugin to a separate package, which broke the scaffold |

---

## Architecture Overview

```
┌────────────────────┐   HTTP/REST   ┌──────────────────────┐
│  React frontend     │ ────────────► │  Express backend       │
│                    │              │                        │
│  Zustand           │              │  Zod validation        │
│  ├ selectedNoteId  │              │  SQLite (node:sqlite)  │
│  ├ searchQuery     │              │  WAL mode              │
│  ├ selectedTag     │              │  Soft delete           │
│  ├ sortBy/order    │              │                        │
│  ├ isOnline        │              │  REST API              │
│  └ theme           │              │  GET /notes (filter)   │
│                    │              │  POST /notes           │
│  TanStack Query    │              │  PATCH /notes/:id      │
│  ├ useNotes()      │              │  DELETE /notes/:id     │
│  ├ useUpdateNote() │              │  GET /notes/trash      │
│  │  ├ onMutate     │              │  POST /:id/restore     │
│  │  ├ onError      │              │  DELETE /:id/permanent │
│  │  └ onSettled    │              │  GET /tags             │
│  └ useDeleteNote() │              │                        │
└────────────────────┘              └──────────────────────┘
```

**Two-panel layout:** Fixed 320px sidebar (list + search + sort + tags) + flex-1 editor. On mobile (<768px) the panels are mutually exclusive — the sidebar hides when a note is open, with a ← back button in the editor.

**State split:** Zustand owns ephemeral UI state (selection, filters, theme). TanStack Query owns server data (notes, caching, invalidation, optimistic UI). Mixing these would require re-fetching Zustand state or manually managing loading/error/stale across the app.

**Auto-save:** Two debounce strategies:
- **Title** — `useDebounce(title, 1000ms)` + `useEffect` fires PATCH when the debounced value differs from the server value.
- **Content** — TipTap's `onUpdate` stores HTML in a `ref`; a manual `setTimeout` (1s) fires the save. A ref is required because TipTap content lives outside React state.

**Optimistic updates:** `useUpdateNote` and `useDeleteNote` implement the full React Query pattern: snapshot list + single-note caches in `onMutate`, apply immediately, roll back both on `onError`, sync from server in `onSettled`.

**Theming:** CSS custom properties (`--color-bg-base`, etc.) in `:root` (dark) and `.light`. Tailwind config references `var(--color-*)` for themed tokens; semantic colours (accent, danger) stay as static hex so opacity modifiers (`bg-accent/10`) keep working. An inline `<script>` in `index.html` applies the class before React renders to prevent a flash.

---

## Key Trade-offs

**`node:sqlite` over `better-sqlite3`**
Same synchronous API, zero native compilation. Requires Node 22.5+. In a production environment with a stable toolchain, `better-sqlite3` is the standard choice.

**SQLite over MongoDB / Postgres**
The brief says "In-file JSON, SQLite, or lowdb — keep it simple." SQLite with WAL mode handles single-user load well. The DB path is configurable via `DB_PATH` env var and excluded from git. Multi-instance production use would require Postgres.

**`node:test` over Vitest for backend integration tests**
Vite's bundler doesn't yet recognise `sqlite` (the `node:` prefix stripped) as a Node built-in and fails trying to resolve it as an npm package. Node's own test runner bypasses the bundler. Coverage and test structure are identical.

**Regex-based HTML → Markdown**
`htmlToMarkdown` handles TipTap's StarterKit output correctly but would break on arbitrary HTML. A library like `turndown` is the production choice.

**No auto-expiry of trashed notes**
Trashed notes stay indefinitely. A production system would schedule cleanup after 30 days.

---

## Testing Approach

**Backend — 43 integration tests (`node:test` + supertest)**

Integration tests over unit tests because the meaningful behaviour lives at the HTTP boundary: does the right SQL run, does validation reject bad input, are HTTP status codes correct? Mocking the database would test the wrong thing — historical bugs live in the query layer, not the handler layer.

Each describe block runs `beforeEach(() => db.exec('DELETE FROM notes'))` so tests are isolated without file-system overhead.

**Frontend — 44 unit tests (Vitest)**

Pure utility functions (`helpers.ts`) and custom hooks (`useDebounce`) are unit-tested — well-defined contracts, fast, no mocking needed. Components are not unit-tested: mocking TipTap + React Query + Zustand in jsdom costs more than it's worth. Component behaviour is covered by the integration tests and manual golden-path testing.

```bash
cd backend  && npm test          # 43 integration tests
cd frontend && npx vitest run    # 44 unit tests
```

---

## Development Process

### Scaffolding & Build Approach

This application was scaffolded and built incrementally using Claude Code as an AI-assisted development tool.

The process was deliberately structured to mirror professional engineering practices:

**Feature-by-feature commits:**
Rather than generating the entire codebase in one pass, the app was built one feature at a time with a meaningful commit after each — backend schema, CRUD endpoints, validation, frontend components, editor integration, optimistic UI, keyboard shortcuts, offline detection, and the trash/restore feature.

This approach ensured:
- Each commit represents a working, testable slice
- The git history tells the story of how the app was built
- Regressions could be traced to a specific change
- Code was reviewed in manageable chunks, not all at once

**Prompts used during development:**

The following prompts were used to scaffold and build the application. Each was carefully reviewed before being applied to the codebase:

1. **Scaffold prompt** — full project structure, tech stack decisions, data models, API contract, UI design direction, commit strategy, deployment plan
2. **Review agent prompt** — acted as a senior code reviewer checking for bugs, TypeScript safety, backend best practices, frontend best practices, accessibility, and generating missing unit tests. Run after each feature was built.
3. **Bug fix prompts** — targeted fixes for specific issues discovered during testing (documented below)

---

### AI-Assisted Senior Code Review

After each feature was built, a structured review prompt was used to simulate a senior engineer code review pass.

The review agent checked for:

**Bugs & correctness:** logic errors, unhandled edge cases, missing await, unhandled promise rejections, null/undefined access without guards, SQL injection risks, memory leaks (event listeners, timers not cleaned up).

**TypeScript safety:** unsafe `any` usage, missing return types, unsafe type assertions, Zod/TypeScript schema consistency.

**Backend practices:** correct HTTP status codes, consistent error response shape, input validation before database, parameterised SQL queries, async errors forwarded to error middleware.

**Frontend practices:** rules of hooks compliance, missing `useEffect` dependency arrays, infinite re-render risks, API error handling and user feedback, optimistic update rollback correctness, debounce cleanup on unmount.

**Code quality:** duplicated logic, magic numbers/strings, dead code and unused imports, function single responsibility.

Issues found and resolved during review:
- Auto-save debounce timer was not being cleared on component unmount
- Trash routes were registered after the `/:id` wildcard, causing 404s (`/trash` was matched as an id)
- React Query trash cache was not being fully invalidated after restore mutations — required `removeQueries` not just `invalidateQueries`
- Keyboard shortcuts used Mac-only `⌘` symbol in UI labels without OS detection
- Tailwind Preflight was resetting `ul/ol { list-style: none; padding: 0 }`, suppressing bullet and numbered list rendering in the editor

---

### Post-Build Manual Review

Before every commit, each feature was manually reviewed:

1. **Read every file** — understood every architectural decision, not just whether it ran
2. **Traced the data flow** — followed each feature from UI interaction → state update → API call → DB query → response → UI update
3. **Checked error paths** — not just the happy path: what happens when the API fails, when offline, when input is invalid
4. **Verified against the assignment brief** — checked each requirement was met, not just assumed
5. **Confirmed feature accuracy** by asking: does this behave exactly as the requirement describes, are there edge cases the spec implies but doesn't state, would a non-technical user understand this behaviour?

---

### Regression Testing

After deployment to Vercel + Render, a full regression pass was run against the live app covering core CRUD, auto-save, search and filter, sort, editor formatting (H1/H2, lists, blockquote, bold/italic), trash (move → restore → re-trash sequence, permanent delete), states (loading, empty, offline banner, failed save, auto-retry), and keyboard shortcuts on Mac and Windows.

**Bugs found and fixed during regression:**

| Bug | Fix |
|---|---|
| Trash not updating after restore → re-trash sequence | Used `removeQueries` instead of `invalidateQueries` after restore mutations |
| Keyboard shortcut labels Mac-only (`⌘`) | Added OS detection utility using `navigator.platform`; Windows shows `Ctrl+` |
| Bullet/numbered lists not rendering | Tailwind Preflight reset overriding ProseMirror list styles — moved CSS outside `@layer` |
| H1/H2 applying to all text | Content was in a single block due to soft line breaks (`Shift+Enter`); documented expected behaviour |
| Failed to save not shown when offline | `fetch` TypeError was being swallowed — added explicit catch with `navigator.onLine` check and pending-patch retry on reconnect |
| TipTap toolbar active state not updating | TipTap v3 requires `useEditorState` hook; `editor.isActive()` in render does not subscribe to state changes |

---

## Bonus Features

- **Dark / light mode toggle** — CSS custom property theming, persisted to `localStorage`, anti-flash script
- **Export note as Markdown** — downloads `.md` with the current title and content
- **Soft delete with trash** — delete confirmation dialog, trash panel, restore and permanent delete

---

## What I'd Do With More Time

- **Authentication** — JWT-based, per-user note isolation
- **Collaborative editing** — WebSocket broadcasting, CRDTs for conflict resolution
- **Note version history** — store content diffs, point-in-time restore
- **E2E tests with Playwright** — covering full regression path: create → edit → save → search → delete → trash → restore
- **Offline-first** — IndexedDB write queue, sync-on-reconnect, conflict detection
- **Better Markdown export** — `turndown` library; handle bold/italic inside lists
- **Postgres for production** — swap SQLite for horizontal scalability
- **Loading indicators** on note creation and search results
- **Sort preference persistence** to localStorage
- **Blockquote inside lists** — requires a ProseMirror schema extension

---

## Known Limitations

| Limitation | Reason | Workaround |
|---|---|---|
| Node 22.5+ required | `node:sqlite` is a Node 22 built-in | Swap to `better-sqlite3` for broader compatibility |
| SQLite not suited to multi-user | Single file, no network replication | Use Postgres for production |
| Render free tier: DB resets on redeploy | Ephemeral filesystem | Add a Render Disk, or use a hosted DB |
| No authentication | Out of scope per brief | Add Lucia or better-auth |
| Markdown export is regex-based | Full DOM parser was out of scope | Use `turndown` in production |
| Blockquote not supported inside lists | ProseMirror node type conflict | Use blockquote outside list context |
| H1/H2 inside lists converts list item to heading | Headings and lists are mutually exclusive block types in ProseMirror | Exit list first, then apply heading |
