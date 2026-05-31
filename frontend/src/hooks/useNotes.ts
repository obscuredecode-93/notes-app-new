import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notesApi } from '../api/notesApi';
import type { Note, NotesFilter, NotesResponse } from '../types';

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

// Fetch a single note by ID. The query is disabled when id is null
// so we don't fire a spurious request when no note is selected.
export function useNote(id: string | null) {
  return useQuery({
    queryKey: ['note', id],
    queryFn:  () => notesApi.get(id!),
    enabled:  !!id,
    staleTime: 30_000,
  });
}

// Update a note with optimistic UI — the list and single-note caches are
// updated immediately so the UI feels instant. On failure, both are rolled
// back to the snapshot taken before the mutation fired.
export function useUpdateNote() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: { id: string } & Partial<Pick<Note, 'title' | 'content' | 'tags'>>) =>
      notesApi.update(id, data),

    onMutate: async ({ id, title, content, tags }) => {
      // Cancel in-flight fetches that would overwrite our optimistic state
      await qc.cancelQueries({ queryKey: ['notes'] });
      await qc.cancelQueries({ queryKey: ['note', id] });

      // Snapshot for rollback
      const previousNotes = qc.getQueriesData<NotesResponse>({ queryKey: ['notes'] });
      const previousNote  = qc.getQueryData<Note>(['note', id]);
      const now           = new Date().toISOString();

      // Apply optimistic update to every active notes-list cache entry
      qc.setQueriesData({ queryKey: ['notes'] }, (old: unknown) => {
        if (!old || typeof old !== 'object' || !('data' in old)) return old;
        const resp = old as NotesResponse;
        return {
          ...resp,
          data: resp.data.map((n: Note) =>
            n.id === id
              ? {
                  ...n,
                  ...(title   !== undefined && { title }),
                  ...(content !== undefined && { content }),
                  ...(tags    !== undefined && { tags }),
                  updatedAt: now,
                }
              : n
          ),
        };
      });

      // Apply optimistic update to the individual note cache
      if (previousNote) {
        qc.setQueryData<Note>(['note', id], {
          ...previousNote,
          ...(title   !== undefined && { title }),
          ...(content !== undefined && { content }),
          ...(tags    !== undefined && { tags }),
          updatedAt: now,
        });
      }

      return { previousNotes, previousNote };
    },

    onError: (_err, { id }, ctx) => {
      // Roll back both caches to their pre-mutation state
      ctx?.previousNotes?.forEach(([queryKey, data]) => qc.setQueryData(queryKey, data));
      if (ctx?.previousNote) qc.setQueryData(['note', id], ctx.previousNote);
    },

    onSettled: (_data, _err, { id }) => {
      // Always sync with the server after the mutation settles
      qc.invalidateQueries({ queryKey: ['notes'] });
      qc.invalidateQueries({ queryKey: ['note', id] });
    },
  });
}

// Fetch the tag list with per-tag counts. Used by TagFilter.
export function useTags() {
  return useQuery({
    queryKey:  ['tags'],
    queryFn:   notesApi.tags,
    staleTime: 60_000,
  });
}

// Create a new note and invalidate the notes list so it re-fetches.
export function useCreateNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Pick<Note, 'title' | 'content' | 'tags'>>) =>
      notesApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notes'] });
      qc.invalidateQueries({ queryKey: ['tags'] });
    },
  });
}
