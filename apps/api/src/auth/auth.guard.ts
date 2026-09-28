import {
  Injectable,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../common/public.decorator.js';
import type { AuthenticatedRequest } from '../common/current-user.decorator.js';
import { AuthService } from './auth.service.js';
import { SESSION_COOKIE } from './auth.constants.js';

/** Global guard: every route requires a valid session cookie unless marked @Public(). */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly auth: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token: unknown = request.cookies?.[SESSION_COOKIE];
    const userId =
      typeof token === 'string' ? await this.auth.verify(token) : null;
    if (!userId) throw new UnauthorizedException();

    request.user = { id: userId };
    return true;
  }
}
