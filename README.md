# Notes App — Scitara Take-Home

A production-quality notes application with a rich-text editor, real-time auto-save, tag filtering, full-text search, and dark/light theming.

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

**Backend — 40 integration tests (`node:test` + supertest)**

Integration tests over unit tests because the meaningful behaviour lives at the HTTP boundary: does the right SQL run, does validation reject bad input, are HTTP status codes correct? Mocking the database would test the wrong thing — historical bugs live in the query layer, not the handler layer.

Each describe block runs `beforeEach(() => db.exec('DELETE FROM notes'))` so tests are isolated without file-system overhead.

**Frontend — 44 unit tests (Vitest)**

Pure utility functions (`helpers.ts`) and custom hooks (`useDebounce`) are unit-tested — well-defined contracts, fast, no mocking needed. Components are not unit-tested: mocking TipTap + React Query + Zustand in jsdom costs more than it's worth. Component behaviour is covered by the integration tests and manual golden-path testing.

```bash
cd backend  && npm test          # 40 integration tests
cd frontend && npx vitest run    # 44 unit tests
```

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
- **E2E tests** — Playwright covering the full create → edit → save → search → delete golden path
- **Offline-first** — IndexedDB write queue, sync-on-reconnect, conflict detection
- **Better Markdown export** — `turndown` library; handle bold/italic inside lists
- **Postgres for production** — swap SQLite for horizontal scalability

---

## Known Limitations

| Limitation | Reason | Workaround |
|---|---|---|
| Node 22.5+ required | `node:sqlite` is a Node 22 built-in | Swap to `better-sqlite3` for broader compatibility |
| SQLite not suited to multi-user | Single file, no network replication | Use Postgres for production |
| Render free tier: DB resets on redeploy | Ephemeral filesystem | Add a Render Disk, or use a hosted DB |
| No authentication | Out of scope per brief | Add Lucia or better-auth |
| Markdown export is regex-based | Full DOM parser was out of scope | Use `turndown` in production |
