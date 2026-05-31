import { useEffect, useRef } from 'react';
import { Trash2, X, RotateCcw, Flame } from 'lucide-react';
import { useTrash, useRestoreNote, useDeletePermanent } from '../hooks/useNotes';
import { relativeTime } from '../utils/helpers';
import type { Note } from '../types';

interface Props {
  onClose: () => void;
}

export default function TrashPanel({ onClose }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);

  const { data, isLoading } = useTrash();
  const restore  = useRestoreNote();
  const permDel  = useDeletePermanent();

  const notes = data?.data ?? [];

  // Focus the close button when the panel opens
  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  async function handleRestore(id: string) {
    try {
      await restore.mutateAsync(id);
    } catch { /* error visible in restore.isError */ }
  }

  async function handlePermDelete(id: string) {
    if (!confirm('Permanently delete this note? This cannot be undone.')) return;
    try {
      await permDel.mutateAsync(id);
    } catch { /* error visible in permDel.isError */ }
  }

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 bg-black/60 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="Trash"
    >
      {/* Panel */}
      <div className="bg-bg-surface border border-border-col rounded-2xl w-full max-w-lg mx-4 shadow-2xl overflow-hidden animate-slide-in">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-col">
          <div className="flex items-center gap-2 text-text-sec">
            <Trash2 className="w-4 h-4" aria-hidden="true" />
            <span className="font-medium text-sm">Trash</span>
            {notes.length > 0 && (
              <span className="text-xs text-text-faint">({notes.length})</span>
            )}
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close trash panel"
            className="text-text-faint hover:text-text-sec transition-colors focus:outline-none focus:ring-1 focus:ring-accent rounded"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[60vh] overflow-y-auto">
          {isLoading && (
            <div className="p-8 text-center text-text-faint text-sm">
              Loading…
            </div>
          )}

          {!isLoading && notes.length === 0 && (
            <div className="p-8 text-center">
              <Trash2 className="w-8 h-8 text-text-faint mx-auto mb-2" aria-hidden="true" />
              <p className="text-text-sec text-sm">Trash is empty</p>
            </div>
          )}

          {!isLoading && notes.map((note: Note) => (
            <div
              key={note.id}
              className="flex items-center gap-3 px-5 py-3 border-b border-border-col last:border-0 hover:bg-bg-hover transition-colors"
            >
              {/* Note info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-text-pri truncate">
                  {note.title || 'Untitled'}
                </p>
                <p className="text-xs text-text-faint">
                  Deleted {note.deletedAt ? relativeTime(note.deletedAt) : ''}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => handleRestore(note.id)}
                  disabled={restore.isPending}
                  aria-label={`Restore "${note.title || 'Untitled'}"`}
                  title="Restore note"
                  className="p-1.5 rounded text-text-faint hover:text-success hover:bg-success/10 transition-colors focus:outline-none focus:ring-1 focus:ring-success disabled:opacity-50"
                >
                  <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => handlePermDelete(note.id)}
                  disabled={permDel.isPending}
                  aria-label={`Permanently delete "${note.title || 'Untitled'}"`}
                  title="Delete permanently"
                  className="p-1.5 rounded text-text-faint hover:text-danger hover:bg-danger/10 transition-colors focus:outline-none focus:ring-1 focus:ring-danger disabled:opacity-50"
                >
                  <Flame className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
