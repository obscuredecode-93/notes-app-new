import { Plus } from 'lucide-react';
import { useNoteStore } from '../store/noteStore';
import { useNotes, useCreateNote } from '../hooks/useNotes';
import NoteCard    from './NoteCard';
import LoadingState from './LoadingState';
import EmptyState   from './EmptyState';

// NoteList renders the left panel. At this stage it shows all notes with no
// filters. Search (commit 12), sort (commit 14), and tag filtering (commit 13)
// are added incrementally in later commits.
export default function NoteList() {
  const { selectedNoteId, setSelectedNote } = useNoteStore();
  const { data, isLoading, isError } = useNotes({});
  const createNote                   = useCreateNote();

  async function handleNew() {
    try {
      const note = await createNote.mutateAsync({ title: '', content: '', tags: [] });
      // Immediately select the new note so the editor opens
      setSelectedNote(note.id);
    } catch {
      // Mutation error is stored in createNote.error — full error UI in commit 17
    }
  }

  const notes = data?.data ?? [];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-col shrink-0">
        <div className="flex items-center gap-2">
          <h1 className="font-serif text-lg text-text-pri">Notes</h1>
          {/* Note count — only shown when data is loaded */}
          {data && (
            <span className="text-xs text-text-faint tabular-nums">
              {data.total}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={handleNew}
          disabled={createNote.isPending}
          aria-label="New note"
          title="New note"
          className="p-1.5 rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1 focus:ring-offset-bg-base disabled:opacity-50"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && <LoadingState />}

        {/* Show a plain error message when the fetch fails so the user knows
            it is not just an empty list. Full ErrorState component in commit 17. */}
        {!isLoading && isError && (
          <p className="p-4 text-xs text-danger" role="alert">
            Failed to load notes — check your connection and refresh.
          </p>
        )}

        {!isLoading && !isError && notes.length === 0 && (
          <EmptyState onNew={handleNew} />
        )}

        {!isLoading && !isError && notes.length > 0 && (
          <div className="p-3 space-y-1">
            {notes.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                selected={note.id === selectedNoteId}
                onClick={() => setSelectedNote(note.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
