/**
 * Splitting a dictation into the small parts a struggling pupil can hold in
 * working memory. This is the heart of the tool, so it is deliberately a pure,
 * dependency-free function with its own unit tests.
 *
 * Rules, in order:
 *   1. Break on punctuation. The mark stays glued to the part before it —
 *      the pupil has to write it, so they must hear it in context.
 *   2. Any part still longer than `maxWords` is cut into balanced pieces,
 *      never leaving a linking word ("le", "de", "et"…) dangling at the end.
 *   3. Any part shorter than `minWords` is merged into its shorter neighbour.
 */

export interface SegmentOptions {
  minWords: number;
  maxWords: number;
}

export const DEFAULT_SEGMENT_OPTIONS: SegmentOptions = { minWords: 2, maxWords: 4 };

/** Ends a sentence or clause. `…` and `...` are handled as one break. */
const BREAK_CHARS = '.!?;:,…';

/** Closing marks that may trail the real punctuation: « mot », (mot). */
const TRAILING_CHARS = '»"\')]}';

/**
 * A trailing dot after one of these is an abbreviation, not a sentence end.
 * Single letters are treated the same way (initials: "J. Ferry").
 */
const ABBREVIATIONS = new Set([
  'm',
  'mm',
  'mme',
  'mmes',
  'mlle',
  'mlles',
  'dr',
  'pr',
  'me',
  'st',
  'ste',
  'sts',
  'etc',
  'ex',
  'cf',
  'av',
  'bd',
  'no',
  'nos',
  'p',
  'pp',
  'vol',
  'env',
  'art',
  'ch',
  'fig',
  'réf',
  'ref',
]);

/**
 * Words a segment must not end on: cutting between them and what they
 * introduce ("le / chat") destroys the phrase the pupil is trying to hear.
 */
const LINKING_WORDS = new Set([
  // articles & determiners
  'le',
  'la',
  'les',
  'un',
  'une',
  'des',
  'du',
  'de',
  'au',
  'aux',
  'à',
  'a',
  // possessives
  'mon',
  'ma',
  'mes',
  'ton',
  'ta',
  'tes',
  'son',
  'sa',
  'ses',
  'notre',
  'nos',
  'votre',
  'vos',
  'leur',
  'leurs',
  // demonstratives
  'ce',
  'cet',
  'cette',
  'ces',
  // conjunctions
  'et',
  'ou',
  'mais',
  'donc',
  'or',
  'ni',
  'car',
  'que',
  'qui',
  'quoi',
  'dont',
  'où',
  // prepositions
  'dans',
  'sur',
  'sous',
  'pour',
  'avec',
  'par',
  'en',
  'vers',
  'chez',
  'sans',
  'entre',
  'depuis',
  'pendant',
  'contre',
  'selon',
  'après',
  'avant',
  // clitic pronouns
  'je',
  'tu',
  'il',
  'elle',
  'on',
  'nous',
  'vous',
  'ils',
  'elles',
  'se',
  'me',
  'te',
  'lui',
  'y',
  'ne',
  'leur',
  // common intensifiers that lean on the next word
  'plus',
  'moins',
  'très',
  'trop',
  'si',
  'aussi',
  'tout',
  'toute',
  'tous',
  'toutes',
  // elided forms, in case the source text puts a space after the apostrophe
  "l'",
  "d'",
  "j'",
  "n'",
  "qu'",
  "s'",
  "c'",
  "m'",
  "t'",
]);

