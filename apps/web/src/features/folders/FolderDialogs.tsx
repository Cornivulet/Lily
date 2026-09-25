import { NameDialog } from '@/components/NameDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import type { Folder } from '@/types/api';
import { useCreateFolder, useDeleteFolder, useUpdateFolder } from './useFolders';

type DialogState = { open: boolean; onOpenChange: (open: boolean) => void };

export function CreateFolderDialog({
  vaultId,
  parentId = null,
  ...props
}: DialogState & { vaultId: string; parentId?: string | null }) {
  const create = useCreateFolder(vaultId);
  return (
    <NameDialog
      {...props}
      title={parentId ? 'Nouveau sous-dossier' : 'Nouveau dossier'}
      label="Nom du dossier"
      submitLabel="Créer"
      onSubmit={(name) => create.mutateAsync({ name, parentId })}
    />
  );
}

export function RenameFolderDialog({
  vaultId,
  folder,
  ...props
}: DialogState & { vaultId: string; folder: Folder }) {
  const update = useUpdateFolder(vaultId);
  return (
    <NameDialog
      {...props}
      title="Renommer le dossier"
      label="Nom du dossier"
      initialValue={folder.name}
      submitLabel="Renommer"
      onSubmit={(name) => update.mutateAsync({ id: folder.id, name })}
    />
  );
}

export function DeleteFolderDialog({
  vaultId,
  folder,
  ...props
}: DialogState & { vaultId: string; folder: Folder }) {
  const remove = useDeleteFolder(vaultId);
  return (
    <ConfirmDialog
      {...props}
      title={`Supprimer le dossier « ${folder.name} » ?`}
      description="Seul un dossier vide peut être supprimé."
      confirmLabel="Supprimer"
      onConfirm={() => remove.mutateAsync(folder.id)}
    />
  );
}
