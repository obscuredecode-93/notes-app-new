import { FileText } from 'lucide-react';

interface Props {
  // When a search is active the message is different from the first-run state
  query?: string;
  onNew?: () => void;
}

export default function EmptyState({ query, onNew }: Props) {
  return (
    <div
      className="flex flex-col items-center justify-center h-full py-16 px-6 text-center"
      role="status"
    >
      <div className="w-14 h-14 rounded-2xl bg-bg-surface border border-border-col flex items-center justify-center mb-4">
        <FileText className="w-6 h-6 text-text-faint" aria-hidden="true" />
      </div>

      {query ? (
        <>
          <p className="text-sm font-medium text-text-pri mb-1">
            No notes match &ldquo;{query}&rdquo;
          </p>
          <p className="text-xs text-text-sec">Try a different search term</p>
        </>
      ) : (
        <>
          <p className="text-sm font-medium text-text-pri mb-1">No notes yet</p>
          <p className="text-xs text-text-sec mb-4">
            Create your first note to get started
          </p>
          {onNew && (
            <button
              onClick={onNew}
              className="px-4 py-2 bg-accent text-white text-sm rounded-lg hover:bg-accent-dim transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg-base"
            >
              New Note
            </button>
          )}
        </>
      )}
    </div>
  );
}
