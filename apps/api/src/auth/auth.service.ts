import {
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import argon2 from 'argon2';
import { DB, type Db } from '../prisma/prisma.module.js';
import { isUniqueViolation } from '../common/db-errors.js';
import {
  normalizeEmail,
  toUserDto,
  UsersService,
  type UserDto,
} from '../users/users.service.js';
import { DEFAULT_VAULT_NAME } from '../vaults/vaults.service.js';

export type Session = { user: UserDto; token: string; defaultVaultId?: string };

@Injectable()
export class AuthService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly users: UsersService,
    private readonly jwt: JwtService,
  ) {}

  /** Creates the account and its default vault atomically, then opens a session. */
  async register(email: string, password: string): Promise<Session> {
    const passwordHash = await argon2.hash(password);
    try {
      const { user, vault } = await this.db.transaction(async (tx) => {
        const user = await tx.orm.public.User.create({
          email: normalizeEmail(email),
          passwordHash,
        });
        const vault = await tx.orm.public.Vault.create({
          name: DEFAULT_VAULT_NAME,
          ownerId: user.id,
        });
        return { user, vault };
      });
      return {
        user: toUserDto(user),
        token: await this.sign(user.id),
        defaultVaultId: vault.id,
      };
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('Cet email est déjà utilisé');
      }
      throw error;
    }
  }

  async login(email: string, password: string): Promise<Session> {
    const user = await this.users.findByEmail(email);
    // Same message whether the email or the password is wrong.
    if (!user || !(await argon2.verify(user.passwordHash, password))) {
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }
    return { user: toUserDto(user), token: await this.sign(user.id) };
  }

  async me(userId: string): Promise<UserDto> {
    const user = await this.users.findById(userId);
    if (!user) throw new UnauthorizedException();
    return toUserDto(user);
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.users.findById(userId);
    if (!user || !(await argon2.verify(user.passwordHash, currentPassword))) {
      throw new UnauthorizedException('Mot de passe actuel incorrect');
    }
    await this.users.updatePasswordHash(userId, await argon2.hash(newPassword));
  }

  /** Returns the user id carried by a valid token, or null. */
  async verify(token: string): Promise<string | null> {
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string }>(token);
      return payload.sub;
    } catch {
      return null;
    }
  }

  private sign(userId: string): Promise<string> {
    return this.jwt.signAsync({ sub: userId });
  }
}
