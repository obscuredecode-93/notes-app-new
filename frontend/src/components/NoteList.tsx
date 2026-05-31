import { useRef } from 'react';
import { Plus } from 'lucide-react';
import { useNoteStore }                        from '../store/noteStore';
import { useNotes, useCreateNote, useDeleteNote } from '../hooks/useNotes';
import { useDebounce }                         from '../hooks/useDebounce';
import { useKeyboardShortcuts }                from '../hooks/useKeyboardShortcuts';
import NoteCard     from './NoteCard';
import SearchBar    from './SearchBar';
import SortControls from './SortControls';
import TagFilter    from './TagFilter';
import LoadingState from './LoadingState';
import EmptyState   from './EmptyState';

const SEARCH_DEBOUNCE_MS = 300;

export default function NoteList() {
  const searchRef = useRef<HTMLInputElement>(null);

  const {
    selectedNoteId, setSelectedNote,
    searchQuery,    setSearchQuery,
    selectedTag,    setSelectedTag,
    sortBy,         setSortBy,
    sortOrder,      setSortOrder,
  } = useNoteStore();

  const debouncedSearch = useDebounce(searchQuery, SEARCH_DEBOUNCE_MS);

  const { data, isLoading, isError } = useNotes({
    search: debouncedSearch || undefined,
    tag:    selectedTag    || undefined,
    sort:   sortBy,
    order:  sortOrder,
  });
  const createNote = useCreateNote();
  const deleteNote = useDeleteNote();

  async function handleNew() {
    try {
      const note = await createNote.mutateAsync({ title: '', content: '', tags: [] });
      setSelectedNote(note.id);
    } catch {
      // Error stored in createNote.error — full error UI in commit 17
    }
  }

  const notes      = data?.data ?? [];
  const isFiltered = !!debouncedSearch || !!selectedTag;

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────
  useKeyboardShortcuts({
    onNew: handleNew,

    // ⌘K — focus the search bar so the user can start typing immediately
    onSearch: () => searchRef.current?.focus(),

    // ⌘Delete — delete the currently selected note (if any)
    onDelete: selectedNoteId
      ? async () => {
          try {
            await deleteNote.mutateAsync(selectedNoteId);
            setSelectedNote(null);
          } catch {
            // Error handled by useDeleteNote's onError (cache rollback)
          }
        }
      : undefined,

    // Escape — step-down dismiss: clear search first, then tag filter
    onEscape: () => {
      if (searchQuery)  { setSearchQuery(''); return; }
      if (selectedTag)  { setSelectedTag(null); }
    },
  });

  return (
    <div className="flex flex-col h-full">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-col shrink-0">
        <div className="flex items-center gap-2">
          <h1 className="font-serif text-lg text-text-pri">Notes</h1>
          {data && (
            <span
              className="text-xs text-text-faint tabular-nums"
              aria-label={`${data.total} notes`}
            >
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

      {/* ── Search ────────────────────────────────────────────────────────── */}
      <div className="px-3 py-2 border-b border-border-col shrink-0">
        <SearchBar ref={searchRef} value={searchQuery} onChange={setSearchQuery} />
      </div>

      {/* ── Sort controls ─────────────────────────────────────────────────── */}
      <SortControls
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortBy={setSortBy}
        onSortOrder={setSortOrder}
      />

      {/* ── Tag filter — hidden when no tags exist ─────────────────────────── */}
      <TagFilter selected={selectedTag} onSelect={setSelectedTag} />

      {/* ── Note list ─────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && <LoadingState />}

        {!isLoading && isError && (
          <p className="p-4 text-xs text-danger" role="alert">
            Failed to load notes — check your connection and refresh.
          </p>
        )}

        {!isLoading && !isError && notes.length === 0 && (
          <EmptyState
            query={isFiltered ? (debouncedSearch || `#${selectedTag}`) : undefined}
            onNew={isFiltered ? undefined : handleNew}
          />
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
