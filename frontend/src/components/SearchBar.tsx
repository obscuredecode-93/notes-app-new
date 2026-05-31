import { forwardRef } from 'react';
import { Search, X } from 'lucide-react';

interface Props {
  value: string;
  onChange: (value: string) => void;
}

// forwardRef so the parent (NoteList) can focus the input programmatically
// via the ⌘K keyboard shortcut wired in useKeyboardShortcuts.
const SearchBar = forwardRef<HTMLInputElement, Props>(({ value, onChange }, ref) => (
  <div className="relative">
    <Search
      className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-faint pointer-events-none"
      aria-hidden="true"
    />

    <input
      ref={ref}
      type="text"
      role="searchbox"
      aria-label="Search notes"
      placeholder="Search…"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-bg-hover border border-border-col rounded-lg pl-8 pr-7 py-1.5 text-sm text-text-pri placeholder:text-text-faint focus:outline-none focus:border-accent/50 transition-colors"
    />

    {/* Clear button — only visible when the field has a value.
        onMouseDown + preventDefault keeps focus in the input after clearing
        so the user can immediately type a new search query. */}
    {value && (
      <button
        type="button"
        onMouseDown={(e) => {
          e.preventDefault(); // keep focus in the search input
          onChange('');
        }}
        aria-label="Clear search"
        className="absolute right-2 top-1/2 -translate-y-1/2 text-text-faint hover:text-text-sec transition-colors focus:outline-none focus:ring-1 focus:ring-accent rounded"
      >
        <X className="w-3.5 h-3.5" aria-hidden="true" />
      </button>
    )}
  </div>
));

SearchBar.displayName = 'SearchBar';
export default SearchBar;
