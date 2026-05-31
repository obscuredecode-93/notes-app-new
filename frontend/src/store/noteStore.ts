import { create } from 'zustand';
import type { SortBy, SortOrder } from '../types';

// UI state only — server state (note data) lives in React Query.
interface NoteStore {
  selectedNoteId: string | null;
  setSelectedNote: (id: string | null) => void;

  searchQuery:    string;
  setSearchQuery: (q: string) => void;

  selectedTag:    string | null;
  setSelectedTag: (tag: string | null) => void;

  sortBy:       SortBy;
  setSortBy:    (v: SortBy)    => void;
  sortOrder:    SortOrder;
  setSortOrder: (v: SortOrder) => void;

  isOnline:    boolean;
  setIsOnline: (v: boolean) => void;

  // Theme — 'dark' by default, persisted to localStorage
  theme:       'dark' | 'light';
  toggleTheme: () => void;
}

function readTheme(): 'dark' | 'light' {
  try {
    const stored = localStorage.getItem('theme');
    return stored === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark'; // localStorage unavailable (private browsing, SSR)
  }
}

export const useNoteStore = create<NoteStore>((set) => ({
  selectedNoteId:  null,
  setSelectedNote: (id)  => set({ selectedNoteId: id }),

  searchQuery:    '',
  setSearchQuery: (q)    => set({ searchQuery: q }),

  selectedTag:    null,
  setSelectedTag: (tag)  => set({ selectedTag: tag }),

  sortBy:       'updatedAt',
  setSortBy:    (v) => set({ sortBy: v }),
  sortOrder:    'desc',
  setSortOrder: (v) => set({ sortOrder: v }),

  isOnline:    typeof navigator !== 'undefined' ? navigator.onLine : true,
  setIsOnline: (v) => set({ isOnline: v }),

  theme: readTheme(),
  toggleTheme: () =>
    set((s) => {
      const next = s.theme === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem('theme', next); } catch { /* ignore */ }
      // Apply/remove .light on <html> immediately — no React re-render delay
      document.documentElement.classList.toggle('light', next === 'light');
      return { theme: next };
    }),
}));
