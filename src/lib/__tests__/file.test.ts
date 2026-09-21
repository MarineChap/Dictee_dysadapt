import { describe, expect, it } from 'vitest';
import {
  FILE_FORMAT,
  decodeDictationFile,
  dictationFileName,
  encodeDictationFile,
} from '../file';
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

describe('encode/decode round trip', () => {
  it('preserves the title, segments and reading settings', () => {
    const dictation = makeDictation(['Le chat dort,', 'le chien joue.']);
    const imported = decodeDictationFile(encodeDictationFile(dictation));

    expect(imported.title).toBe('Dictée du lundi');
    expect(imported.segments).toEqual(['Le chat dort,', 'le chien joue.']);
    expect(imported.speech).toEqual({ rate: 0.7, repeatAfterMs: 3000 });
    expect(imported.showWordCount).toBe(false);
    expect(imported.allowReveal).toBe(true);
  });

  it('keeps accents and French quotation marks intact', () => {
    const segments = ['« Où étais-tu ? »', "j'ai répondu très vite,", 'à cause de l’orage.'];
    const imported = decodeDictationFile(encodeDictationFile(makeDictation(segments)));
    expect(imported.segments).toEqual(segments);
  });

  it('carries the speak-punctuation flag', () => {
    const base = makeDictation(['Le chat dort.']);
    const on = { ...base, speech: { ...base.speech, speakPunctuation: true } };
    const off = { ...base, speech: { ...base.speech, speakPunctuation: false } };
    expect(decodeDictationFile(encodeDictationFile(on)).speech.speakPunctuation).toBe(true);
    expect(decodeDictationFile(encodeDictationFile(off)).speech.speakPunctuation).toBe(false);
  });

  it('never writes the dictation text in clear — a pupil cannot read the file', () => {
    // The whole point: opening the file in a text editor must not reveal the words.
    const text = encodeDictationFile(makeDictation(['Le chat dort,', 'le chien joue.']));
    expect(text).not.toContain('chat');
    expect(text).not.toContain('chien');
    expect(text).not.toContain('joue');
  });

  it('never writes the source photo to the file', () => {
    const text = encodeDictationFile(makeDictation(['Le chat dort.']));
    expect(text).not.toContain('photo-');
  });

  it('is valid JSON with an application/json-friendly envelope', () => {
    const text = encodeDictationFile(makeDictation(['Le chat dort.']));
    const parsed = JSON.parse(text);
    expect(parsed.format).toBe(FILE_FORMAT);
    expect(typeof parsed.data).toBe('string');
  });
});

describe('dictationFileName', () => {
  it('slugifies the title and adds the .json extension', () => {
    expect(dictationFileName(makeDictation([], 'Dictée du lundi'))).toBe('dictee-du-lundi.json');
    expect(dictationFileName(makeDictation([], 'L’orage !'))).toBe('l-orage.json');
  });

  it('falls back to a default name when the title has no usable characters', () => {
    expect(dictationFileName(makeDictation([], '???'))).toBe('dictee.json');
  });
});

describe('decodeDictationFile', () => {
  it('rejects text that is not JSON', () => {
    expect(() => decodeDictationFile('not json at all')).toThrow();
  });

  it('rejects JSON that is not one of ours', () => {
    expect(() => decodeDictationFile('{"hello":"world"}')).toThrow();
    expect(() => decodeDictationFile(JSON.stringify({ format: 'other', data: 'x' }))).toThrow();
  });

  it('rejects a file whose payload is corrupt', () => {
    expect(() =>
      decodeDictationFile(JSON.stringify({ format: FILE_FORMAT, data: 'not-base64-at-all' }))
    ).toThrow('abîmé');
  });
});
