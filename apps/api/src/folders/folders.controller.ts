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
} from '@nestjs/common';
import {
  CurrentUser,
  type AuthUser,
} from '../common/current-user.decorator.js';
import { FoldersService } from './folders.service.js';
import { CreateFolderDto, UpdateFolderDto } from './folders.dto.js';

@Controller()
export class FoldersController {
  constructor(private readonly folders: FoldersService) {}

  @Get('vaults/:vaultId/folders')
  list(
    @CurrentUser() user: AuthUser,
    @Param('vaultId', ParseUUIDPipe) vaultId: string,
  ) {
    return this.folders.list(user.id, vaultId);
  }

  @Post('vaults/:vaultId/folders')
  create(
    @CurrentUser() user: AuthUser,
    @Param('vaultId', ParseUUIDPipe) vaultId: string,
    @Body() body: CreateFolderDto,
  ) {
    return this.folders.create(
      user.id,
      vaultId,
      body.name,
      body.parentId ?? null,
    );
  }

  @Patch('folders/:folderId')
  update(
    @CurrentUser() user: AuthUser,
    @Param('folderId', ParseUUIDPipe) folderId: string,
    @Body() body: UpdateFolderDto,
  ) {
    return this.folders.update(user.id, folderId, body);
  }

  @Delete('folders/:folderId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentUser() user: AuthUser,
    @Param('folderId', ParseUUIDPipe) folderId: string,
  ): Promise<void> {
    await this.folders.remove(user.id, folderId);
  }
}
