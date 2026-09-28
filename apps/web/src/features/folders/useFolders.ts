import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryClient } from '@/lib/query-client';
import type { Folder } from '@/types/api';

export function useFolders(vaultId: string) {
  return useQuery({
    queryKey: ['folders', vaultId],
    queryFn: () => api<Folder[]>(`/vaults/${vaultId}/folders`),
  });
}

const refresh = (vaultId: string) => queryClient.invalidateQueries({ queryKey: ['folders', vaultId] });

export function useCreateFolder(vaultId: string) {
  return useMutation({
    mutationFn: (body: { name: string; parentId?: string | null }) =>
      api<Folder>(`/vaults/${vaultId}/folders`, { method: 'POST', body }),
    onSuccess: () => refresh(vaultId),
  });
}

export function useUpdateFolder(vaultId: string) {
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; name?: string; parentId?: string | null }) =>
      api<Folder>(`/folders/${id}`, { method: 'PATCH', body }),
    onSuccess: () => refresh(vaultId),
  });
}

export function useDeleteFolder(vaultId: string) {
  return useMutation({
    mutationFn: (id: string) => api<void>(`/folders/${id}`, { method: 'DELETE' }),
    onSuccess: () => refresh(vaultId),
  });
}

/** Folder path such as "Cours / React", for pickers. */
export function folderPath(folders: Folder[], id: string): string {
  const byId = new Map(folders.map((f) => [f.id, f]));
  const parts: string[] = [];
  for (let current = byId.get(id); current; current = current.parentId ? byId.get(current.parentId) : undefined) {
    parts.unshift(current.name);
    if (parts.length > 50) break;
  }
  return parts.join(' / ');
}
