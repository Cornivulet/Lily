/**
 * Pure helpers that read the knowledge structure out of a note's Markdown:
 * [[wikilinks]] and #tags. Everything inside code blocks or inline code is ignored.
 */

const FENCED_CODE = /^(```|~~~)[^\n]*\n[\s\S]*?(?:^\1[^\n]*$|(?![\s\S]))/gm;
const INLINE_CODE = /`[^`\n]*`/g;
const WIKILINK = /\[\[([^[\]\n]+?)\]\]/g;
// A tag starts a word, and must contain at least one non-digit character.
const TAG = /(^|\s)#([\p{L}\p{N}_/-]*[\p{L}_/-][\p{L}\p{N}_/-]*)/gu;

type Range = [start: number, end: number];

function codeRanges(content: string): Range[] {
  const ranges: Range[] = [];
  for (const re of [FENCED_CODE, INLINE_CODE]) {
    for (const match of content.matchAll(re)) {
      ranges.push([match.index, match.index + match[0].length]);
    }
  }
  return ranges;
}

function isInside(ranges: Range[], index: number): boolean {
  return ranges.some(([start, end]) => index >= start && index < end);
}

/** Canonical form used to compare titles: trimmed and case-insensitive. */
export function normalizeTitle(title: string): string {
  return title.trim().toLowerCase();
}

/** Splits the inside of `[[...]]` into its target note title and display text. */
export function parseWikilink(inner: string): {
  target: string;
  label: string;
} {
  const [targetPart, alias] = inner.split('|', 2);
  // [[Note#Section]] targets "Note".
  const target = targetPart.split('#', 1)[0].trim();
  return { target, label: (alias ?? targetPart).trim() };
}

/** Distinct, normalized titles of every note referenced by a wikilink. */
export function extractLinkTargets(content: string): string[] {
  const ranges = codeRanges(content);
  const targets = new Set<string>();
  for (const match of content.matchAll(WIKILINK)) {
    if (isInside(ranges, match.index)) continue;
    const { target } = parseWikilink(match[1]);
    if (target) targets.add(normalizeTitle(target));
  }
  return [...targets];
}

/** Distinct, lower-cased tag names (without the leading #). */
export function extractTags(content: string): string[] {
  const ranges = codeRanges(content);
  const tags = new Set<string>();
  for (const match of content.matchAll(TAG)) {
    const hashIndex = match.index + match[1].length;
    if (isInside(ranges, hashIndex)) continue;
    tags.add(match[2].toLowerCase());
  }
  return [...tags];
}

/**
 * Rewrites every wikilink pointing at `oldTitle` so it points at `newTitle`,
 * keeping aliases and section anchors. Returns the content unchanged when no link matches.
 */
export function renameLinks(
  content: string,
  oldTitle: string,
  newTitle: string,
): string {
  const ranges = codeRanges(content);
  const oldKey = normalizeTitle(oldTitle);
  return content.replace(
    WIKILINK,
    (whole: string, inner: string, offset: number) => {
      if (isInside(ranges, offset)) return whole;
      const pipe = inner.indexOf('|');
      const targetPart = pipe === -1 ? inner : inner.slice(0, pipe);
      const rest = pipe === -1 ? '' : inner.slice(pipe);
      const hash = targetPart.indexOf('#');
      const title = hash === -1 ? targetPart : targetPart.slice(0, hash);
      const anchor = hash === -1 ? '' : targetPart.slice(hash);
      if (normalizeTitle(title) !== oldKey) return whole;
      return `[[${newTitle}${anchor}${rest}]]`;
    },
  );
}
