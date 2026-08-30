import { describe, expect, it } from 'vitest';
import { cleanOcrText } from '../ocr';

describe('cleanOcrText', () => {
  it('rejoins a sentence wrapped across two lines', () => {
    expect(cleanOcrText('Le petit chat noir\ndormait sur le fauteuil.')).toBe(
      'Le petit chat noir dormait sur le fauteuil.'
    );
  });

  it('undoes hyphenation at a line break', () => {
    expect(cleanOcrText('Il chantait une chan-\nson très douce.')).toBe(
      'Il chantait une chanson très douce.'
    );
  });

  it('keeps an exercise heading on its own line', () => {
    // The teacher deletes it in the verification step; gluing it to the text
    // would hide it in the middle of the first part.
    expect(cleanOcrText('Dictée n° 4 — CE2\nLe chat dort.')).toBe('Dictée n° 4 — CE2\nLe chat dort.');
  });

  it('keeps a sentence boundary as a line break', () => {
    expect(cleanOcrText('Le chat dort.\nLe chien joue.')).toBe('Le chat dort.\nLe chien joue.');
  });

  it('restores French spacing around double punctuation', () => {
    expect(cleanOcrText('Où vas-tu ?')).toBe('Où vas-tu ?');
    expect(cleanOcrText('Où vas-tu?')).toBe('Où vas-tu ?');
    expect(cleanOcrText('Attention!')).toBe('Attention !');
  });

  it('does not insert a space before a comma or a full stop', () => {
    expect(cleanOcrText('Le chat , qui dormait .')).toBe('Le chat, qui dormait.');
  });

  it('normalises spacing inside French quotation marks', () => {
    expect(cleanOcrText('«Bonjour»')).toBe('« Bonjour »');
  });

  it('collapses runs of spaces and blank lines', () => {
    expect(cleanOcrText('Le   chat\n\n\nLe chien dort.')).toBe('Le chat\nLe chien dort.');
  });

  it('drops carriage returns and trailing whitespace', () => {
    expect(cleanOcrText('  Le chat dort.  \r\n')).toBe('Le chat dort.');
  });

  it('returns an empty string for empty input', () => {
    expect(cleanOcrText('   \n\n  ')).toBe('');
  });
});
