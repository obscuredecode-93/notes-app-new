import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useNoteStore } from './store/noteStore';
import { useNote } from './hooks/useNotes';
import NoteList   from './components/NoteList';
import NoteEditor from './components/NoteEditor';
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
// Fetches the selected note and renders the TipTap editor.
// Kept as a separate component so the query hook is only active when a note
// is actually selected — avoids a pointless network request on first load.

function EditorPane({ noteId }: { noteId: string }) {
  const { data: note, isLoading, isError } = useNote(noteId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="skeleton h-4 w-32" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-xs text-danger" role="alert">
          Failed to load note — it may have been deleted.
        </p>
      </div>
    );
  }

  // Note might be undefined briefly while the query resolves
  if (!note) return null;

  // key={note.id} forces a full remount whenever the selected note changes.
  // This resets all local state (title, tags, tagInput, saveState) automatically
  // without needing a useEffect that calls setState — the recommended React pattern.
  return <NoteEditor key={note.id} note={note} />;
}

// ── App shell ─────────────────────────────────────────────────────────────────

function AppShell() {
  const { selectedNoteId } = useNoteStore();

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
