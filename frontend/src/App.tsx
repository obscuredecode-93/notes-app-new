import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import NoteList from './components/NoteList';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry:     2,
      staleTime: 30_000,
    },
  },
});

function AppShell() {
  return (
    <div className="flex h-full overflow-hidden bg-bg-base">
      {/* Left panel — note list */}
      <aside className="w-80 shrink-0 border-r border-border-col h-full">
        <NoteList />
      </aside>

      {/* Right panel — editor (built in commit 10) */}
      <main className="flex-1 min-w-0 h-full overflow-hidden flex items-center justify-center">
        <p className="text-xs text-text-faint">Select a note to start editing</p>
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
