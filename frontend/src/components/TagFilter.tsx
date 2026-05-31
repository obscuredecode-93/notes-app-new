import { Tag, X } from 'lucide-react';
import { useTags } from '../hooks/useNotes';

interface Props {
  selected: string | null;
  onSelect: (tag: string | null) => void;
}

// Renders a row of clickable tag chips below the search bar.
// Clicking a selected tag again deselects it (toggle behaviour).
// Hidden entirely when there are no tags in the database.
export default function TagFilter({ selected, onSelect }: Props) {
  const { data: tags = [] } = useTags();

  if (!tags.length) return null;

  return (
    <div className="px-3 py-2 border-b border-border-col shrink-0">
      <div className="flex items-center gap-1.5 mb-1.5">
        <Tag className="w-3 h-3 text-text-faint" aria-hidden="true" />
        <span className="text-[10px] text-text-faint uppercase tracking-wide font-medium">
          Tags
        </span>
        {selected && (
          <button
            type="button"
            onClick={() => onSelect(null)}
            className="ml-auto flex items-center gap-0.5 text-[10px] text-text-faint hover:text-text-sec transition-colors"
            aria-label="Clear tag filter"
          >
            <X className="w-3 h-3" aria-hidden="true" />
            Clear
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-1" role="listbox" aria-label="Filter by tag">
        {tags.map(({ tag, count }) => (
          <button
            key={tag}
            type="button"
            role="option"
            aria-selected={selected === tag}
            onClick={() => onSelect(selected === tag ? null : tag)}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-xs transition-colors ${
              selected === tag
                ? 'bg-accent/15 text-accent border border-accent/30'
                : 'bg-bg-hover text-text-sec border border-border-col hover:border-accent/30 hover:text-accent'
            }`}
          >
            {tag}
            <span className="text-[10px] opacity-60">{count}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
