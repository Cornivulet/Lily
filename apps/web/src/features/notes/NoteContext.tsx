import { Link, useNavigate } from 'react-router';
import { EmptyState } from '@/components/States';
import { GraphView } from '@/features/graph/GraphView';
import { useLocalGraph } from '@/features/graph/useGraph';
import { useBacklinks } from './useNotes';

/** "Mentioned in" list and local graph, shown under a note. */
export function NoteContext({ vaultId, noteId }: { vaultId: string; noteId: string }) {
  const backlinks = useBacklinks(noteId);
  const graph = useLocalGraph(noteId, 1);
  const navigate = useNavigate();

  return (
    <section className="grid gap-6 border-t pt-6 lg:grid-cols-2" aria-label="Contexte de la note">
      <div>
        <h2 className="mb-2 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          Mentionnée dans
        </h2>
        {backlinks.data?.length ? (
          <ul className="grid gap-1">
            {backlinks.data.map((note) => (
              <li key={note.id}>
                <Link to={`/vaults/${vaultId}/notes/${note.id}`} className="text-primary underline-offset-4 hover:underline">
                  {note.title}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            Aucune note ne mentionne celle-ci. Écrivez <code>[[{'Titre'}]]</code> dans une autre note pour la relier.
          </p>
        )}
      </div>
      <div>
        <h2 className="mb-2 text-sm font-semibold tracking-wide text-muted-foreground uppercase">Graphe local</h2>
        <div className="rounded-lg border bg-card">
          {graph.data && graph.data.nodes.length > 1 ? (
            <GraphView
              graph={graph.data}
              focusId={noteId}
              height={220}
              onNodeClick={(id) => navigate(`/vaults/${vaultId}/notes/${id}`)}
            />
          ) : (
            <div className="h-[220px]">
              <EmptyState title="Pas encore de lien" />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
