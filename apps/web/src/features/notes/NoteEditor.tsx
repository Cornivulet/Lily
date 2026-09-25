import { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { MarkdownView } from './MarkdownView';

type Mode = 'write' | 'preview' | 'split';

const MODES: { value: Mode; label: string }[] = [
  { value: 'write', label: 'Écrire' },
  { value: 'preview', label: 'Aperçu' },
  { value: 'split', label: 'Côte à côte' },
];

/** Plain Markdown textarea with a live preview. */
export function NoteEditor({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [mode, setMode] = useState<Mode>('split');

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div role="group" aria-label="Mode d’édition" className="inline-flex w-fit rounded-lg border bg-muted p-0.5">
        {MODES.map((m) => (
          <button
            key={m.value}
            type="button"
            aria-pressed={mode === m.value}
            onClick={() => setMode(m.value)}
            className={cn(
              'rounded-md px-3 py-1 text-sm',
              m.value === 'split' && 'hidden lg:block',
              mode === m.value ? 'bg-background font-medium shadow-sm' : 'text-muted-foreground',
            )}
          >
            {m.label}
          </button>
        ))}
      </div>
      <div className={cn('grid min-h-[60vh] gap-4', mode === 'split' && 'lg:grid-cols-2')}>
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label="Contenu Markdown"
          placeholder={'# Titre\n\nÉcrivez en Markdown. Reliez une note avec [[Titre]], taguez avec #tag.'}
          spellCheck
          className={cn(
            'min-h-[60vh] resize-y bg-card font-mono text-sm leading-relaxed',
            mode === 'preview' && 'hidden',
            mode === 'split' && 'max-lg:block',
          )}
        />
        <div
          className={cn(
            'rounded-lg border bg-card p-4',
            mode === 'write' && 'hidden',
            mode === 'split' && 'hidden lg:block',
          )}
          aria-label="Aperçu"
        >
          {value.trim() ? <MarkdownView content={value} /> : <p className="text-sm text-muted-foreground">Rien à afficher.</p>}
        </div>
      </div>
    </div>
  );
}
