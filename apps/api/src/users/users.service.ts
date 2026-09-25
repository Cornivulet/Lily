import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../prisma/prisma.module.js';
import { toIso } from '../common/dates.js';

export type UserDto = { id: string; email: string; createdAt: string };

type UserRow = { id: string; email: string; createdAt: string };

export function toUserDto(user: UserRow): UserDto {
  return { id: user.id, email: user.email, createdAt: toIso(user.createdAt) };
}

@Injectable()
export class UsersService {
  constructor(@Inject(DB) private readonly db: Db) {}

  findByEmail(email: string) {
    return this.db.orm.public.User.where({
      email: normalizeEmail(email),
    }).first();
  }

  findById(id: string) {
    return this.db.orm.public.User.first({ id });
  }

  async updatePasswordHash(id: string, passwordHash: string): Promise<void> {
    await this.db.orm.public.User.where({ id }).update({ passwordHash });
  }
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
