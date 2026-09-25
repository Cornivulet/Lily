import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import {
  CurrentUser,
  type AuthUser,
} from '../common/current-user.decorator.js';
import { VaultsService } from '../vaults/vaults.service.js';
import { TagsService } from './tags.service.js';

@Controller('vaults/:vaultId/tags')
export class TagsController {
  constructor(
    private readonly tags: TagsService,
    private readonly vaults: VaultsService,
  ) {}

  @Get()
  async list(
    @CurrentUser() user: AuthUser,
    @Param('vaultId', ParseUUIDPipe) vaultId: string,
  ) {
    await this.vaults.findOwnedOrThrow(user.id, vaultId);
    return this.tags.list(vaultId);
  }
}
