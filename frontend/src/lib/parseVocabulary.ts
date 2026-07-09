/**
 * Smart vocabulary parser.
 *
 * Supported input formats (auto-detected, can be mixed):
 *
 * 1. Pipe-delimited  (legacy):
 *      忙 | máng | Bận, bận rộn
 *
 * 2. Whitespace-delimited  (copy-paste from study sheets):
 *      你   nǐ   bạn, anh, chị, ông, bà
 *      女   nǚ   nữ, phụ nữ, con gái
 *
 *    Multiple entries can sit on one physical line separated by large gaps:
 *      你   nǐ   bạn        女   nǚ   nữ
 *
 * A "token" is defined as a run of non-whitespace characters.
 * Within each entry the layout is always:  HANZI  PINYIN  MEANING
 *   • HANZI  — one or more CJK characters (and/or punctuation)
 *   • PINYIN — ASCII/Latin letters with optional tone diacritics, may include spaces
 *              e.g. "nǐ hǎo", "shǐkǒu"
 *   • MEANING — everything else up to the next hanzi token
 */

export interface ParsedItem {
  hanzi: string;
  pinyin: string;
  meaning: string;
}

// ── helpers ────────────────────────────────────────────────────────────────

/** True if the string is (mostly) CJK characters */
function isCJK(s: string): boolean {
  // CJK Unified Ideographs + common extensions
  return /^[\u4E00-\u9FFF\u3400-\u4DBF\uF900-\uFAFF\u3000-\u303F\uFF00-\uFFEF]+$/.test(s);
}

/** True if the string looks like a pinyin syllable or multi-syllable sequence.
 *  Pinyin uses basic Latin + tone diacritics (combining or precomposed).
 *  We allow spaces so "nǐ hǎo" is a single pinyin token.
 */
function isPinyin(s: string): boolean {
  // Must contain at least one Latin letter; may contain tone marks and spaces
  // Reject if it contains CJK
  if (/[\u4E00-\u9FFF]/.test(s)) return false;
  return /^[a-zA-ZāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜüÀ-žñÑ\s]+$/.test(s.trim());
}

// ── pipe-delimited parser ──────────────────────────────────────────────────

function parsePipeLine(line: string): ParsedItem | null {
  const parts = line.split('|').map((p) => p.trim());
  if (parts.length >= 3 && parts[0] && parts[1] && parts[2]) {
    return { hanzi: parts[0], pinyin: parts[1], meaning: parts[2] };
  }
  return null;
}

// ── whitespace-delimited parser ────────────────────────────────────────────

/**
 * Split a chunk of text into tokens, preserving the original spacing info so
 * we can re-join adjacent pinyin syllables (e.g. "nǐ hǎo" arrives as two
 * tokens with a single space between them, while entries are separated by 2+
 * spaces or a tab).
 *
 * We split on 2+ consecutive whitespace chars (entry boundary), then within
 * each segment we further split to extract hanzi / pinyin / meaning.
 */
function parseWhitespaceChunk(chunk: string): ParsedItem[] {
  // Split the chunk into "cells" on 2+ spaces or tabs
  // Each cell should be one field: either HANZI, PINYIN, or MEANING
  // But the user data shows entries packed together:
  //   你   nǐ   bạn, anh...        女   nǚ   nữ...
  // Strategy:
  //   1. Split on 2+ whitespace → gives individual field tokens
  //   2. Walk them in triplets: [hanzi, pinyin, meaning]
  //      If a token is not CJK where we expect hanzi, merge with previous meaning.

  const cells = chunk
    .split(/[ \t]{2,}|\t/)
    .map((c) => c.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  const items: ParsedItem[] = [];
  let i = 0;

  while (i < cells.length) {
    const hanziCandidate = cells[i];

    // Must start with a CJK character
    if (!isCJK(hanziCandidate.replace(/[^\u4E00-\u9FFF\u3400-\u4DBF]/g, ''))) {
      i++;
      continue;
    }

    // Next cell should be pinyin
    const pinyinCandidate = cells[i + 1];
    if (!pinyinCandidate || !isPinyin(pinyinCandidate)) {
      i++;
      continue;
    }

    // Everything until the next CJK cell is the meaning
    let meaningParts: string[] = [];
    let j = i + 2;
    while (j < cells.length) {
      const next = cells[j];
      // Stop if we hit another hanzi token (start of new entry)
      if (isCJK(next.replace(/[^\u4E00-\u9FFF\u3400-\u4DBF]/g, '')) && next.length <= 6) break;
      meaningParts.push(next);
      j++;
    }

    const meaning = meaningParts.join(' ').trim();
    if (meaning) {
      items.push({
        hanzi: hanziCandidate.trim(),
        pinyin: pinyinCandidate.trim(),
        meaning,
      });
    }
    i = j; // advance past consumed cells
  }

  return items;
}

// ── main export ────────────────────────────────────────────────────────────

export function parseVocabularyText(raw: string): ParsedItem[] {
  const results: ParsedItem[] = [];

  // Normalise line endings
  const text = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Split into lines, but keep long runs together (the sheet data is one big blob)
  const lines = text.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // ── Format 1: pipe-delimited
    if (trimmed.includes('|')) {
      const item = parsePipeLine(trimmed);
      if (item) results.push(item);
      continue;
    }

    // ── Format 2: whitespace-delimited (may have multiple entries per line)
    const items = parseWhitespaceChunk(trimmed);
    results.push(...items);
  }

  // Deduplicate by hanzi (keep first occurrence)
  const seen = new Set<string>();
  return results.filter((item) => {
    if (seen.has(item.hanzi)) return false;
    seen.add(item.hanzi);
    return true;
  });
}
