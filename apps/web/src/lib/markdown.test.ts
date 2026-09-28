import { describe, expect, it } from 'vitest';
import { linkifyKnowledge, normalizeTitle } from './markdown';

describe('linkifyKnowledge', () => {
  it('turns wikilinks into app links', () => {
    expect(linkifyKnowledge('Voir [[Ma note]].')).toBe('Voir [Ma note](wikilink:Ma%20note).');
  });

  it('uses the alias as label and drops the heading anchor from the target', () => {
    expect(linkifyKnowledge('[[Ma note#Intro|ici]]')).toBe('[ici](wikilink:Ma%20note)');
  });

  it('turns tags into lowercase app links', () => {
    expect(linkifyKnowledge('Sujet #React/Hooks')).toBe('Sujet [#React/Hooks](tag:react%2Fhooks)');
  });

  it('ignores purely numeric tags and headings', () => {
    expect(linkifyKnowledge('# Titre\nissue #42')).toBe('# Titre\nissue #42');
  });

  it('leaves inline and fenced code untouched', () => {
    const content = 'Code `[[pas un lien]] #pasuntag`\n```\n[[non]] #non\n```\n[[Oui]]';
    expect(linkifyKnowledge(content)).toBe(
      'Code `[[pas un lien]] #pasuntag`\n```\n[[non]] #non\n```\n[Oui](wikilink:Oui)',
    );
  });
});

describe('normalizeTitle', () => {
  it('matches titles case-insensitively, ignoring surrounding spaces', () => {
    expect(normalizeTitle('  Ma Note ')).toBe(normalizeTitle('ma note'));
  });
});
