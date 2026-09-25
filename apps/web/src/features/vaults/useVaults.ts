import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryClient } from '@/lib/query-client';
import type { Vault } from '@/types/api';

export function useVaults() {
  return useQuery({ queryKey: ['vaults'], queryFn: () => api<Vault[]>('/vaults') });
}

export function useVault(vaultId: string) {
  return useQuery({ queryKey: ['vault', vaultId], queryFn: () => api<Vault>(`/vaults/${vaultId}`) });
}

const refreshVaults = () => queryClient.invalidateQueries({ queryKey: ['vaults'] });

export function useCreateVault() {
  return useMutation({
    mutationFn: (name: string) => api<Vault>('/vaults', { method: 'POST', body: { name } }),
    onSuccess: refreshVaults,
  });
}

export function useRenameVault() {
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      api<Vault>(`/vaults/${id}`, { method: 'PATCH', body: { name } }),
    onSuccess: (vault) => {
      queryClient.setQueryData(['vault', vault.id], vault);
      return refreshVaults();
    },
  });
}

export function useDeleteVault() {
  return useMutation({
    mutationFn: (id: string) => api<void>(`/vaults/${id}`, { method: 'DELETE' }),
    onSuccess: (_, id) => {
      forgetLastVault(id);
      queryClient.removeQueries({ queryKey: ['vault', id] });
      return refreshVaults();
    },
  });
}

// The last opened vault is a per-browser convenience, so localStorage is enough.
const LAST_VAULT_KEY = 'lily:lastVaultId';

export function rememberLastVault(id: string): void {
  try {
    localStorage.setItem(LAST_VAULT_KEY, id);
  } catch {
    // Storage unavailable (private mode…): not worth failing for.
  }
}

export function lastVaultId(): string | null {
  try {
    return localStorage.getItem(LAST_VAULT_KEY);
  } catch {
    return null;
  }
}

function forgetLastVault(id: string): void {
  if (lastVaultId() === id) {
    try {
      localStorage.removeItem(LAST_VAULT_KEY);
    } catch {
      // ignore
    }
  }
}
