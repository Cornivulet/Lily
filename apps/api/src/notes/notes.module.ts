import { Module } from '@nestjs/common';
import { VaultsModule } from '../vaults/vaults.module.js';
import { LinksModule } from '../links/links.module.js';
import { TagsModule } from '../tags/tags.module.js';
import { FoldersModule } from '../folders/folders.module.js';
import { NotesController } from './notes.controller.js';
import { NotesService } from './notes.service.js';

@Module({
  imports: [VaultsModule, FoldersModule, LinksModule, TagsModule],
  controllers: [NotesController],
  providers: [NotesService],
})
export class NotesModule {}
