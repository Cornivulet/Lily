import { useEffect, useState, type KeyboardEvent } from 'react';
import { Link, useBlocker, useNavigate, useParams, useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { FolderInput, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { EmptyState, ErrorState, LoadingState } from '@/components/States';
import { FormField } from '@/components/FormField';
import { ApiError, errorMessage } from '@/lib/api';
import type { Note } from '@/types/api';
import { useVaultContext } from '@/features/vaults/VaultContext';
import { folderPath, useFolders } from '@/features/folders/useFolders';
import { useDeleteNote, useNote, useUpdateNote } from './useNotes';
import { MarkdownView } from './MarkdownView';
import { NoteEditor } from './NoteEditor';
import { NoteContext } from './NoteContext';

const dateFormat = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeStyle: 'short' });

export function NotePage() {
  const { noteId = '' } = useParams();
  const note = useNote(noteId);

  if (note.isPending) return <LoadingState />;
  if (note.isError) {
    if (note.error instanceof ApiError && note.error.status === 404) {
      return <EmptyState title="Note introuvable">Elle a peut-être été supprimée.</EmptyState>;
    }
    return <ErrorState error={note.error} />;
  }
  // Keyed by note: switching notes resets the editor state.
  return <NoteScreen key={note.data.id} note={note.data} />;
}

function NoteScreen({ note }: { note: Note }) {
  const { vault } = useVaultContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const [editing, setEditing] = useState(searchParams.get('edit') === '1');
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [titleError, setTitleError] = useState<string>();
  const [deleting, setDeleting] = useState(false);
  const update = useUpdateNote();
  const remove = useDeleteNote();
  const navigate = useNavigate();

  const dirty = editing && (title !== note.title || content !== note.content);

  // "?edit=1" is only an instruction for the first render.
  useEffect(() => {
    if (searchParams.has('edit')) setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams]);

  // Leaving the page (tab close, reload) with unsaved changes.
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  // Leaving the note inside the app with unsaved changes.
  const blocker = useBlocker(({ currentLocation, nextLocation }) => dirty && currentLocation.pathname !== nextLocation.pathname);

  const startEditing = () => {
    setTitle(note.title);
    setContent(note.content);
    setEditing(true);
  };

  const cancel = () => {
    setTitle(note.title);
    setContent(note.content);
    setTitleError(undefined);
    setEditing(false);
  };

  const save = () => {
    const trimmed = title.trim();
    if (!trimmed) return setTitleError('Le titre est requis');
    if (/[[\]|#]/.test(trimmed)) return setTitleError('Le titre ne peut pas contenir [ ] | #');
    update.mutate(
      { id: note.id, title: trimmed, content },
      {
        onSuccess: (saved) => {
          setEditing(false);
          setTitleError(undefined);
          if (saved.updatedReferences) {
            toast.success(
              `Liens mis à jour dans ${saved.updatedReferences} note${saved.updatedReferences > 1 ? 's' : ''}`,
            );
          } else {
            toast.success('Note enregistrée');
          }
        },
        onError: (error) => {
          if (error instanceof ApiError && error.status === 409) setTitleError(error.message);
          else toast.error(errorMessage(error));
        },
      },
    );
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (editing && (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      save();
    }
  };

  return (
    <article className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 sm:px-8" onKeyDown={onKeyDown}>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {editing ? (
            <FormField
              label="Titre"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setTitleError(undefined);
              }}
              error={titleError}
              maxLength={200}
              autoFocus={searchParams.get('edit') === '1'}
              className="h-10 text-lg font-semibold"
            />
          ) : (
            <>
              <h1 className="text-3xl font-semibold break-words">{note.title}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Modifiée le {dateFormat.format(new Date(note.updatedAt))}
              </p>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          {editing ? (
            <>
              <Button variant="outline" onClick={cancel}>
                Annuler
              </Button>
              <Button onClick={save} disabled={update.isPending} title="Ctrl+S">
                Enregistrer
              </Button>
            </>
          ) : (
            <>
              <Button onClick={startEditing}>
                <Pencil /> Modifier
              </Button>
              <NoteActions note={note} onDelete={() => setDeleting(true)} />
            </>
          )}
        </div>
      </header>

      {editing ? (
        <NoteEditor value={content} onChange={setContent} />
      ) : note.content.trim() ? (
        <MarkdownView content={note.content} />
      ) : (
        <p className="text-muted-foreground">
          Cette note est vide.{' '}
          <button type="button" className="text-primary underline" onClick={startEditing}>
            Commencer à écrire
          </button>
        </p>
      )}

      {!editing && <NoteContext vaultId={vault.id} noteId={note.id} />}

      <ConfirmDialog
        open={deleting}
        onOpenChange={setDeleting}
        title={`Supprimer « ${note.title} » ?`}
        description="La note sera définitivement supprimée. Les liens qui y mènent resteront, mais ne pointeront plus vers rien."
        confirmLabel="Supprimer"
        onConfirm={async () => {
          await remove.mutateAsync(note.id);
          navigate(`/vaults/${vault.id}`, { replace: true });
        }}
      />
      <ConfirmDialog
        open={blocker.state === 'blocked'}
        onOpenChange={(open) => !open && blocker.state === 'blocked' && blocker.reset()}
        title="Modifications non enregistrées"
        description="Si vous quittez cette note, vos modifications seront perdues."
        confirmLabel="Quitter sans enregistrer"
        onConfirm={async () => blocker.proceed?.()}
      />
    </article>
  );
}

function NoteActions({ note, onDelete }: { note: Note; onDelete: () => void }) {
  const { vault } = useVaultContext();
  const folders = useFolders(vault.id);
  const update = useUpdateNote();

  const moveTo = (folderId: string | null) =>
    update.mutate(
      { id: note.id, folderId },
      {
        onSuccess: () => toast.success('Note déplacée'),
        onError: (error) => toast.error(errorMessage(error)),
      },
    );

  const sorted = [...(folders.data ?? [])]
    .map((f) => ({ id: f.id, path: folderPath(folders.data ?? [], f.id) }))
    .sort((a, b) => a.path.localeCompare(b.path));

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" aria-label="Autres actions">
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <FolderInput /> Déplacer vers…
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="max-h-72 overflow-y-auto">
            <DropdownMenuItem disabled={note.folderId === null} onSelect={() => moveTo(null)}>
              Racine du vault
            </DropdownMenuItem>
            {sorted.map((folder) => (
              <DropdownMenuItem key={folder.id} disabled={note.folderId === folder.id} onSelect={() => moveTo(folder.id)}>
                {folder.path}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={onDelete}>
          <Trash2 /> Supprimer
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function VaultHome() {
  const { vault } = useVaultContext();
  return (
    <EmptyState title={vault.name}>
      {vault.noteCount === 0 ? (
        <>Ce vault est vide. Créez votre première note avec le bouton « Nouvelle note ».</>
      ) : (
        <>
          Sélectionnez une note dans la barre latérale, ou explorez le{' '}
          <Link to={`/vaults/${vault.id}/graph`} className="text-primary underline">
            graphe du vault
          </Link>
          .
        </>
      )}
    </EmptyState>
  );
}
