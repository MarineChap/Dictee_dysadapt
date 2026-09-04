import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BREATH_PAUSE_MS, cancelSpeech, speak, speechChunks, spellPunctuation } from '../speech';

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
    expect(spellPunctuation('«Bonjour»')).toBe(
      'ouvrez les guillemets Bonjour fermez les guillemets'
    );
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

describe('speechChunks', () => {
  it('cuts the segment just before each spoken mark', () => {
    expect(speechChunks('dormait sur le fauteuil,')).toEqual([
      'dormait sur le fauteuil',
      'virgule',
    ]);
    expect(speechChunks('près de la fenêtre.')).toEqual(['près de la fenêtre', 'point']);
  });

  it('keeps a segment without punctuation in one piece', () => {
    expect(speechChunks('Le petit chat')).toEqual(['Le petit chat']);
  });

  it('reads the words that follow a mark on with it', () => {
    expect(speechChunks('Il dit : bonjour')).toEqual(['Il dit', 'deux-points bonjour']);
  });

  it('leaves the text whole when the marks are not spoken', () => {
    expect(speechChunks('dormait sur le fauteuil,', false)).toEqual(['dormait sur le fauteuil,']);
  });
});

/**
 * The reading is paced, not chopped: the mark is announced after a breath, the
 * way a teacher dictates, and the part only counts as read once it is over.
 */
describe('speak', () => {
  let spoken: string[] = [];

  beforeEach(() => {
    vi.useFakeTimers();
    spoken = [];
    vi.stubGlobal('speechSynthesis', {
      cancel: vi.fn(),
      getVoices: () => [],
      speak: (utterance: SpeechSynthesisUtterance) => {
        spoken.push(utterance.text);
        utterance.onend?.(new Event('end') as SpeechSynthesisEvent);
      },
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
    vi.stubGlobal(
      'SpeechSynthesisUtterance',
      class {
        text: string;
        lang = '';
        rate = 1;
        voice: unknown = null;
        onend: ((event: Event) => void) | null = null;
        onerror: ((event: Event) => void) | null = null;
        constructor(text: string) {
          this.text = text;
        }
      }
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('waits a breath before naming the mark', () => {
    speak('dormait sur le fauteuil,', { rate: 1 });
    expect(spoken).toEqual(['dormait sur le fauteuil']);

    vi.advanceTimersByTime(BREATH_PAUSE_MS - 1);
    expect(spoken).toEqual(['dormait sur le fauteuil']);

    vi.advanceTimersByTime(1);
    expect(spoken).toEqual(['dormait sur le fauteuil', 'virgule']);
  });

  it('pauses for longer when the dictation is read slowly', () => {
    speak('près de la fenêtre.', { rate: 0.5 });
    vi.advanceTimersByTime(BREATH_PAUSE_MS);
    expect(spoken).toEqual(['près de la fenêtre']);

    vi.advanceTimersByTime(BREATH_PAUSE_MS);
    expect(spoken).toEqual(['près de la fenêtre', 'point']);
  });

  it('reports the end only once the mark has been read', () => {
    const onEnd = vi.fn();
    speak('près de la fenêtre.', { rate: 1, onEnd });
    expect(onEnd).not.toHaveBeenCalled();

    vi.advanceTimersByTime(BREATH_PAUSE_MS);
    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it('drops the rest of the reading when it is cancelled mid-breath', () => {
    const onEnd = vi.fn();
    speak('près de la fenêtre.', { rate: 1, onEnd });
    cancelSpeech();

    vi.advanceTimersByTime(BREATH_PAUSE_MS * 4);
    expect(spoken).toEqual(['près de la fenêtre']);
    expect(onEnd).not.toHaveBeenCalled();
  });

  it('starts over rather than overlapping when a part is replayed', () => {
    speak('près de la fenêtre.', { rate: 1 });
    speak('près de la fenêtre.', { rate: 1 });

    vi.advanceTimersByTime(BREATH_PAUSE_MS);
    expect(spoken).toEqual(['près de la fenêtre', 'près de la fenêtre', 'point']);
  });

  it('speaks a segment without punctuation in one go', () => {
    const onEnd = vi.fn();
    speak('Le petit chat', { rate: 1, onEnd });

    expect(spoken).toEqual(['Le petit chat']);
    expect(onEnd).toHaveBeenCalledTimes(1);
  });
});
