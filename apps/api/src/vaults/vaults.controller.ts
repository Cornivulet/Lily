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
import { VaultsService } from './vaults.service.js';
import { VaultNameDto } from './vaults.dto.js';

@Controller('vaults')
export class VaultsController {
  constructor(private readonly vaults: VaultsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.vaults.list(user.id);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() body: VaultNameDto) {
    return this.vaults.create(user.id, body.name);
  }

  @Get(':vaultId')
  get(
    @CurrentUser() user: AuthUser,
    @Param('vaultId', ParseUUIDPipe) vaultId: string,
  ) {
    return this.vaults.get(user.id, vaultId);
  }

  @Patch(':vaultId')
  rename(
    @CurrentUser() user: AuthUser,
    @Param('vaultId', ParseUUIDPipe) vaultId: string,
    @Body() body: VaultNameDto,
  ) {
    return this.vaults.rename(user.id, vaultId, body.name);
  }

  @Delete(':vaultId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentUser() user: AuthUser,
    @Param('vaultId', ParseUUIDPipe) vaultId: string,
  ): Promise<void> {
    await this.vaults.remove(user.id, vaultId);
  }
}
