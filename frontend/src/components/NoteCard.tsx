import { truncate, stripHtml, relativeTime } from '../utils/helpers';
import type { Note } from '../types';

interface Props {
  note:     Note;
  selected: boolean;
  onClick:  () => void;
}

export default function NoteCard({ note, selected, onClick }: Props) {
  const title   = note.title || 'Untitled';
  // Strip HTML tags before truncating so we don't cut in the middle of a tag
  const preview = truncate(stripHtml(note.content), 100);

  return (
    <button
      onClick={onClick}
      aria-label={`Open note: ${title}`}
      aria-current={selected ? 'true' : undefined}
      className={`w-full text-left px-4 py-3.5 rounded-xl border transition-all group ${
        selected
          ? 'bg-accent/10 border-accent/30'
          : 'bg-bg-surface border-transparent hover:bg-bg-hover hover:border-border-col'
      }`}
    >
      {/* Title + timestamp row */}
      <div className="flex items-start justify-between gap-2 mb-1">
        <span className="text-sm font-medium text-text-pri leading-snug truncate">
          {title}
        </span>
        <time
          dateTime={note.updatedAt}
          className="text-[10px] text-text-faint shrink-0 mt-0.5"
        >
          {relativeTime(note.updatedAt)}
        </time>
      </div>

      {/* Content preview */}
      {preview && (
        <p className="text-xs text-text-sec leading-relaxed line-clamp-2 mb-2">
          {preview}
        </p>
      )}

      {/* Tags */}
      {note.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {note.tags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="inline-block px-1.5 py-0.5 rounded text-[10px] bg-bg-hover text-text-faint border border-border-col"
            >
              {tag}
            </span>
          ))}
          {note.tags.length > 4 && (
            <span className="text-[10px] text-text-faint">
              +{note.tags.length - 4}
            </span>
          )}
        </div>
      )}
    </button>
  );
}
