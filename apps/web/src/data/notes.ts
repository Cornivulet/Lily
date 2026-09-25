import type { Note } from '../types/Note';

export const notes: Note[] = [
  {
    id: '1',
    title: 'Note 1',
    content: 'Contenu de ma première note.',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '2',
    title: 'Note 2',
    content: 'Contenu de ma deuxième note.',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];
