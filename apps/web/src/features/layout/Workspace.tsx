import type { Note } from '@/src/types/Note';
import { useEffect, useState, type ChangeEvent } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

type WorkspaceProps = {
  note: Note | null;
};

const Workspace = ({ note }: WorkspaceProps) => {
  const [editionMode, setEditionMode] = useState<boolean>(true);
  const [editedContent, setEditedContent] = useState<string>('');

  useEffect(() => {
    if (note) {
      setEditedContent(note.content);
      setEditionMode(false);
    }
  }, [note]);

  if (!note)
    return (
      <main className="flex flex-1 items-center">
        <p>Veuillez sélectionner une note</p>
      </main>
    );

  const handleEdit = () => {
    setEditedContent(note.content);
    setEditionMode(true);
  };

  const handleCancel = () => {
    setEditedContent(note.content);
    setEditionMode(false);
  };

  const handleSave = () => {
    // Pour l'instant, on ne persiste rien.
    // On branchera ça sur notre gestion des notes ensuite.
    console.log(editedContent);

    setEditionMode(false);
  };

  return (
    <main className="flex flex-1 flex-col p-8">
      <header className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold">{note.title}</h1>

        {editionMode ? (
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>

            <Button onClick={handleSave}>Save</Button>
          </div>
        ) : (
          <Button onClick={handleEdit}>Edit</Button>
        )}
      </header>
      <div className="mt-6">
        {editionMode ? (
          <Textarea
            className="mt-6 min-h-96 resize-none"
            defaultValue={note.content}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setEditedContent(e.target.value)}
          />
        ) : (
          <div className="mt-6">
            <p>{note.content}</p>
          </div>
        )}
      </div>
    </main>
  );
};

export default Workspace;
