import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Graph } from '@/types/api';

export function useVaultGraph(vaultId: string) {
  return useQuery({ queryKey: ['graph', vaultId], queryFn: () => api<Graph>(`/vaults/${vaultId}/graph`) });
}

export function useLocalGraph(noteId: string, depth: number) {
  return useQuery({
    queryKey: ['localGraph', noteId, depth],
    queryFn: () => api<Graph>(`/notes/${noteId}/graph?depth=${depth}`),
  });
}
