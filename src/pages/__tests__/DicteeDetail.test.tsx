import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import DicteeDetail from '../DicteeDetail';
import { getDictation, saveDictation } from '@/lib/db';
import type { Dictation } from '@/lib/types';

const SEGMENTS = ['Le petit chat', 'dormait sur le fauteuil,', 'près de la fenêtre.'];

function makeDictation(overrides: Partial<Dictation>): Dictation {
  return {
    id: 'detail-1',
    title: 'Dictée du lundi',
    createdAt: 1,
    updatedAt: 1,
    sourceText: SEGMENTS.join(' '),
    segments: SEGMENTS.map((text, index) => ({ id: `s${index}`, text })),
    speech: { rate: 0.85, repeatAfterMs: 0 },
    showWordCount: true,
    allowReveal: false,
    origin: 'created',
    ...overrides,
  };
}

function renderDetail(id: string) {
  return render(
    <MemoryRouter initialEntries={[`/dictee/${id}`]}>
      <Routes>
        <Route path="/dictee/:id" element={<DicteeDetail />} />
        <Route path="/eleve/:id" element={<p>mode élève</p>} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  // The QR panel is closed on arrival, but the page still imports the encoder.
  vi.stubGlobal('speechSynthesis', {
    cancel: vi.fn(),
    getVoices: () => [],
    speak: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });
});

describe('Écran enseignant', () => {
  it('opens for a dictation created on this device', async () => {
    await saveDictation(makeDictation({ id: 'created-1' }));
    renderDetail('created-1');

    expect(await screen.findByRole('button', { name: /Partager par QR/ })).toBeInTheDocument();
  });

  /**
   * The teacher screen shows the text in clear. A copy received by QR code
   * belongs to a pupil, so it must never open here — not even by typing the
   * address by hand.
   */
  it('sends a dictation received by QR code straight to pupil mode', async () => {
    await saveDictation(makeDictation({ id: 'received-1', sourceText: '', origin: 'received' }));
    const { container } = renderDetail('received-1');

    expect(await screen.findByText('mode élève')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Partager par QR/ })).not.toBeInTheDocument();
    for (const segment of SEGMENTS) {
      expect(container.innerHTML).not.toContain(segment);
    }
  });

  it('renames the dictation, the new name joining the save bar', async () => {
    const user = userEvent.setup();
    await saveDictation(makeDictation({ id: 'rename-1' }));
    renderDetail('rename-1');

    await user.click(await screen.findByRole('button', { name: 'Renommer la dictée' }));
    const field = await screen.findByLabelText('Nom de la dictée');
    await user.clear(field);
    await user.type(field, 'Les accords du participe');
    await user.click(screen.getByRole('button', { name: 'Renommer' }));

    expect(await screen.findAllByText('Les accords du participe')).not.toHaveLength(0);

    await user.click(screen.getByRole('button', { name: /Enregistrer/ }));
    await waitFor(async () => {
      expect((await getDictation('rename-1'))?.title).toBe('Les accords du participe');
    });
  });

  it('treats a dictation saved before the distinction existed as the teacher’s own', async () => {
    await saveDictation(makeDictation({ id: 'legacy-1', origin: undefined }));
    renderDetail('legacy-1');

    expect(await screen.findByRole('button', { name: /Partager par QR/ })).toBeInTheDocument();
  });
});
