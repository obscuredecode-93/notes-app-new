import { useEffect, useRef } from 'react';
import { Trash2, X } from 'lucide-react';

interface Props {
  title:     string;   // note title shown in the message
  onConfirm: () => void;
  onCancel:  () => void;
  loading?:  boolean;
}

// Confirmation dialog before soft-deleting a note.
// Focus is sent to the "Cancel" button on open so the keyboard-safe default
// is always to abort the action.
export default function DeleteConfirmDialog({ title, onConfirm, onCancel, loading }: Props) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  // Focus the cancel button when the dialog opens
  useEffect(() => {
    cancelRef.current?.focus();
  }, []);

  // Close on Escape, confirm on Enter (when confirm button is focused)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-dialog-title"
    >
      {/* Panel */}
      <div className="bg-bg-surface border border-border-col rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl animate-slide-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-danger">
            <Trash2 className="w-4 h-4" aria-hidden="true" />
            <span id="delete-dialog-title" className="font-medium text-sm">
              Move to trash?
            </span>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Cancel"
            className="text-text-faint hover:text-text-sec transition-colors focus:outline-none focus:ring-1 focus:ring-accent rounded"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <p className="text-text-sec text-sm mb-1">
          Move{' '}
          <span className="text-text-pri font-medium">
            &ldquo;{title || 'Untitled'}&rdquo;
          </span>{' '}
          to the trash?
        </p>
        <p className="text-text-faint text-xs mb-5">
          You can restore it from the trash at any time.
        </p>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            className="flex-1 py-2 text-sm border border-border-col rounded-lg text-text-sec hover:text-text-pri hover:border-text-faint transition-colors focus:outline-none focus:ring-2 focus:ring-accent"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-2 text-sm bg-danger/10 border border-danger/30 rounded-lg text-danger hover:bg-danger/20 transition-colors focus:outline-none focus:ring-2 focus:ring-danger disabled:opacity-50"
          >
            {loading ? 'Moving…' : 'Move to Trash'}
          </button>
        </div>
      </div>
    </div>
  );
}
