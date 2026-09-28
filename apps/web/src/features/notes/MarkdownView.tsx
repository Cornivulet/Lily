import { useMemo, useState, type ComponentProps } from 'react';
import { Link } from 'react-router';
import Markdown, { defaultUrlTransform } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { linkifyKnowledge, normalizeTitle, TAG_SCHEME, WIKILINK_SCHEME } from '@/lib/markdown';
import { useVaultContext } from '@/features/vaults/VaultContext';
import { useCreateNote, useNotes } from './useNotes';
import { useNavigate } from 'react-router';

const keepAppLinks = (url: string) =>
  url.startsWith(WIKILINK_SCHEME) || url.startsWith(TAG_SCHEME) ? url : defaultUrlTransform(url);

/** Renders note Markdown (GFM), with [[wikilinks]] and #tags as in-app links. */
export function MarkdownView({ content }: { content: string }) {
  const { vault, setFilters } = useVaultContext();
  const notes = useNotes(vault.id);
  const [missing, setMissing] = useState<string | null>(null);
  const createNote = useCreateNote(vault.id);
  const navigate = useNavigate();

  const idsByTitle = useMemo(
    () => new Map((notes.data ?? []).map((n) => [normalizeTitle(n.title), n.id])),
    [notes.data],
  );
  const source = useMemo(() => linkifyKnowledge(content), [content]);

  function Anchor({ href = '', children, node: _node, ...props }: ComponentProps<'a'> & { node?: unknown }) {
    if (href.startsWith(WIKILINK_SCHEME)) {
      const title = decodeURIComponent(href.slice(WIKILINK_SCHEME.length));
      const id = idsByTitle.get(normalizeTitle(title));
      if (id) {
        return (
          <Link to={`/vaults/${vault.id}/notes/${id}`} className="wikilink">
            {children}
          </Link>
        );
      }
      return (
        <button
          type="button"
          className="wikilink wikilink-missing"
          title={`La note « ${title} » n’existe pas encore`}
          onClick={() => setMissing(title)}
        >
          {children}
        </button>
      );
    }
    if (href.startsWith(TAG_SCHEME)) {
      const tag = decodeURIComponent(href.slice(TAG_SCHEME.length));
      return (
        <button type="button" className="tag-link" onClick={() => setFilters((f) => ({ ...f, tag }))}>
          {children}
        </button>
      );
    }
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
        {children}
      </a>
    );
  }

  return (
    <>
      <div className="markdown">
        <Markdown remarkPlugins={[remarkGfm]} urlTransform={keepAppLinks} components={{ a: Anchor }}>
          {source}
        </Markdown>
      </div>
      <ConfirmDialog
        open={missing !== null}
        onOpenChange={(open) => !open && setMissing(null)}
        title={`Créer la note « ${missing ?? ''} » ?`}
        description="Ce lien pointe vers une note qui n’existe pas encore."
        confirmLabel="Créer la note"
        onConfirm={async () => {
          const note = await createNote.mutateAsync({ title: missing! });
          navigate(`/vaults/${vault.id}/notes/${note.id}?edit=1`);
        }}
      />
    </>
  );
}
