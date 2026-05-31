import { create } from 'zustand';
import type { SortBy, SortOrder } from '../types';

// UI state only — server state (note data) lives in React Query.
// Theme and trash state added in commits 19 and 21.
interface NoteStore {
  selectedNoteId: string | null;
  setSelectedNote: (id: string | null) => void;

  searchQuery:    string;
  setSearchQuery: (q: string) => void;

  selectedTag:    string | null;
  setSelectedTag: (tag: string | null) => void;

  sortBy:      SortBy;
  setSortBy:   (v: SortBy)    => void;
  sortOrder:   SortOrder;
  setSortOrder:(v: SortOrder) => void;
}

export const useNoteStore = create<NoteStore>((set) => ({
  selectedNoteId:  null,
  setSelectedNote: (id)  => set({ selectedNoteId: id }),

  searchQuery:    '',
  setSearchQuery: (q)    => set({ searchQuery: q }),

  selectedTag:    null,
  setSelectedTag: (tag)  => set({ selectedTag: tag }),

  // Default: most recently modified first
  sortBy:       'updatedAt',
  setSortBy:    (v) => set({ sortBy: v }),
  sortOrder:    'desc',
  setSortOrder: (v) => set({ sortOrder: v }),
}));
