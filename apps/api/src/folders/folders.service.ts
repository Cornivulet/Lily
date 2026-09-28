import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DB, type Db } from '../prisma/prisma.module.js';
import { isUniqueViolation } from '../common/db-errors.js';
import { toIso } from '../common/dates.js';
import { VaultsService } from '../vaults/vaults.service.js';
import { definedOnly } from '../common/objects.js';

export type FolderDto = {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
};

type FolderRow = FolderDto & { vaultId: string };

function toFolderDto(folder: FolderRow): FolderDto {
  return {
    id: folder.id,
    name: folder.name,
    parentId: folder.parentId,
    createdAt: toIso(folder.createdAt),
    updatedAt: toIso(folder.updatedAt),
  };
}

/** Sibling folders have distinct names (unique index in the contract). */
async function withUniqueName<T>(write: () => PromiseLike<T>): Promise<T> {
  try {
    return await write();
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new ConflictException('Un dossier porte déjà ce nom à cet endroit');
    }
    throw error;
  }
}

@Injectable()
export class FoldersService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly vaults: VaultsService,
  ) {}

  /** Flat list; the client builds the tree from `parentId`. */
  async list(userId: string, vaultId: string): Promise<FolderDto[]> {
    await this.vaults.findOwnedOrThrow(userId, vaultId);
    const folders = await this.db.orm.public.Folder.where({ vaultId })
      .orderBy((f) => f.name.asc())
      .all();
    return folders.map(toFolderDto);
  }

  async create(
    userId: string,
    vaultId: string,
    name: string,
    parentId: string | null,
  ): Promise<FolderDto> {
    await this.vaults.findOwnedOrThrow(userId, vaultId);
    if (parentId) await this.findInVaultOrThrow(vaultId, parentId);
    const folder = await withUniqueName(() =>
      this.db.orm.public.Folder.create({ vaultId, name, parentId }),
    );
    return toFolderDto(folder);
  }

  async update(
    userId: string,
    folderId: string,
    changes: { name?: string; parentId?: string | null },
  ): Promise<FolderDto> {
    const folder = await this.findOwnedOrThrow(userId, folderId);
    if (changes.parentId) {
      await this.findInVaultOrThrow(folder.vaultId, changes.parentId);
      await this.assertNotDescendant(folderId, changes.parentId);
    }
    const updated = await withUniqueName(() =>
      this.db.orm.public.Folder.where({ id: folderId }).update(
        definedOnly(changes),
      ),
    );
    return toFolderDto(updated!);
  }

  async remove(userId: string, folderId: string): Promise<void> {
    await this.findOwnedOrThrow(userId, folderId);
    const [notes, children] = await Promise.all([
      this.db.orm.public.Note.where({ folderId }).first(),
      this.db.orm.public.Folder.where({ parentId: folderId }).first(),
    ]);
    if (notes || children) {
      throw new ConflictException(
        'Déplacez ou supprimez d’abord le contenu du dossier',
      );
    }
    await this.db.orm.public.Folder.where({ id: folderId }).delete();
  }

  /** Ownership check through the folder's vault; 404 when not owned. */
  async findOwnedOrThrow(userId: string, folderId: string) {
    const folder = await this.db.orm.public.Folder.where({ id: folderId })
      .include('vault', (vault) => vault.select('ownerId'))
      .first();
    if (!folder || folder.vault?.ownerId !== userId) {
      throw new NotFoundException('Dossier introuvable');
    }
    return folder;
  }

  async findInVaultOrThrow(vaultId: string, folderId: string) {
    const folder = await this.db.orm.public.Folder.where({
      id: folderId,
      vaultId,
    }).first();
    if (!folder) throw new BadRequestException('Dossier inconnu dans ce vault');
    return folder;
  }

  /** Refuses to move a folder inside itself or one of its descendants. */
  private async assertNotDescendant(
    folderId: string,
    newParentId: string,
  ): Promise<void> {
    let current: string | null = newParentId;
    while (current) {
      if (current === folderId) {
        throw new BadRequestException(
          'Un dossier ne peut pas être déplacé dans lui-même',
        );
      }
      const parent: { parentId: string | null } | null =
        await this.db.orm.public.Folder.where({
          id: current,
        })
          .select('parentId')
          .first();
      current = parent?.parentId ?? null;
    }
  }
}
