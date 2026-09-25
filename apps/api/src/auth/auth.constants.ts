import type { CookieOptions } from 'express';
import { env } from '../config/env.js';

export const SESSION_COOKIE = 'lily_session';
export const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

export const sessionCookieOptions: CookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: env.isProduction,
  path: '/',
};
