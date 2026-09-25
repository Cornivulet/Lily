import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { errorMessage } from '@/lib/api';
import { useCreateNote } from './useNotes';

/** Creates a note and opens it in edit mode. */
export function useCreateNoteAndOpen(vaultId: string) {
  const create = useCreateNote(vaultId);
  const navigate = useNavigate();
  return {
    pending: create.isPending,
    run: (input: { title?: string; folderId?: string } = {}) =>
      create.mutate(input, {
        onSuccess: (note) => navigate(`/vaults/${vaultId}/notes/${note.id}?edit=1`),
        onError: (error) => toast.error(errorMessage(error)),
      }),
  };
}
