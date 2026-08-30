import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ModeEleve from '../ModeEleve';
import { clearProgress, getProgress, saveDictation } from '@/lib/db';
import type { Dictation } from '@/lib/types';

const SEGMENTS = ['Le petit chat', 'dormait sur le fauteuil,', 'près de la fenêtre.'];

const dictation: Dictation = {
  id: 'test-1',
  title: 'Dictée du lundi',
  createdAt: 1,
  updatedAt: 1,
  sourceText: SEGMENTS.join(' '),
  segments: SEGMENTS.map((text, index) => ({ id: `s${index}`, text })),
  speech: { rate: 0.85, repeatAfterMs: 0 },
  showWordCount: true,
  allowReveal: false,
};

const spoken: string[] = [];

function renderPupilScreen() {
  return render(
    <MemoryRouter initialEntries={[`/eleve/${dictation.id}`]}>
      <Routes>
        <Route path="/eleve/:id" element={<ModeEleve />} />
        <Route path="/dictee/:id" element={<p>écran enseignant</p>} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(async () => {
  spoken.length = 0;
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
  await saveDictation(dictation);
  // fake-indexeddb is shared across the tests in this file: a pupil's progress
  // from the previous test would otherwise leak into the next one.
  await clearProgress(dictation.id);
});

describe('Mode élève', () => {
  it('shows one numbered button per part', async () => {
    renderPupilScreen();
    expect(await screen.findByText('Partie 1')).toBeInTheDocument();
    expect(screen.getByText('Partie 2')).toBeInTheDocument();
    expect(screen.getByText('Partie 3')).toBeInTheDocument();
  });

  /**
   * The whole point of the tool: this is a dictation. If the text reaches the
   * DOM the pupil can read it instead of writing it, and the exercise is void.
   */
  it('never puts the text of a part in the DOM', async () => {
    const { container } = renderPupilScreen();
    await screen.findByText('Partie 1');

    const markup = container.innerHTML;
    for (const segment of SEGMENTS) {
      expect(markup).not.toContain(segment);
    }
    for (const word of ['chat', 'fauteuil', 'fenêtre', 'dormait']) {
      expect(markup).not.toContain(word);
    }
  });

  it('shows the word count without revealing the words', async () => {
    renderPupilScreen();
    expect(await screen.findByText('3 mots')).toBeInTheDocument();
  });

  it('speaks the part when its button is tapped, and again on a second tap', async () => {
    const user = userEvent.setup();
    renderPupilScreen();

    await user.click(await screen.findByRole('button', { name: /Écouter la partie 1/ }));
    expect(spoken).toEqual([SEGMENTS[0]]);

    await user.click(screen.getByRole('button', { name: /Écouter la partie 1/ }));
    expect(spoken).toEqual([SEGMENTS[0], SEGMENTS[0]]);
  });

  it('marks a part as listened and remembers it', async () => {
    const user = userEvent.setup();
    renderPupilScreen();

    await user.click(await screen.findByRole('button', { name: /Écouter la partie 2/ }));

    expect(
      await screen.findByRole('button', { name: /Écouter la partie 2, déjà écoutée/ })
    ).toBeInTheDocument();
    await waitFor(async () => {
      expect((await getProgress(dictation.id)).listened).toContain('s1');
    });
  });

  it('tracks progress towards the whole dictation', async () => {
    const user = userEvent.setup();
    renderPupilScreen();

    const bar = await screen.findByRole('progressbar', { name: 'Progression de la dictée' });
    expect(bar).toHaveAttribute('aria-valuenow', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '3');

    await user.click(screen.getByRole('button', { name: /Écouter la partie 1/ }));
    await waitFor(() => expect(bar).toHaveAttribute('aria-valuenow', '1'));
  });

  it('congratulates the pupil once every part has been heard', async () => {
    const user = userEvent.setup();
    renderPupilScreen();

    for (const index of [1, 2, 3]) {
      await user.click(
        await screen.findByRole('button', { name: new RegExp(`Écouter la partie ${index}`) })
      );
    }

    expect(await screen.findByText(/Bravo/)).toBeInTheDocument();
  });

  it('offers no plain way back to the teacher screen', async () => {
    renderPupilScreen();
    await screen.findByText('Partie 1');

    // The only exit is the lock, which needs a two-second press.
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Quitter le mode élève \(appui long/ })
    ).toBeInTheDocument();
  });
});
