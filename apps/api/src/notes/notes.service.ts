import { Injectable } from '@nestjs/common';

@Injectable()
export class NotesService {
  getAll() {
    return 'Voici mes notes';
  }
}
