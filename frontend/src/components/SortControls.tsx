import { ArrowUpDown, ChevronUp, ChevronDown } from 'lucide-react';
import type { SortBy, SortOrder } from '../types';

// Labelled options that map to the backend's accepted sort column names
const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: 'updatedAt', label: 'Modified' },
  { value: 'createdAt', label: 'Created' },
  { value: 'title',     label: 'Title' },
];

interface Props {
  sortBy:      SortBy;
  sortOrder:   SortOrder;
  onSortBy:    (v: SortBy)    => void;
  onSortOrder: (v: SortOrder) => void;
}

export default function SortControls({ sortBy, sortOrder, onSortBy, onSortOrder }: Props) {
  const isAsc = sortOrder === 'asc';

  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-border-col shrink-0">
      <ArrowUpDown className="w-3 h-3 text-text-faint shrink-0" aria-hidden="true" />

      <label htmlFor="sort-select" className="sr-only">Sort notes by</label>
      <select
        id="sort-select"
        value={sortBy}
        onChange={(e) => onSortBy(e.target.value as SortBy)}
        className="flex-1 text-xs text-text-sec bg-transparent border-none outline-none cursor-pointer hover:text-text-pri transition-colors"
      >
        {SORT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value} className="bg-bg-surface text-text-pri">
            {o.label}
          </option>
        ))}
      </select>

      {/* Toggle button cycles between ascending and descending */}
      <button
        type="button"
        onClick={() => onSortOrder(isAsc ? 'desc' : 'asc')}
        aria-label={isAsc ? 'Ascending — click for descending' : 'Descending — click for ascending'}
        title={isAsc ? 'Ascending' : 'Descending'}
        className="text-text-faint hover:text-text-sec transition-colors focus:outline-none focus:ring-1 focus:ring-accent rounded p-0.5"
      >
        {isAsc
          ? <ChevronUp   className="w-3.5 h-3.5" aria-hidden="true" />
          : <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
        }
      </button>
    </div>
  );
}
