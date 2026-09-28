import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Outlet, useLocation, useParams } from 'react-router';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState, ErrorState, LoadingState } from '@/components/States';
import { ApiError } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { NoteFilters } from '@/types/api';
import { VaultContext } from '@/features/vaults/VaultContext';
import { rememberLastVault, useVault } from '@/features/vaults/useVaults';
import { Sidebar } from './Sidebar';

/** Main layout of a vault: sidebar + the selected page (note, graph…). */
export function VaultLayout() {
  const { vaultId = '' } = useParams();
  const vault = useVault(vaultId);

  if (vault.isPending) return <LoadingState />;
  if (vault.isError) {
    if (vault.error instanceof ApiError && vault.error.status === 404) {
      return (
        <EmptyState title="Vault introuvable">
          Ce vault n’existe pas ou ne vous appartient pas.{' '}
          <Link to="/vaults" className="text-primary underline">
            Voir mes vaults
          </Link>
        </EmptyState>
      );
    }
    return <ErrorState error={vault.error} />;
  }
  // Keyed by vault so filters reset when switching vaults.
  return <VaultShell key={vault.data.id} vault={vault.data} />;
}

function VaultShell({ vault }: { vault: NonNullable<ReturnType<typeof useVault>['data']> }) {
  const [filters, setFiltersState] = useState<NoteFilters>({});
  // The mobile drawer stays open only on the page it was opened from,
  // so navigating closes it without an effect.
  const location = useLocation();
  const [menuOpenedAt, setMenuOpenedAt] = useState<string | null>(null);
  const menuOpen = menuOpenedAt === location.pathname;
  const setMenuOpen = (open: boolean) => setMenuOpenedAt(open ? location.pathname : null);

  useEffect(() => rememberLastVault(vault.id), [vault.id]);

  const setFilters = useCallback(
    (update: (current: NoteFilters) => NoteFilters) => setFiltersState(update),
    [],
  );
  const context = useMemo(() => ({ vault, filters, setFilters }), [vault, filters, setFilters]);

  return (
    <VaultContext.Provider value={context}>
      <div className="grid h-dvh md:grid-cols-[288px_1fr]">
        <div
          className={cn(
            'fixed inset-y-0 left-0 z-40 w-72 max-w-[85vw] transition-transform md:static md:w-auto md:max-w-none md:translate-x-0',
            menuOpen ? 'translate-x-0 shadow-xl' : '-translate-x-full',
          )}
        >
          <Sidebar />
        </div>
        {menuOpen && (
          <div className="fixed inset-0 z-30 bg-foreground/20 md:hidden" onClick={() => setMenuOpen(false)} aria-hidden />
        )}
        <div className="flex min-h-0 min-w-0 flex-col">
          <header className="flex items-center gap-2 border-b px-3 py-2 md:hidden">
            <Button variant="ghost" size="icon" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}>
              {menuOpen ? <X /> : <Menu />}
            </Button>
            <span className="truncate font-semibold">{vault.name}</span>
          </header>
          <main className="flex min-h-0 flex-1 flex-col overflow-y-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </VaultContext.Provider>
  );
}
