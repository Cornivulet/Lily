import { Transform } from 'class-transformer';
import { IsString, Length } from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class VaultNameDto {
  @Transform(trim)
  @IsString()
  @Length(1, 100, { message: 'Le nom doit contenir entre 1 et 100 caractères' })
  name: string;
}
