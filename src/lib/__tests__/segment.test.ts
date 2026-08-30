import { describe, expect, it } from 'vitest';
import { countWords, segmentText, DEFAULT_SEGMENT_OPTIONS } from '../segment';

const opts = DEFAULT_SEGMENT_OPTIONS;

/** Every part must stay inside the teacher's word bounds (except a lone part). */
function expectWithinBounds(parts: string[], min = opts.minWords, max = opts.maxWords) {
  if (parts.length <= 1) return;
  for (const part of parts) {
    expect(countWords(part), `"${part}"`).toBeGreaterThanOrEqual(min);
    expect(countWords(part), `"${part}"`).toBeLessThanOrEqual(max);
  }
}

describe('countWords', () => {
  it('ignores lone punctuation tokens', () => {
    expect(countWords('« le chat »')).toBe(2);
    expect(countWords('')).toBe(0);
  });
});

describe('segmentText', () => {
  it('returns nothing for empty input', () => {
    expect(segmentText('')).toEqual([]);
    expect(segmentText('   \n  ')).toEqual([]);
  });

  it('keeps punctuation glued to the part it closes', () => {
    const parts = segmentText('Le chat dort, le chien joue.');
    expect(parts[0]).toMatch(/,$/);
    expect(parts[parts.length - 1]).toMatch(/\.$/);
  });

  it('breaks on commas and full stops', () => {
    const parts = segmentText('Il pleuvait fort, mais nous sommes sortis.');
    expect(parts.length).toBeGreaterThan(1);
    expect(parts.join(' ')).toBe('Il pleuvait fort, mais nous sommes sortis.');
  });

  it('never loses or reorders a single word', () => {
    const source =
      "Le petit chat noir dormait paisiblement sur le vieux fauteuil du salon, " +
      "pendant que la pluie tombait sans relâche.";
    expect(segmentText(source).join(' ')).toBe(source);
  });

  it('respects the maximum word count', () => {
    const parts = segmentText(
      'Le petit chat noir dormait paisiblement sur le vieux fauteuil rouge du salon.'
    );
    expectWithinBounds(parts);
  });

  it('honours custom bounds', () => {
    const source = 'Un jour le vent souffla si fort que les volets claquèrent longtemps.';
    const parts = segmentText(source, { minWords: 3, maxWords: 6 });
    expectWithinBounds(parts, 3, 6);
    expect(parts.join(' ')).toBe(source);
  });

  it('does not strand a linking word at the end of a part', () => {
    const parts = segmentText(
      'Le chat de la voisine grimpa sur le toit de la maison rouge.'
    );
    for (const part of parts) {
      const last = part.replace(/[.,;:!?…»]+$/, '').split(' ').pop()!.toLowerCase();
      expect(['le', 'la', 'les', 'de', 'du', 'des', 'un', 'une', 'sur', 'et']).not.toContain(last);
    }
  });

  it('merges a part that is too short into a neighbour', () => {
    // "Hier," is a single word — on its own it is not worth a button.
    const parts = segmentText('Hier, nous avons visité le musée.');
    expect(parts[0]).not.toBe('Hier,');
    expect(countWords(parts[0])).toBeGreaterThanOrEqual(opts.minWords);
    expectWithinBounds(parts);
  });

  it('keeps a very short whole text as one part', () => {
    expect(segmentText('Bonjour.')).toEqual(['Bonjour.']);
  });

  it('does not break on abbreviations', () => {
    const parts = segmentText('M. Dupont arriva très tôt.');
    expect(parts[0].startsWith('M. Dupont')).toBe(true);
  });

  it('does not break on initials', () => {
    const parts = segmentText('J. Ferry créa cette école.');
    expect(parts[0].startsWith('J. Ferry')).toBe(true);
  });

  it('does not break inside a decimal number', () => {
    const source = 'Le tube mesure 3,5 centimètres exactement.';
    const parts = segmentText(source);
    expect(parts.some((p) => p.includes('3,5'))).toBe(true);
    expect(parts.join(' ')).toBe(source);
  });

  it('breaks on the other strong punctuation marks', () => {
    for (const source of [
      'Où vas-tu ? Je rentre chez moi.',
      "Quelle chance ! Nous avons gagné la partie.",
      'Il fit une pause ; puis il reprit sa lecture.',
      'Voici la liste : du pain, du lait, des œufs.',
    ]) {
      const parts = segmentText(source);
      expect(parts.length).toBeGreaterThan(1);
      expect(parts.join(' ')).toBe(source);
      expectWithinBounds(parts);
    }
  });

  it('handles a long text with no punctuation at all', () => {
    const source = 'un deux trois quatre cinq six sept huit neuf dix onze douze';
    const parts = segmentText(source);
    expect(parts.join(' ')).toBe(source);
    expectWithinBounds(parts);
  });

  it('normalises line breaks and repeated spaces', () => {
    expect(segmentText('Le chat\n\n  dort   déjà.')).toEqual(['Le chat dort déjà.']);
  });

  it('keeps quotation marks with their part', () => {
    const source = '« Bonjour », dit le petit garçon poliment.';
    expect(segmentText(source).join(' ')).toBe(source);
  });

  it('is stable: segmenting the joined output again changes nothing', () => {
    const source =
      'Le vieux marin racontait ses voyages, les enfants écoutaient sans bouger, ' +
      'puis la nuit tomba doucement sur le port.';
    const once = segmentText(source);
    expect(segmentText(once.join(' '))).toEqual(once);
  });
});
