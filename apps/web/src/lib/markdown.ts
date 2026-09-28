// Mirrors apps/api/src/links/markdown.ts: [[wikilinks]] and #tags outside code.

const FENCED_CODE = /^(```|~~~)[^\n]*\n[\s\S]*?(?:^\1[^\n]*$|(?![\s\S]))/gm;
const INLINE_CODE = /`[^`\n]*`/g;
const WIKILINK = /\[\[([^[\]\n]+?)\]\]/g;
const TAG = /(^|\s)#([\p{L}\p{N}_/-]*[\p{L}_/-][\p{L}\p{N}_/-]*)/gu;

export const WIKILINK_SCHEME = 'wikilink:';
export const TAG_SCHEME = 'tag:';

export function normalizeTitle(title: string): string {
  return title.trim().toLowerCase();
}

function codeRanges(content: string): [number, number][] {
  const ranges: [number, number][] = [];
  for (const re of [FENCED_CODE, INLINE_CODE]) {
    for (const match of content.matchAll(re)) {
      ranges.push([match.index, match.index + match[0].length]);
    }
  }
  return ranges;
}

const inCode = (ranges: [number, number][], index: number) =>
  ranges.some(([start, end]) => index >= start && index < end);

/**
 * Turns [[Target|label]] and #tag into regular Markdown links with custom
 * schemes, so the Markdown renderer can display them as app links.
 */
export function linkifyKnowledge(content: string): string {
  const ranges = codeRanges(content);
  const withLinks = content.replace(WIKILINK, (whole: string, inner: string, offset: number) => {
    if (inCode(ranges, offset)) return whole;
    const [targetPart, alias] = inner.split('|', 2);
    const target = targetPart.split('#', 1)[0].trim();
    if (!target) return whole;
    const label = (alias ?? targetPart).trim().replace(/[[\]]/g, '');
    return `[${label}](${WIKILINK_SCHEME}${encodeURIComponent(target)})`;
  });
  const shiftedRanges = codeRanges(withLinks);
  return withLinks.replace(TAG, (whole: string, before: string, name: string, offset: number) => {
    if (inCode(shiftedRanges, offset + before.length)) return whole;
    return `${before}[#${name}](${TAG_SCHEME}${encodeURIComponent(name.toLowerCase())})`;
  });
}
