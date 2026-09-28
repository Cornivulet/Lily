import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Check, ChevronsUpDown, Library, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Vault } from '@/types/api';
import { useVaults } from './useVaults';
import { CreateVaultDialog } from './VaultDialogs';

export function VaultSwitcher({ current }: { current: Vault }) {
  const vaults = useVaults();
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-auto w-full justify-between px-2 py-1.5">
            <span className="min-w-0 text-left">
              <span className="block text-xs text-muted-foreground">Vault</span>
              <span className="block truncate font-semibold">{current.name}</span>
            </span>
            <ChevronsUpDown className="text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel>Changer de vault</DropdownMenuLabel>
          {vaults.data?.map((vault) => (
            <DropdownMenuItem key={vault.id} onSelect={() => navigate(`/vaults/${vault.id}`)}>
              <Check className={vault.id === current.id ? '' : 'invisible'} />
              <span className="truncate">{vault.name}</span>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setCreating(true)}>
            <Plus /> Nouveau vault
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => navigate('/vaults')}>
            <Library /> Gérer les vaults
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <CreateVaultDialog open={creating} onOpenChange={setCreating} />
    </>
  );
}
