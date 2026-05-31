import { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ChevronLeft } from 'lucide-react';
import { useNoteStore }  from './store/noteStore';
import { shortcut }      from './utils/keyboard';
import { useNote }       from './hooks/useNotes';
import NoteList     from './components/NoteList';
import NoteEditor   from './components/NoteEditor';
import ErrorState   from './components/ErrorState';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry:     2,
      staleTime: 30_000,
    },
  },
});

// ── Editor pane ───────────────────────────────────────────────────────────────

function EditorPane({ noteId }: { noteId: string }) {
  const { data: note, isLoading, isError, refetch } = useNote(noteId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="skeleton h-4 w-32" />
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState
        message="Failed to load note — it may have been deleted."
        onRetry={refetch}
      />
    );
  }

  if (!note) return null;

  // key={note.id} forces a full remount on note change, resetting local state.
  return <NoteEditor key={note.id} note={note} />;
}

// ── App shell ─────────────────────────────────────────────────────────────────

function AppShell() {
  const { selectedNoteId, setSelectedNote, setIsOnline } = useNoteStore();

  // Track browser online/offline events and sync to the store.
  useEffect(() => {
    const onOnline  = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online',  onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online',  onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [setIsOnline]);

  return (
    <div className="flex h-full overflow-hidden bg-bg-base">

      {/*
       * ── Left panel — note list ──────────────────────────────────────────────
       * Mobile  (<768px): full-width, hidden when a note is open
       * Desktop (≥768px): fixed 320px sidebar, always visible
       */}
      <aside
        className={`
          flex-col h-full border-r border-border-col
          ${selectedNoteId ? 'hidden md:flex md:w-80 md:shrink-0' : 'flex w-full md:w-80 md:shrink-0'}
        `}
      >
        <NoteList />
      </aside>

      {/*
       * ── Right panel — editor ────────────────────────────────────────────────
       * Mobile  (<768px): full-width, hidden when no note is selected
       * Desktop (≥768px): flex-1, always visible (welcome when no note)
       */}
      <main
        className={`
          min-w-0 h-full flex-col overflow-hidden
          ${selectedNoteId ? 'flex flex-1' : 'hidden md:flex md:flex-1'}
        `}
      >
        {selectedNoteId ? (
          <>
            {/* Mobile back button — hidden on desktop with md:hidden */}
            <div className="md:hidden flex items-center px-4 py-2.5 border-b border-border-col shrink-0">
              <button
                type="button"
                onClick={() => setSelectedNote(null)}
                aria-label="Back to notes list"
                className="flex items-center gap-1.5 text-sm text-text-sec hover:text-text-pri transition-colors focus:outline-none focus:ring-1 focus:ring-accent rounded"
              >
                <ChevronLeft className="w-4 h-4" aria-hidden="true" />
                Notes
              </button>
            </div>

            {/* Editor fills the remaining height */}
            <div className="flex-1 min-h-0 overflow-hidden">
              <EditorPane noteId={selectedNoteId} />
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-xs text-text-faint">
              Select a note or press{' '}
              <kbd className="px-1 py-0.5 text-[10px] bg-bg-surface border border-border-col rounded">
                {shortcut('N')}
              </kbd>{' '}
              to create one
            </p>
          </div>
        )}
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
