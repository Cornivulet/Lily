import { useState } from 'react';
import { NavLink } from 'react-router';
import {
  ChevronRight,
  FilePlus,
  FileText,
  Folder as FolderIcon,
  FolderPlus,
  MoreHorizontal,
  Pencil,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { Folder, NoteSummary } from '@/types/api';
import {
  CreateFolderDialog,
  DeleteFolderDialog,
  RenameFolderDialog,
} from '@/features/folders/FolderDialogs';

type TreeProps = {
  vaultId: string;
  folders: Folder[];
  notes: NoteSummary[];
  onCreateNote: (folderId?: string) => void;
};

/** Folders (collapsible) with their notes, then the notes at the vault root. */
export function NoteTree({ vaultId, folders, notes, onCreateNote }: TreeProps) {
  return (
    <ul role="tree" aria-label="Notes du vault" className="grid gap-0.5">
      <TreeLevel parentId={null} depth={0} vaultId={vaultId} folders={folders} notes={notes} onCreateNote={onCreateNote} />
    </ul>
  );
}

function TreeLevel({
  parentId,
  depth,
  ...props
}: TreeProps & { parentId: string | null; depth: number }) {
  const childFolders = props.folders.filter((f) => f.parentId === parentId);
  const childNotes = props.notes.filter((n) => n.folderId === parentId);
  return (
    <>
      {childFolders.map((folder) => (
        <FolderNode key={folder.id} folder={folder} depth={depth} {...props} />
      ))}
      {childNotes.map((note) => (
        <NoteItem key={note.id} vaultId={props.vaultId} note={note} depth={depth} />
      ))}
    </>
  );
}

function FolderNode({ folder, depth, ...props }: TreeProps & { folder: Folder; depth: number }) {
  const [open, setOpen] = useState(true);
  const [dialog, setDialog] = useState<'subfolder' | 'rename' | 'delete' | null>(null);
  const close = (next: boolean) => !next && setDialog(null);

  return (
    <li role="treeitem" aria-expanded={open}>
      <div className="group flex items-center rounded-md hover:bg-sidebar-accent" style={{ paddingLeft: depth * 12 }}>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex min-w-0 flex-1 items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-sm font-medium focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <ChevronRight className={cn('size-3.5 shrink-0 transition-transform', open && 'rotate-90')} />
          <FolderIcon className="size-4 shrink-0 text-primary" />
          <span className="truncate">{folder.name}</span>
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              className="mr-1 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 aria-expanded:opacity-100"
              aria-label={`Actions du dossier ${folder.name}`}
            >
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onSelect={() => props.onCreateNote(folder.id)}>
              <FilePlus /> Nouvelle note ici
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setDialog('subfolder')}>
              <FolderPlus /> Nouveau sous-dossier
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setDialog('rename')}>
              <Pencil /> Renommer
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={() => setDialog('delete')}>
              <Trash2 /> Supprimer
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {open && (
        <ul role="group" className="grid gap-0.5">
          <TreeLevel parentId={folder.id} depth={depth + 1} {...props} />
        </ul>
      )}
      <CreateFolderDialog vaultId={props.vaultId} parentId={folder.id} open={dialog === 'subfolder'} onOpenChange={close} />
      <RenameFolderDialog vaultId={props.vaultId} folder={folder} open={dialog === 'rename'} onOpenChange={close} />
      <DeleteFolderDialog vaultId={props.vaultId} folder={folder} open={dialog === 'delete'} onOpenChange={close} />
    </li>
  );
}

export function NoteItem({ vaultId, note, depth = 0 }: { vaultId: string; note: NoteSummary; depth?: number }) {
  return (
    <li role="treeitem">
      <NavLink
        to={`/vaults/${vaultId}/notes/${note.id}`}
        style={{ paddingLeft: 8 + depth * 12 + (depth > 0 ? 6 : 0) }}
        className={({ isActive }) =>
          cn(
            'flex items-center gap-1.5 rounded-md py-1.5 pr-2 text-sm hover:bg-sidebar-accent focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
            isActive && 'bg-sidebar-accent font-medium text-sidebar-accent-foreground',
          )
        }
      >
        <FileText className="size-4 shrink-0 text-muted-foreground" />
        <span className="truncate">{note.title}</span>
      </NavLink>
    </li>
  );
}
