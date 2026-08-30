import { describe, expect, it } from 'vitest';
import {
  ChunkCollector,
  PAYLOAD_PREFIX,
  decodeChunks,
  encodeDictation,
  parseChunk,
} from '../share';
import type { Dictation } from '../types';

function makeDictation(segmentTexts: string[], title = 'Dictée du lundi'): Dictation {
  return {
    id: 'abc123',
    title,
    createdAt: 1,
    updatedAt: 2,
    sourceText: segmentTexts.join(' '),
    segments: segmentTexts.map((text, index) => ({ id: `s${index}`, text })),
    speech: { rate: 0.7, repeatAfterMs: 3000 },
    showWordCount: false,
    allowReveal: true,
    imageId: 'photo-abc123',
  };
}

/** Feeds every chunk through the scanner path, as the pupil's camera would. */
function roundTrip(dictation: Dictation) {
  const chunks = encodeDictation(dictation);
  const collector = new ChunkCollector();
  for (const chunk of chunks) {
    const header = parseChunk(chunk);
    expect(header).not.toBeNull();
    collector.add(header!);
  }
  expect(collector.complete).toBe(true);
  return { chunks, imported: decodeChunks(collector.ordered()) };
}

describe('encode/decode round trip', () => {
  it('preserves the text, the title and the reading settings', () => {
    const dictation = makeDictation(['Le chat dort,', 'le chien joue.']);
    const { imported } = roundTrip(dictation);

    expect(imported.title).toBe('Dictée du lundi');
    expect(imported.segments).toEqual(['Le chat dort,', 'le chien joue.']);
    expect(imported.speech).toEqual({ rate: 0.7, repeatAfterMs: 3000 });
    expect(imported.showWordCount).toBe(false);
    expect(imported.allowReveal).toBe(true);
  });

  it('keeps accents and French quotation marks intact', () => {
    const segments = ['« Où étais-tu ? »', "j'ai répondu très vite,", 'à cause de l’orage.'];
    expect(roundTrip(makeDictation(segments)).imported.segments).toEqual(segments);
  });

  it('fits a normal dictation in a single QR code', () => {
    const dictation = makeDictation(
      'Le petit chat noir dormait paisiblement sur le vieux fauteuil du salon pendant que la pluie tombait sans relâche sur les toits du village endormi'
        .split(' ')
        .reduce<string[]>((acc, word, index) => {
          if (index % 3 === 0) acc.push(word);
          else acc[acc.length - 1] += ` ${word}`;
          return acc;
        }, [])
    );
    expect(encodeDictation(dictation)).toHaveLength(1);
  });

  it('splits a very long dictation across several codes and rebuilds it', () => {
    // Deflate crushes repetitive text, so a realistic worst case needs varied
    // wording. A deterministic LCG keeps the test reproducible.
    const syllables = 'ba be bi bo bu cha che chi cho chu da de di do du fa fe fi fo fu'.split(' ');
    let seed = 7;
    const nextWord = () => {
      let word = '';
      for (let i = 0; i < 3; i++) {
        seed = (seed * 1103515245 + 12345) % 2147483648;
        word += syllables[seed % syllables.length];
      }
      return word;
    };
    const segments = Array.from(
      { length: 500 },
      () => `${nextWord()} ${nextWord()} ${nextWord()},`
    );
    const dictation = makeDictation(segments);
    const { chunks, imported } = roundTrip(dictation);

    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) expect(chunk.length).toBeLessThanOrEqual(2953);
    expect(imported.segments).toEqual(segments);
  });

  it('never puts the source photo on the wire', () => {
    for (const chunk of encodeDictation(makeDictation(['Le chat dort.']))) {
      expect(chunk).not.toContain('photo-');
    }
  });
});

describe('parseChunk', () => {
  it('rejects codes that are not ours', () => {
    expect(parseChunk('https://example.com')).toBeNull();
    expect(parseChunk('')).toBeNull();
    expect(parseChunk('AUTRE:xyz:1:1:data')).toBeNull();
  });

  it('rejects malformed headers', () => {
    expect(parseChunk(`${PAYLOAD_PREFIX}:xyz:0:2:data`)).toBeNull();
    expect(parseChunk(`${PAYLOAD_PREFIX}:xyz:3:2:data`)).toBeNull();
    expect(parseChunk(`${PAYLOAD_PREFIX}:xyz:a:2:data`)).toBeNull();
    expect(parseChunk(`${PAYLOAD_PREFIX}:xyz:1`)).toBeNull();
  });

  it('reads a well-formed header', () => {
    expect(parseChunk(`${PAYLOAD_PREFIX}:xyz789:2:3:AABB`)).toEqual({
      transferId: 'xyz789',
      index: 2,
      total: 3,
      data: 'AABB',
    });
  });
});

describe('ChunkCollector', () => {
  it('reports which codes are still missing', () => {
    const collector = new ChunkCollector();
    collector.add({ transferId: 't', index: 1, total: 3, data: 'a' });
    collector.add({ transferId: 't', index: 3, total: 3, data: 'c' });

    expect(collector.complete).toBe(false);
    expect(collector.received).toBe(2);
    expect(collector.expected).toBe(3);
    expect(collector.missing).toEqual([2]);
  });

  it('ignores a code scanned twice', () => {
    const collector = new ChunkCollector();
    collector.add({ transferId: 't', index: 1, total: 2, data: 'a' });
    collector.add({ transferId: 't', index: 1, total: 2, data: 'a' });
    expect(collector.received).toBe(1);
  });

  it('accepts the codes in any order', () => {
    const collector = new ChunkCollector();
    collector.add({ transferId: 't', index: 2, total: 2, data: 'b' });
    collector.add({ transferId: 't', index: 1, total: 2, data: 'a' });
    expect(collector.ordered()).toEqual(['a', 'b']);
  });

  it('starts over when a code from another dictation is scanned', () => {
    const collector = new ChunkCollector();
    collector.add({ transferId: 'first', index: 1, total: 2, data: 'a' });
    collector.add({ transferId: 'second', index: 1, total: 1, data: 'z' });

    expect(collector.complete).toBe(true);
    expect(collector.ordered()).toEqual(['z']);
  });
});

describe('decodeChunks', () => {
  it('refuses a payload that is not a dictation', () => {
    expect(() => decodeChunks(['not-base64-at-all'])).toThrow();
  });
});
