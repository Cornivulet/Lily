import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';
import { configureApp } from './app.setup.js';
import { env } from './config/env.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // The API always runs behind one proxy (Vite in dev, Caddy in production):
  // trust its X-Forwarded-For so rate limiting sees the real client IP.
  app.set('trust proxy', 1);
  configureApp(app);
  app.enableShutdownHooks();
  await app.listen(env.port);
}
await bootstrap();
