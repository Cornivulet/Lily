import { useEffect, useState } from 'react';
import { NavLink } from 'react-router';
import { FolderPlus, Hash, Network, Plus, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LoadingState, ErrorState } from '@/components/States';
import { cn } from '@/lib/utils';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import type { NoteSort } from '@/types/api';
import { useVaultContext } from '@/features/vaults/VaultContext';
import { VaultSwitcher } from '@/features/vaults/VaultSwitcher';
import { useNotes } from '@/features/notes/useNotes';
import { NoteItem, NoteTree } from '@/features/notes/NoteTree';
import { useCreateNoteAndOpen } from '@/features/notes/useCreateNoteAndOpen';
import { useFolders } from '@/features/folders/useFolders';
import { CreateFolderDialog } from '@/features/folders/FolderDialogs';
import { useTags } from '@/features/tags/useTags';
import { UserMenu } from './UserMenu';

const SORT_LABELS: Record<NoteSort, string> = {
  updatedAt: 'Modifiées récemment',
  createdAt: 'Créées récemment',
  title: 'Titre (A → Z)',
};

export function Sidebar() {
  const { vault, filters, setFilters } = useVaultContext();
  const [search, setSearch] = useState(filters.q ?? '');
  const debouncedSearch = useDebouncedValue(search);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [showTags, setShowTags] = useState(false);

  useEffect(() => {
    setFilters((current) => ({ ...current, q: debouncedSearch.trim() || undefined }));
  }, [debouncedSearch, setFilters]);

  const notes = useNotes(vault.id, filters);
  const folders = useFolders(vault.id);
  const tags = useTags(vault.id);
  const createNote = useCreateNoteAndOpen(vault.id);
  const filtering = Boolean(filters.q || filters.tag);

  return (
    <aside className="flex h-full flex-col gap-3 border-r bg-sidebar p-3 text-sidebar-foreground">
      <VaultSwitcher current={vault} />

      <div className="flex gap-2">
        <Button className="flex-1" onClick={() => createNote.run()} disabled={createNote.pending}>
          <Plus /> Nouvelle note
        </Button>
        <Button variant="outline" size="icon" onClick={() => setCreatingFolder(true)} aria-label="Nouveau dossier">
          <FolderPlus />
        </Button>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher…"
          aria-label="Rechercher dans les titres et contenus"
          className="bg-background pl-8"
        />
      </div>

      {filters.tag && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Filtré par</span>
          <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 font-medium text-secondary-foreground">
            #{filters.tag}
            <button
              type="button"
              onClick={() => setFilters((f) => ({ ...f, tag: undefined }))}
              aria-label={`Retirer le filtre #${filters.tag}`}
              className="rounded-full hover:bg-primary/20"
            >
              <X className="size-3.5" />
            </button>
          </span>
        </div>
      )}

      <Select
        value={filters.sort ?? 'updatedAt'}
        onValueChange={(sort) => setFilters((f) => ({ ...f, sort: sort as NoteSort }))}
      >
        <SelectTrigger size="sm" className="w-full bg-background" aria-label="Trier les notes">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(SORT_LABELS).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <nav aria-label="Notes" className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1">
        {notes.isPending || folders.isPending ? (
          <LoadingState />
        ) : notes.isError ? (
          <ErrorState error={notes.error} />
        ) : filtering ? (
          notes.data.length === 0 ? (
            <p className="px-2 py-4 text-sm text-muted-foreground">Aucune note ne correspond.</p>
          ) : (
            <ul className="grid gap-0.5" aria-label="Résultats">
              {notes.data.map((note) => (
                <NoteItem key={note.id} vaultId={vault.id} note={note} />
              ))}
            </ul>
          )
        ) : notes.data.length === 0 && (folders.data ?? []).length === 0 ? (
          <p className="px-2 py-4 text-sm text-muted-foreground">Ce vault est vide.</p>
        ) : (
          <NoteTree
            vaultId={vault.id}
            folders={folders.data ?? []}
            notes={notes.data}
            onCreateNote={(folderId) => createNote.run({ folderId })}
          />
        )}
      </nav>

      <div className="grid gap-1">
        <button
          type="button"
          onClick={() => setShowTags(!showTags)}
          aria-expanded={showTags}
          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-sidebar-accent"
        >
          <Hash className="size-4" /> Tags
          <span className="ml-auto text-xs text-muted-foreground">{tags.data?.length ?? 0}</span>
        </button>
        {showTags && (
          <div className="flex max-h-32 flex-wrap gap-1 overflow-y-auto px-2 pb-1">
            {tags.data?.length === 0 && (
              <p className="text-xs text-muted-foreground">Écrivez #tag dans une note pour la taguer.</p>
            )}
            {tags.data?.map((tag) => (
              <button
                key={tag.name}
                type="button"
                onClick={() => setFilters((f) => ({ ...f, tag: f.tag === tag.name ? undefined : tag.name }))}
                aria-pressed={filters.tag === tag.name}
                className={cn(
                  'rounded-full border px-2 py-0.5 text-xs hover:border-primary',
                  filters.tag === tag.name && 'border-primary bg-secondary',
                )}
              >
                #{tag.name} <span className="text-muted-foreground">{tag.noteCount}</span>
              </button>
            ))}
          </div>
        )}
        <NavLink
          to={`/vaults/${vault.id}/graph`}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-sidebar-accent',
              isActive && 'bg-sidebar-accent font-medium',
            )
          }
        >
          <Network className="size-4" /> Graphe du vault
        </NavLink>
      </div>

      <Separator />
      <UserMenu compact />

      <CreateFolderDialog vaultId={vault.id} open={creatingFolder} onOpenChange={setCreatingFolder} />
    </aside>
  );
}
