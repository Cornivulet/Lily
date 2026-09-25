import { useState } from 'react';
import { Link } from 'react-router';
import { Library, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { EmptyState, ErrorState, LoadingState } from '@/components/States';
import { UserMenu } from '@/features/layout/UserMenu';
import type { Vault } from '@/types/api';
import { useVaults } from './useVaults';
import { CreateVaultDialog, DeleteVaultDialog, RenameVaultDialog } from './VaultDialogs';

const dateFormat = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' });

/** Vault picker and management: the "dashboard" of Lily. */
export function VaultsPage() {
  const vaults = useVaults();
  const [creating, setCreating] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <Link to="/vaults" className="flex items-center gap-2">
          <img src="/favicon.svg" alt="" className="size-7" />
          <span className="text-xl font-semibold tracking-tight text-primary">Lily</span>
        </Link>
        <UserMenu />
      </header>

      <main className="mx-auto max-w-4xl px-6 py-10">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Vos vaults</h1>
            <p className="text-sm text-muted-foreground">
              Chaque vault est un espace de connaissances indépendant.
            </p>
          </div>
          <Button onClick={() => setCreating(true)}>
            <Plus /> Nouveau vault
          </Button>
        </div>

        {vaults.isPending ? (
          <LoadingState />
        ) : vaults.isError ? (
          <ErrorState error={vaults.error} />
        ) : vaults.data.length === 0 ? (
          <EmptyState icon={<Library />} title="Aucun vault">
            Créez un vault pour commencer à prendre des notes.
          </EmptyState>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {vaults.data.map((vault) => (
              <VaultCard key={vault.id} vault={vault} />
            ))}
          </ul>
        )}
      </main>

      <CreateVaultDialog open={creating} onOpenChange={setCreating} />
    </div>
  );
}

function VaultCard({ vault }: { vault: Vault }) {
  const [renaming, setRenaming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  return (
    <li className="group relative rounded-xl border bg-card p-4 transition-colors hover:border-primary/60">
      <Link
        to={`/vaults/${vault.id}`}
        className="block rounded-md focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <h2 className="pr-8 font-semibold">{vault.name}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {vault.noteCount} note{vault.noteCount > 1 ? 's' : ''} · modifié le{' '}
          {dateFormat.format(new Date(vault.updatedAt))}
        </p>
      </Link>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" className="absolute top-3 right-3" aria-label={`Actions pour ${vault.name}`}>
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setRenaming(true)}>
            <Pencil /> Renommer
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(true)}>
            <Trash2 /> Supprimer
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <RenameVaultDialog vault={vault} open={renaming} onOpenChange={setRenaming} />
      <DeleteVaultDialog vault={vault} open={deleting} onOpenChange={setDeleting} />
    </li>
  );
}
