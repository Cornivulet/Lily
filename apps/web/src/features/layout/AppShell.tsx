import { useState } from 'react';
import Sidebar from './Sidebar';
import { notes } from '../../data/notes';
import type { Note } from '@/src/types/Note';
import Workspace from './Workspace';

const AppShell = () => {
  const [selectedNote, setSelectedNote] = useState<Note | null>(notes[0]);
  return (
    <div className="h-screen grid grid-cols-[240px_1fr]">
      <Sidebar notes={notes} selectedNote={selectedNote} onSelectedNote={setSelectedNote} />
      <Workspace note={selectedNote} />
    </div>
  );
};
export default AppShell;
