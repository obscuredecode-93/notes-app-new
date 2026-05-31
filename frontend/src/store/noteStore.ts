import { create } from 'zustand';

// UI state only — server state (note data) lives in React Query.
// This store grows incrementally: sort in commit 14, theme/trash in commits 19 and 21.
interface NoteStore {
  selectedNoteId: string | null;
  setSelectedNote: (id: string | null) => void;

  searchQuery:    string;
  setSearchQuery: (q: string) => void;

  selectedTag:    string | null;
  setSelectedTag: (tag: string | null) => void;
}

export const useNoteStore = create<NoteStore>((set) => ({
  selectedNoteId: null,
  setSelectedNote: (id) => set({ selectedNoteId: id }),

  searchQuery:    '',
  setSearchQuery: (q) => set({ searchQuery: q }),

  selectedTag:    null,
  setSelectedTag: (tag) => set({ selectedTag: tag }),
}));
