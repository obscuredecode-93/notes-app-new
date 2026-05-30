import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notesApi } from '../api/notesApi';
import type { Note, NotesFilter } from '../types';

// Fetch the list of notes, re-fetching when the filter changes.
// queryKey includes the full filter object so different filter combinations
// are cached independently.
export function useNotes(filter: NotesFilter = {}) {
  return useQuery({
    queryKey:  ['notes', filter],
    queryFn:   () => notesApi.list(filter),
    staleTime: 30_000,
  });
}

// Create a new note and invalidate the notes list so it re-fetches.
export function useCreateNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Pick<Note, 'title' | 'content' | 'tags'>>) =>
      notesApi.create(data),
    onSuccess: () => {
      // Invalidate all note list queries regardless of active filters
      qc.invalidateQueries({ queryKey: ['notes'] });
    },
  });
}
