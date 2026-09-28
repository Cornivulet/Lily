import { useMutation, useQuery } from '@tanstack/react-query';
import { api, query } from '@/lib/api';
import { invalidateKnowledge, queryClient } from '@/lib/query-client';
import type { Note, NoteFilters, NoteRef, NoteSummary, OutgoingLink } from '@/types/api';

export function useNotes(vaultId: string, filters: NoteFilters = {}) {
  return useQuery({
    queryKey: ['notes', vaultId, filters],
    queryFn: () =>
      api<NoteSummary[]>(
        `/vaults/${vaultId}/notes${query({ q: filters.q, tag: filters.tag, sort: filters.sort })}`,
      ),
    placeholderData: (previous) => previous,
  });
}

export function useNote(noteId: string) {
  return useQuery({ queryKey: ['note', noteId], queryFn: () => api<Note>(`/notes/${noteId}`) });
}

export function useBacklinks(noteId: string) {
  return useQuery({
    queryKey: ['backlinks', noteId],
    queryFn: () => api<NoteRef[]>(`/notes/${noteId}/backlinks`),
  });
}

export function useOutgoingLinks(noteId: string) {
  return useQuery({
    queryKey: ['links', noteId],
    queryFn: () => api<OutgoingLink[]>(`/notes/${noteId}/links`),
  });
}

export function useCreateNote(vaultId: string) {
  return useMutation({
    mutationFn: (body: { title?: string; content?: string; folderId?: string }) =>
      api<Note>(`/vaults/${vaultId}/notes`, { method: 'POST', body }),
    onSuccess: (note) => {
      queryClient.setQueryData(['note', note.id], note);
      return invalidateKnowledge();
    },
  });
}

export function useUpdateNote() {
  return useMutation({
    mutationFn: ({
      id,
      ...body
    }: {
      id: string;
      title?: string;
      content?: string;
      folderId?: string | null;
    }) => api<Note>(`/notes/${id}`, { method: 'PATCH', body }),
    onSuccess: (note) => {
      queryClient.setQueryData(['note', note.id], note);
      // A rename may have rewritten other notes: drop their cached content.
      if (note.updatedReferences) {
        queryClient.removeQueries({
          queryKey: ['note'],
          predicate: (q) => q.queryKey[1] !== note.id,
        });
      }
      return invalidateKnowledge();
    },
  });
}

export function useDeleteNote() {
  return useMutation({
    mutationFn: (id: string) => api<void>(`/notes/${id}`, { method: 'DELETE' }),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: ['note', id] });
      return invalidateKnowledge(id);
    },
  });
}
