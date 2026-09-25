import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db, type Queryable } from '../prisma/prisma.module.js';
import { toIso } from '../common/dates.js';
import { extractLinkTargets, normalizeTitle, renameLinks } from './markdown.js';

export type NoteRef = { id: string; title: string; updatedAt: string };
export type OutgoingLinkDto = {
  targetTitle: string;
  targetNoteId: string | null;
};
export type GraphDto = {
  nodes: { id: string; title: string; degree: number }[];
  edges: { source: string; target: string }[];
};

type IndexedNote = {
  id: string;
  vaultId: string;
  title: string;
  content: string;
};

/**
 * Maintains the NoteLink table: a derived index of the [[wikilinks]] written in
 * note contents. The Markdown content stays the source of truth.
 */
@Injectable()
export class LinksService {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** Recomputes the outgoing links of a note from its content. */
  async reindexNote(q: Queryable, note: IndexedNote): Promise<void> {
    await q.orm.public.NoteLink.where({
      sourceNoteId: note.id,
    }).deleteAndCount();
    const targets = extractLinkTargets(note.content);
    if (targets.length === 0) return;

    const idsByTitle = await this.noteIdsByTitle(q, note.vaultId);
    await q.orm.public.NoteLink.createAndCount(
      targets.map((targetTitle) => ({
        sourceNoteId: note.id,
        targetTitle,
        targetNoteId: idsByTitle.get(targetTitle) ?? null,
      })),
    );
  }

  /** Points previously unresolved links written as [[title]] at this note. */
  async resolveIncoming(
    q: Queryable,
    note: Pick<IndexedNote, 'id' | 'vaultId' | 'title'>,
  ) {
    const vaultNoteIds = [
      ...(await this.noteIdsByTitle(q, note.vaultId)).values(),
    ];
    await q.orm.public.NoteLink.where((l) =>
      l.targetTitle.eq(normalizeTitle(note.title)),
    )
      .where((l) => l.targetNoteId.isNull())
      .where((l) => l.sourceNoteId.in(vaultNoteIds))
      .updateAndCount({ targetNoteId: note.id });
  }

  /**
   * After a rename, rewrites `[[old]]` into `[[new]]` in every note linking to the
   * renamed note, then reindexes them. Returns the number of rewritten notes.
   */
  async rewriteReferences(
    q: Queryable,
    note: Pick<IndexedNote, 'id' | 'vaultId'>,
    oldTitle: string,
    newTitle: string,
  ): Promise<number> {
    const links = await q.orm.public.NoteLink.where((l) =>
      l.targetNoteId.eq(note.id),
    )
      .select('sourceNoteId')
      .all();
    const sourceIds = [...new Set(links.map((l) => l.sourceNoteId))];
    let rewritten = 0;
    for (const sourceId of sourceIds) {
      const source = await q.orm.public.Note.first({ id: sourceId });
      if (!source) continue;
      const content = renameLinks(source.content, oldTitle, newTitle);
      if (content === source.content) continue;
      await q.orm.public.Note.where({ id: source.id }).update({ content });
      await this.reindexNote(q, { ...source, content });
      rewritten++;
    }
    return rewritten;
  }

  async backlinks(noteId: string): Promise<NoteRef[]> {
    const links = await this.db.orm.public.NoteLink.where((l) =>
      l.targetNoteId.eq(noteId),
    )
      .include('source', (s) => s.select('id', 'title', 'updatedAt'))
      .all();
    return links
      .map((l) => l.source)
      .filter((s): s is NonNullable<typeof s> => s !== null && s.id !== noteId)
      .map((s) => ({ id: s.id, title: s.title, updatedAt: toIso(s.updatedAt) }))
      .sort((a, b) => a.title.localeCompare(b.title));
  }

  async outgoing(noteId: string): Promise<OutgoingLinkDto[]> {
    const links = await this.db.orm.public.NoteLink.where({
      sourceNoteId: noteId,
    })
      .select('targetTitle', 'targetNoteId')
      .orderBy((l) => l.targetTitle.asc())
      .all();
    return links.map((l) => ({
      targetTitle: l.targetTitle,
      targetNoteId: l.targetNoteId,
    }));
  }

  /** Every note of the vault as a node, every resolved link as an edge. */
  async vaultGraph(vaultId: string): Promise<GraphDto> {
    const notes = await this.db.orm.public.Note.where({ vaultId })
      .select('id', 'title')
      .all();
    const ids = notes.map((n) => n.id);
    const links =
      ids.length === 0
        ? []
        : await this.db.orm.public.NoteLink.where((l) => l.sourceNoteId.in(ids))
            .where((l) => l.targetNoteId.isNotNull())
            .select('sourceNoteId', 'targetNoteId')
            .all();
    const edges = dedupeEdges(
      links
        .filter(
          (l) => l.targetNoteId !== null && l.targetNoteId !== l.sourceNoteId,
        )
        .map((l) => ({ source: l.sourceNoteId, target: l.targetNoteId! })),
    );
    const degree = new Map<string, number>();
    for (const { source, target } of edges) {
      degree.set(source, (degree.get(source) ?? 0) + 1);
      degree.set(target, (degree.get(target) ?? 0) + 1);
    }
    return {
      nodes: notes.map((n) => ({
        id: n.id,
        title: n.title,
        degree: degree.get(n.id) ?? 0,
      })),
      edges,
    };
  }

  /** Neighbourhood of a note, following links in both directions up to `depth`. */
  async localGraph(
    vaultId: string,
    noteId: string,
    depth: number,
  ): Promise<GraphDto> {
    const graph = await this.vaultGraph(vaultId);
    const neighbours = new Map<string, string[]>();
    for (const { source, target } of graph.edges) {
      neighbours.set(source, [...(neighbours.get(source) ?? []), target]);
      neighbours.set(target, [...(neighbours.get(target) ?? []), source]);
    }
    const kept = new Set([noteId]);
    let frontier = [noteId];
    for (let level = 0; level < depth; level++) {
      frontier = frontier
        .flatMap((id) => neighbours.get(id) ?? [])
        .filter((id) => !kept.has(id));
      frontier.forEach((id) => kept.add(id));
    }
    return {
      nodes: graph.nodes.filter((n) => kept.has(n.id)),
      edges: graph.edges.filter(
        (e) => kept.has(e.source) && kept.has(e.target),
      ),
    };
  }

  private async noteIdsByTitle(
    q: Queryable,
    vaultId: string,
  ): Promise<Map<string, string>> {
    const notes = await q.orm.public.Note.where({ vaultId })
      .select('id', 'title')
      .all();
    return new Map(notes.map((n) => [normalizeTitle(n.title), n.id]));
  }
}

/** A→B and B→A are the same edge in the (undirected) graph view. */
function dedupeEdges(edges: { source: string; target: string }[]) {
  const seen = new Set<string>();
  return edges.filter(({ source, target }) => {
    const key = source < target ? `${source}|${target}` : `${target}|${source}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