/** Strips punctuation and case so a token can be compared to a word list. */
function normalizeWord(token: string): string {
  return token
    .replace(/^[«"'([{]+/, '')
    .replace(/[.!?;:,…»"')\]}]+$/, '')
    .toLowerCase();
}

function isLinkingWord(token: string): boolean {
  return LINKING_WORDS.has(normalizeWord(token));
}

/** Tokens that carry no letter or digit (a lone « or —) do not count as words. */
function isWord(token: string): boolean {
  return /[\p{L}\p{N}]/u.test(token);
}

export function countWords(text: string): number {
  return text.split(/\s+/).filter(isWord).length;
}

/**
 * True when this token closes a clause. Guards against abbreviations and
 * decimals, which end in a letter or digit rather than the mark itself.
 */
function endsClause(token: string): boolean {
  let end = token.length - 1;
  while (end >= 0 && TRAILING_CHARS.includes(token[end])) end--;
  if (end < 0) return false;

  const mark = token[end];
  if (!BREAK_CHARS.includes(mark)) return false;

  if (mark === '.') {
    // "3." or "M." or "J." — a dot that belongs to the token, not the sentence.
    const stem = token.slice(0, end).replace(/^[«"'([{]+/, '');
    if (stem.length === 0) return false;
    if (/^\d+$/.test(stem)) return false;
    const lower = stem.toLowerCase();
    if (ABBREVIATIONS.has(lower)) return false;
    if (stem.length === 1 && /\p{L}/u.test(stem)) return false;
  }

  return true;
}

/**
 * Cuts a run of words into balanced pieces of at most `maxWords`, nudging each
 * boundary left when it would strand a linking word.
 */
function splitLongRun(words: string[], opts: SegmentOptions): string[][] {
  const { minWords, maxWords } = opts;
  if (words.length <= maxWords) return [words];

  const pieceCount = Math.ceil(words.length / maxWords);
  const target = Math.ceil(words.length / pieceCount);

  const pieces: string[][] = [];
  let start = 0;

  while (start < words.length) {
    const remaining = words.length - start;
    if (remaining <= maxWords) {
      pieces.push(words.slice(start));
      break;
    }

    let cut = Math.min(target, remaining);
    // Walk the boundary back off any linking word, but never below minWords
    // and never so far that the tail can no longer be cut sensibly.
    while (cut > minWords && isLinkingWord(words[start + cut - 1])) cut--;
    // Do not leave a stub behind: pull the boundary in if the rest is too short.
    if (remaining - cut > 0 && remaining - cut < minWords) cut = remaining - minWords;

    pieces.push(words.slice(start, start + cut));
    start += cut;
  }

  return pieces;
}

/** Merges parts below `minWords` into whichever neighbour is currently shorter. */
function mergeShortParts(parts: string[][], minWords: number): string[][] {
  if (parts.length <= 1) return parts;

  const merged = parts.map((p) => [...p]);
  let i = 0;

  while (i < merged.length) {
    const wordCount = merged[i].filter(isWord).length;
    if (wordCount >= minWords || merged.length === 1) {
      i++;
      continue;
    }

    const prev = i > 0 ? merged[i - 1] : null;
    const next = i < merged.length - 1 ? merged[i + 1] : null;

    // Prefer the shorter neighbour; on a tie, glue to the following part —
    // "Hier," belongs with what it introduces, not with the sentence before.
    const mergeWithNext = prev === null || (next !== null && next.length <= prev.length);

    if (mergeWithNext && next !== null) {
      merged.splice(i, 2, [...merged[i], ...next]);
    } else if (prev !== null) {
      merged.splice(i - 1, 2, [...prev, ...merged[i]]);
      i = Math.max(0, i - 1);
    } else {
      i++;
    }
  }

  return merged;
}

/**
 * Splits a corrected dictation text into the parts the pupil will listen to.
 * Returns plain strings; the caller assigns ids.
 */
export function segmentText(text: string, options: Partial<SegmentOptions> = {}): string[] {
  const opts: SegmentOptions = { ...DEFAULT_SEGMENT_OPTIONS, ...options };
  const minWords = Math.max(1, opts.minWords);
  const maxWords = Math.max(minWords, opts.maxWords);
  const bounded: SegmentOptions = { minWords, maxWords };

  const tokens = text.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  if (tokens.length === 0) return [];

  // 1. Group into clauses, keeping the punctuation with the clause it closes.
  const clauses: string[][] = [];
  let current: string[] = [];
  for (const token of tokens) {
    current.push(token);
    if (endsClause(token)) {
      clauses.push(current);
      current = [];
    }
  }
  if (current.length > 0) clauses.push(current);

  // 2. Cut the long ones.
  const cut = clauses.flatMap((clause) => splitLongRun(clause, bounded));

  // 3. Glue the short ones back, then re-cut anything the merge made too long.
  const balanced = mergeShortParts(cut, minWords).flatMap((part) =>
    part.filter(isWord).length > maxWords ? splitLongRun(part, bounded) : [part]
  );

  return balanced.map((part) => part.join(' ')).filter((part) => part.length > 0);
}
