import {
  Controller,
  DefaultValuePipe,
  Get,
  Inject,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import {
  CurrentUser,
  type AuthUser,
} from '../common/current-user.decorator.js';
import { DB, type Db } from '../prisma/prisma.module.js';
import { VaultsService } from '../vaults/vaults.service.js';
import { findOwnedNoteOrThrow } from '../notes/note-access.js';
import { LinksService } from './links.service.js';

@Controller()
export class LinksController {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly links: LinksService,
    private readonly vaults: VaultsService,
  ) {}

  @Get('notes/:noteId/backlinks')
  async backlinks(
    @CurrentUser() user: AuthUser,
    @Param('noteId', ParseUUIDPipe) noteId: string,
  ) {
    await findOwnedNoteOrThrow(this.db, user.id, noteId);
    return this.links.backlinks(noteId);
  }

  @Get('notes/:noteId/links')
  async outgoing(
    @CurrentUser() user: AuthUser,
    @Param('noteId', ParseUUIDPipe) noteId: string,
  ) {
    await findOwnedNoteOrThrow(this.db, user.id, noteId);
    return this.links.outgoing(noteId);
  }

  @Get('notes/:noteId/graph')
  async localGraph(
    @CurrentUser() user: AuthUser,
    @Param('noteId', ParseUUIDPipe) noteId: string,
    @Query('depth', new DefaultValuePipe(1), ParseIntPipe) depth: number,
  ) {
    const note = await findOwnedNoteOrThrow(this.db, user.id, noteId);
    return this.links.localGraph(
      note.vaultId,
      noteId,
      Math.min(Math.max(depth, 1), 2),
    );
  }

  @Get('vaults/:vaultId/graph')
  async vaultGraph(
    @CurrentUser() user: AuthUser,
    @Param('vaultId', ParseUUIDPipe) vaultId: string,
  ) {
    await this.vaults.findOwnedOrThrow(user.id, vaultId);
    return this.links.vaultGraph(vaultId);
  }
}
