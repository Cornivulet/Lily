import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db, type Queryable } from '../prisma/prisma.module.js';
import { extractTags } from '../links/markdown.js';

export type TagDto = { name: string; noteCount: number };

/** Keeps the Tag / NoteTag tables in sync with the #tags written in note contents. */
@Injectable()
export class TagsService {
  constructor(@Inject(DB) private readonly db: Db) {}

  async reindexNote(
    q: Queryable,
    note: { id: string; vaultId: string; content: string },
  ) {
    await q.orm.public.NoteTag.where({ noteId: note.id }).deleteAndCount();
    for (const name of extractTags(note.content)) {
      const tag =
        (await q.orm.public.Tag.where({
          vaultId: note.vaultId,
          name,
        }).first()) ??
        (await q.orm.public.Tag.create({ vaultId: note.vaultId, name }));
      await q.orm.public.NoteTag.create({ noteId: note.id, tagId: tag.id });
    }
    await this.pruneUnused(q, note.vaultId);
  }

  /** Removes tags no note uses anymore. */
  async pruneUnused(q: Queryable, vaultId: string): Promise<void> {
    const tags = await q.orm.public.Tag.where({ vaultId })
      .include('notes', (notes) => notes.count())
      .all();
    const unused = tags.filter((t) => t.notes === 0).map((t) => t.id);
    if (unused.length > 0) {
      await q.orm.public.Tag.where((t) => t.id.in(unused)).deleteAndCount();
    }
  }

  async list(vaultId: string): Promise<TagDto[]> {
    const tags = await this.db.orm.public.Tag.where({ vaultId })
      .include('notes', (notes) => notes.count())
      .orderBy((t) => t.name.asc())
      .all();
    return tags.map((t) => ({ name: t.name, noteCount: t.notes }));
  }

  /** Ids of the notes carrying `name` in the vault. */
  async noteIdsWithTag(vaultId: string, name: string): Promise<string[]> {
    const tag = await this.db.orm.public.Tag.where({
      vaultId,
      name: name.toLowerCase(),
    }).first();
    if (!tag) return [];
    const rows = await this.db.orm.public.NoteTag.where({ tagId: tag.id })
      .select('noteId')
      .all();
    return rows.map((r) => r.noteId);
  }
}
