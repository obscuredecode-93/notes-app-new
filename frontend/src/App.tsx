import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './index.css';

// React Query client — shared across the whole app.
// Individual hooks configure their own staleTime.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry:     2,
      staleTime: 30_000, // 30 s before a query is considered stale
    },
  },
});

// ── Two-panel shell ───────────────────────────────────────────────────────────
// Left panel (320 px): note list, search, filters  — built in commits 9-14
// Right panel (flex-1): TipTap rich-text editor    — built in commit 10
// This commit establishes the layout and wires up React Query.

function AppShell() {
  return (
    <div className="flex h-full overflow-hidden bg-bg-base">
      {/* Left panel */}
      <aside className="w-80 shrink-0 border-r border-border-col flex flex-col h-full">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-col">
          <h1 className="font-serif text-lg text-text-pri">Notes</h1>
        </div>
        {/* NoteList component comes in commit 9 */}
        <div className="flex-1 flex items-center justify-center">
          <p className="text-xs text-text-faint">Note list coming in commit 9</p>
        </div>
      </aside>

      {/* Right panel */}
      <main className="flex-1 min-w-0 h-full overflow-hidden flex items-center justify-center">
        <p className="text-xs text-text-faint">Editor coming in commit 10</p>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppShell />
    </QueryClientProvider>
  );
}
