// Response shapes of the Lily API (see docs/SPEC.md §H).

export type User = { id: string; email: string; createdAt: string };

export type Vault = {
  id: string;
  name: string;
  noteCount: number;
  createdAt: string;
  updatedAt: string;
};

export type NoteSummary = {
  id: string;
  title: string;
  folderId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Note = NoteSummary & {
  vaultId: string;
  content: string;
  updatedReferences?: number;
};

export type NoteSort = 'updatedAt' | 'createdAt' | 'title';

export type NoteFilters = { q?: string; tag?: string; sort?: NoteSort };

export type Folder = {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Tag = { name: string; noteCount: number };

export type NoteRef = { id: string; title: string; updatedAt: string };

export type OutgoingLink = { targetTitle: string; targetNoteId: string | null };

export type Graph = {
  nodes: { id: string; title: string; degree: number }[];
  edges: { source: string; target: string }[];
};
