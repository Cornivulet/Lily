import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from './common/public.decorator.js';

/** Liveness probe for Docker and the reverse proxy: the process answers HTTP. */
@Controller('health')
export class HealthController {
  @Public()
  @SkipThrottle()
  @Get()
  check() {
    return { status: 'ok' };
  }
}
