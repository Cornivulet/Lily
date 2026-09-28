import { NotFoundException } from '@nestjs/common';
import type { Queryable } from '../prisma/prisma.module.js';

/**
 * Loads a note only if it lives in a vault owned by `userId`.
 * Someone else's note is reported as missing (404), never as forbidden.
 */
export async function findOwnedNoteOrThrow(
  q: Queryable,
  userId: string,
  noteId: string,
) {
  const note = await q.orm.public.Note.where({ id: noteId })
    .include('vault', (vault) => vault.select('ownerId'))
    .first();
  if (!note || note.vault?.ownerId !== userId) {
    throw new NotFoundException('Note introuvable');
  }
  return note;
}
