import { useNavigate } from 'react-router';
import { NameDialog } from '@/components/NameDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import type { Vault } from '@/types/api';
import { useCreateVault, useDeleteVault, useRenameVault } from './useVaults';

type DialogState = { open: boolean; onOpenChange: (open: boolean) => void };

export function CreateVaultDialog(props: DialogState) {
  const create = useCreateVault();
  const navigate = useNavigate();
  return (
    <NameDialog
      {...props}
      title="Nouveau vault"
      label="Nom du vault"
      submitLabel="Créer"
      onSubmit={async (name) => {
        const vault = await create.mutateAsync(name);
        navigate(`/vaults/${vault.id}`);
      }}
    />
  );
}

export function RenameVaultDialog({ vault, ...props }: DialogState & { vault: Vault }) {
  const rename = useRenameVault();
  return (
    <NameDialog
      {...props}
      title="Renommer le vault"
      label="Nom du vault"
      initialValue={vault.name}
      submitLabel="Renommer"
      onSubmit={(name) => rename.mutateAsync({ id: vault.id, name })}
    />
  );
}

export function DeleteVaultDialog({
  vault,
  onDeleted,
  ...props
}: DialogState & { vault: Vault; onDeleted?: () => void }) {
  const remove = useDeleteVault();
  return (
    <ConfirmDialog
      {...props}
      title={`Supprimer « ${vault.name} » ?`}
      description={
        <>
          Les {vault.noteCount} note{vault.noteCount > 1 ? 's' : ''} de ce vault seront
          définitivement supprimées. Cette action est irréversible.
        </>
      }
      confirmLabel="Supprimer le vault"
      typeToConfirm={vault.name}
      onConfirm={async () => {
        await remove.mutateAsync(vault.id);
        onDeleted?.();
      }}
    />
  );
}
