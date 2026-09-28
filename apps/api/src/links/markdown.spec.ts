import {
  extractLinkTargets,
  extractTags,
  normalizeTitle,
  parseWikilink,
  renameLinks,
} from './markdown.js';

describe('markdown helpers', () => {
  describe('extractLinkTargets', () => {
    it('finds wikilinks, normalizes and deduplicates them', () => {
      expect(
        extractLinkTargets('See [[JWT]] and [[ jwt ]] then [[Guards NestJS]].'),
      ).toEqual(['jwt', 'guards nestjs']);
    });

    it('uses the target of aliased and anchored links', () => {
      expect(
        extractLinkTargets('[[Cookies|les cookies]] [[Auth#Tokens]]'),
      ).toEqual(['cookies', 'auth']);
    });

    it('ignores links inside code', () => {
      const content = 'Real [[A]]\n```\n[[B]]\n```\nand `[[C]]` inline';
      expect(extractLinkTargets(content)).toEqual(['a']);
    });

    it('ignores empty links', () => {
      expect(extractLinkTargets('[[ ]] [[|alias]]')).toEqual([]);
    });
  });

  describe('extractTags', () => {
    it('finds tags at word starts, lower-cased', () => {
      expect(extractTags('#Backend notes about #nest-js and #a/b')).toEqual([
        'backend',
        'nest-js',
        'a/b',
      ]);
    });

    it('ignores headings, anchors, numbers and code', () => {
      const content =
        '# Title\n## Sub\nurl.com/#frag #123 `#code`\n```\n#fenced\n```';
      expect(extractTags(content)).toEqual([]);
    });
  });

  describe('renameLinks', () => {
    it('rewrites matching links and keeps aliases and anchors', () => {
      const content = '[[Old]] [[old|alias]] [[OLD#part]] [[Other]]';
      expect(renameLinks(content, 'Old', 'New')).toBe(
        '[[New]] [[New|alias]] [[New#part]] [[Other]]',
      );
    });

    it('leaves code untouched', () => {
      expect(renameLinks('`[[Old]]` [[Old]]', 'Old', 'New')).toBe(
        '`[[Old]]` [[New]]',
      );
    });
  });

  it('parseWikilink splits target and label', () => {
    expect(parseWikilink('Note#H|Label')).toEqual({
      target: 'Note',
      label: 'Label',
    });
    expect(normalizeTitle('  MiXed ')).toBe('mixed');
  });
});
