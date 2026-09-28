import { Transform } from 'class-transformer';
import {
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export const MAX_CONTENT_LENGTH = 1_000_000;

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

// These characters would break [[wikilinks]] pointing at the note.
const TITLE_PATTERN = /^[^[\]|#]+$/;
const TITLE_MESSAGE = 'Le titre ne peut pas contenir les caractères [ ] | #';

export class CreateNoteDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @Length(1, 200, {
    message: 'Le titre doit contenir entre 1 et 200 caractères',
  })
  @Matches(TITLE_PATTERN, { message: TITLE_MESSAGE })
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(MAX_CONTENT_LENGTH)
  content?: string;

  @IsOptional()
  @IsUUID()
  folderId?: string;
}

export class UpdateNoteDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @Length(1, 200, {
    message: 'Le titre doit contenir entre 1 et 200 caractères',
  })
  @Matches(TITLE_PATTERN, { message: TITLE_MESSAGE })
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(MAX_CONTENT_LENGTH)
  content?: string;

  /** `null` moves the note to the vault root. */
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsUUID()
  folderId?: string | null;
}

export class ListNotesQuery {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  q?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  tag?: string;

  @IsOptional()
  @IsUUID()
  folderId?: string;

  @IsOptional()
  @IsIn(['updatedAt', 'createdAt', 'title'])
  sort?: 'updatedAt' | 'createdAt' | 'title';
}
