import { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useNoteStore } from './store/noteStore';
import { useNote }      from './hooks/useNotes';
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

  // key={note.id} forces a full remount when the selected note changes,
  // resetting all local state without needing a setState-in-effect.
  return <NoteEditor key={note.id} note={note} />;
}

// ── App shell ─────────────────────────────────────────────────────────────────

function AppShell() {
  const { selectedNoteId, setIsOnline } = useNoteStore();

  // Track browser online/offline events and sync to the store so any
  // component can read isOnline without its own event listener.
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
      {/* Left panel — note list */}
      <aside className="w-80 shrink-0 border-r border-border-col h-full">
        <NoteList />
      </aside>

      {/* Right panel — editor or welcome message */}
      <main className="flex-1 min-w-0 h-full overflow-hidden">
        {selectedNoteId ? (
          <EditorPane noteId={selectedNoteId} />
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-xs text-text-faint">
              Select a note or press{' '}
              <kbd className="px-1 py-0.5 text-[10px] bg-bg-surface border border-border-col rounded">
                ⌘N
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
