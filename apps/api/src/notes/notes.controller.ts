import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  CurrentUser,
  type AuthUser,
} from '../common/current-user.decorator.js';
import { NotesService } from './notes.service.js';
import { CreateNoteDto, ListNotesQuery, UpdateNoteDto } from './notes.dto.js';

@Controller()
export class NotesController {
  constructor(private readonly notes: NotesService) {}

  @Get('vaults/:vaultId/notes')
  list(
    @CurrentUser() user: AuthUser,
    @Param('vaultId', ParseUUIDPipe) vaultId: string,
    @Query() query: ListNotesQuery,
  ) {
    return this.notes.list(user.id, vaultId, query);
  }

  @Post('vaults/:vaultId/notes')
  create(
    @CurrentUser() user: AuthUser,
    @Param('vaultId', ParseUUIDPipe) vaultId: string,
    @Body() body: CreateNoteDto,
  ) {
    return this.notes.create(user.id, vaultId, body);
  }

  @Get('notes/:noteId')
  get(
    @CurrentUser() user: AuthUser,
    @Param('noteId', ParseUUIDPipe) noteId: string,
  ) {
    return this.notes.get(user.id, noteId);
  }

  @Patch('notes/:noteId')
  update(
    @CurrentUser() user: AuthUser,
    @Param('noteId', ParseUUIDPipe) noteId: string,
    @Body() body: UpdateNoteDto,
  ) {
    return this.notes.update(user.id, noteId, body);
  }

  @Delete('notes/:noteId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentUser() user: AuthUser,
    @Param('noteId', ParseUUIDPipe) noteId: string,
  ): Promise<void> {
    await this.notes.remove(user.id, noteId);
  }
}
