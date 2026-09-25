import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module.js';
import { AuthModule } from './auth/auth.module.js';
import { VaultsModule } from './vaults/vaults.module.js';
import { NotesModule } from './notes/notes.module.js';
import { FoldersModule } from './folders/folders.module.js';
import { LinksModule } from './links/links.module.js';
import { TagsModule } from './tags/tags.module.js';

@Module({
  imports: [
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 600 }]),
    PrismaModule,
    AuthModule,
    VaultsModule,
    NotesModule,
    FoldersModule,
    LinksModule,
    TagsModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
