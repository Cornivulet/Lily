import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Tag } from '@/types/api';

export function useTags(vaultId: string) {
  return useQuery({ queryKey: ['tags', vaultId], queryFn: () => api<Tag[]>(`/vaults/${vaultId}/tags`) });
}
