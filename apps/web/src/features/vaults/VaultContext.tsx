import { createContext, useContext } from 'react';
import type { NoteFilters, Vault } from '@/types/api';

type VaultContextValue = {
  vault: Vault;
  /** Sidebar filters; kept in the layout so they survive note navigation. */
  filters: NoteFilters;
  setFilters: (update: (current: NoteFilters) => NoteFilters) => void;
};

export const VaultContext = createContext<VaultContextValue | null>(null);

export function useVaultContext(): VaultContextValue {
  const value = useContext(VaultContext);
  if (!value) throw new Error('useVaultContext must be used inside a vault route');
  return value;
}
