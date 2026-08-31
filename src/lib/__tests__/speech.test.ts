import { describe, expect, it } from 'vitest';
import { spellPunctuation } from '../speech';

describe('spellPunctuation', () => {
  it('says a trailing period out loud', () => {
    expect(spellPunctuation('près de la fenêtre.')).toBe('près de la fenêtre point');
  });

  it('says a comma out loud', () => {
    expect(spellPunctuation('dormait sur le fauteuil,')).toBe('dormait sur le fauteuil virgule');
  });

  it('names each mark the way a teacher dictates it', () => {
    expect(spellPunctuation('Quoi ?')).toBe("Quoi point d'interrogation");
    expect(spellPunctuation('Attention !')).toBe("Attention point d'exclamation");
    expect(spellPunctuation('deux choses : voici')).toBe('deux choses deux-points voici');
    expect(spellPunctuation('un ; puis')).toBe('un point-virgule puis');
    expect(spellPunctuation('Il attend...')).toBe('Il attend points de suspension');
    expect(spellPunctuation('Il attend…')).toBe('Il attend points de suspension');
  });

  it('reads out quotes and parentheses', () => {
    expect(spellPunctuation('«Bonjour»')).toBe('ouvrez les guillemets Bonjour fermez les guillemets');
    expect(spellPunctuation('(oui)')).toBe('ouvrez la parenthèse oui fermez la parenthèse');
  });

  it('leaves apostrophes and word hyphens alone — they are part of the spelling', () => {
    expect(spellPunctuation("l'école")).toBe("l'école");
    expect(spellPunctuation('peut-être')).toBe('peut-être');
    expect(spellPunctuation('3.5')).toBe('3.5');
  });

  it('handles a period tucked before a closing quote', () => {
    expect(spellPunctuation('fini.»')).toBe('fini point fermez les guillemets');
  });
});
