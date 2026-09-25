import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DB, type Db } from '../prisma/prisma.module.js';
import { isUniqueViolation } from '../common/db-errors.js';
import { toIso } from '../common/dates.js';

export const DEFAULT_VAULT_NAME = 'Mon vault';

export type VaultDto = {
  id: string;
  name: string;
  noteCount: number;
  createdAt: string;
  updatedAt: string;
};

type VaultRow = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

function toVaultDto(vault: VaultRow, noteCount: number): VaultDto {
  return {
    id: vault.id,
    name: vault.name,
    noteCount,
    createdAt: toIso(vault.createdAt),
    updatedAt: toIso(vault.updatedAt),
  };
}

@Injectable()
export class VaultsService {
  constructor(@Inject(DB) private readonly db: Db) {}

  async list(userId: string): Promise<VaultDto[]> {
    const vaults = await this.db.orm.public.Vault.where({ ownerId: userId })
      .include('notes', (notes) => notes.count())
      .orderBy((v) => v.name.asc())
      .all();
    return vaults.map((v) => toVaultDto(v, v.notes));
  }

  async get(userId: string, vaultId: string): Promise<VaultDto> {
    const vault = await this.db.orm.public.Vault.where({
      id: vaultId,
      ownerId: userId,
    })
      .include('notes', (notes) => notes.count())
      .first();
    if (!vault) throw new NotFoundException('Vault introuvable');
    return toVaultDto(vault, vault.notes);
  }

  async create(userId: string, name: string): Promise<VaultDto> {
    const vault = await this.withUniqueName(() =>
      this.db.orm.public.Vault.create({ name, ownerId: userId }),
    );
    return toVaultDto(vault, 0);
  }

  async rename(
    userId: string,
    vaultId: string,
    name: string,
  ): Promise<VaultDto> {
    await this.findOwnedOrThrow(userId, vaultId);
    await this.withUniqueName(() =>
      this.db.orm.public.Vault.where({ id: vaultId }).update({ name }),
    );
    return this.get(userId, vaultId);
  }

  /** Deletes the vault; notes, folders, tags and links cascade in the database. */
  async remove(userId: string, vaultId: string): Promise<void> {
    await this.findOwnedOrThrow(userId, vaultId);
    await this.db.orm.public.Vault.where({ id: vaultId }).delete();
  }

  /**
   * Ownership check shared by every vault-scoped feature.
   * A vault owned by someone else is reported as missing (404), never as forbidden.
   */
  async findOwnedOrThrow(userId: string, vaultId: string) {
    const vault = await this.db.orm.public.Vault.where({
      id: vaultId,
      ownerId: userId,
    }).first();
    if (!vault) throw new NotFoundException('Vault introuvable');
    return vault;
  }

  private async withUniqueName<T>(write: () => PromiseLike<T>): Promise<T> {
    try {
      return await write();
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('Vous avez déjà un vault portant ce nom');
      }
      throw error;
    }
  }
}
