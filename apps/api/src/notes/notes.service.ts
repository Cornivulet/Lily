import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { or } from '@prisma/orm-postgres/orm-client';
import { DB, type Db, type Queryable } from '../prisma/prisma.module.js';
import { isUniqueViolation } from '../common/db-errors.js';
import { toIso } from '../common/dates.js';
import { definedOnly } from '../common/objects.js';
import { VaultsService } from '../vaults/vaults.service.js';
import { LinksService } from '../links/links.service.js';
import { TagsService } from '../tags/tags.service.js';
import { FoldersService } from '../folders/folders.service.js';
import { normalizeTitle } from '../links/markdown.js';
import { findOwnedNoteOrThrow } from './note-access.js';
import type { ListNotesQuery } from './notes.dto.js';

export const DEFAULT_NOTE_TITLE = 'Sans titre';

export type NoteSummaryDto = {
  id: string;
  title: string;
  folderId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type NoteDto = NoteSummaryDto & {
  vaultId: string;
  content: string;
  /** Number of other notes whose links were rewritten by a rename. */
  updatedReferences?: number;
};

type NoteRow = {
  id: string;
  vaultId: string;
  folderId: string | null;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

function toSummary(note: Omit<NoteRow, 'content' | 'vaultId'>): NoteSummaryDto {
  return {
    id: note.id,
    title: note.title,
    folderId: note.folderId,
    createdAt: toIso(note.createdAt),
    updatedAt: toIso(note.updatedAt),
  };
}

function toNoteDto(note: NoteRow): NoteDto {
  return { ...toSummary(note), vaultId: note.vaultId, content: note.content };
}

/** Escapes LIKE wildcards so user input is matched literally. */
function likePattern(text: string): string {
  return `%${text.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

@Injectable()
export class NotesService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly vaults: VaultsService,
    private readonly folders: FoldersService,
    private readonly links: LinksService,
    private readonly tags: TagsService,
  ) {}

  async list(
    userId: string,
    vaultId: string,
    query: ListNotesQuery,
  ): Promise<NoteSummaryDto[]> {
    await this.vaults.findOwnedOrThrow(userId, vaultId);

    let notes = this.db.orm.public.Note.where({ vaultId });
    const search = query.q?.trim();
    if (search) {
      const pattern = likePattern(search);
      notes = notes.where((n) =>
        or(n.title.ilike(pattern), n.content.ilike(pattern)),
      );
    }
    if (query.folderId) {
      const folderId = query.folderId;
      notes = notes.where((n) => n.folderId.eq(folderId));
    }
    if (query.tag) {
      const ids = await this.tags.noteIdsWithTag(vaultId, query.tag);
      if (ids.length === 0) return [];
      notes = notes.where((n) => n.id.in(ids));
    }

    const sort = query.sort ?? 'updatedAt';
    const rows = await notes
      .select('id', 'title', 'folderId', 'createdAt', 'updatedAt')
      .orderBy(
        sort === 'title'
          ? (n) => n.title.asc()
          : sort === 'createdAt'
            ? (n) => n.createdAt.desc()
            : (n) => n.updatedAt.desc(),
      )
      .all();
    return rows.map(toSummary);
  }

  async get(userId: string, noteId: string): Promise<NoteDto> {
    return toNoteDto(await findOwnedNoteOrThrow(this.db, userId, noteId));
  }

  async create(
    userId: string,
    vaultId: string,
    input: { title?: string; content?: string; folderId?: string },
  ): Promise<NoteDto> {
    await this.vaults.findOwnedOrThrow(userId, vaultId);
    if (input.folderId)
      await this.folders.findInVaultOrThrow(vaultId, input.folderId);

    const note = await this.withUniqueTitle(() =>
      this.db.transaction(async (tx) => {
        const title = input.title ?? (await this.nextFreeTitle(tx, vaultId));
        const note = await tx.orm.public.Note.create({
          vaultId,
          title,
          content: input.content ?? '',
          folderId: input.folderId ?? null,
        });
        await this.reindex(tx, note);
        await this.links.resolveIncoming(tx, note);
        return note;
      }),
    );
    return toNoteDto(note);
  }

  /**
   * Updates a note. A title change also rewrites the [[links]] of every note that
   * referenced the old title, in the same transaction.
   */
  async update(
    userId: string,
    noteId: string,
    input: { title?: string; content?: string; folderId?: string | null },
  ): Promise<NoteDto> {
    const current = await findOwnedNoteOrThrow(this.db, userId, noteId);
    if (input.folderId)
      await this.folders.findInVaultOrThrow(current.vaultId, input.folderId);

    return this.withUniqueTitle(() =>
      this.db.transaction(async (tx) => {
        const note = (await tx.orm.public.Note.where({ id: noteId }).update(
          definedOnly(input),
        ))!;

        const renamed =
          input.title !== undefined && input.title !== current.title;
        let updatedReferences = 0;
        if (renamed) {
          updatedReferences = await this.links.rewriteReferences(
            tx,
            note,
            current.title,
            note.title,
          );
        }
        // The note may link to itself: reload it after the rewrite.
        const saved =
          updatedReferences > 0
            ? (await tx.orm.public.Note.first({ id: noteId }))!
            : note;
        if (renamed || input.content !== undefined) {
          await this.reindex(tx, saved);
        }
        if (
          renamed &&
          normalizeTitle(current.title) !== normalizeTitle(saved.title)
        ) {
          await this.links.resolveIncoming(tx, saved);
        }
        return { ...toNoteDto(saved), updatedReferences };
      }),
    );
  }

  /** Links pointing at the note become unresolved (FK `SET NULL`), they are not lost. */
  async remove(userId: string, noteId: string): Promise<void> {
    const note = await findOwnedNoteOrThrow(this.db, userId, noteId);
    await this.db.transaction(async (tx) => {
      await tx.orm.public.Note.where({ id: noteId }).delete();
      await this.tags.pruneUnused(tx, note.vaultId);
    });
  }

  private async reindex(q: Queryable, note: NoteRow): Promise<void> {
    await this.links.reindexNote(q, note);
    await this.tags.reindexNote(q, note);
  }

  /** "Sans titre", then "Sans titre 2", "Sans titre 3"… */
  private async nextFreeTitle(q: Queryable, vaultId: string): Promise<string> {
    const taken = await q.orm.public.Note.where({ vaultId })
      .where((n) => n.title.ilike(`${DEFAULT_NOTE_TITLE}%`))
      .select('title')
      .all();
    const used = new Set(taken.map((n) => normalizeTitle(n.title)));
    let title = DEFAULT_NOTE_TITLE;
    for (let i = 2; used.has(normalizeTitle(title)); i++) {
      title = `${DEFAULT_NOTE_TITLE} ${i}`;
    }
    return title;
  }

  private async withUniqueTitle<T>(write: () => PromiseLike<T>): Promise<T> {
    try {
      return await write();
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(
          'Une note porte déjà ce titre dans ce vault',
        );
      }
      throw error;
    }
  }
}
