import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Accueil from '../Accueil';
import { deleteDictation, getDictation, listDictations, saveDictation } from '@/lib/db';
import type { Dictation } from '@/lib/types';

function makeDictation(overrides: Partial<Dictation>): Dictation {
  return {
    id: 'lib-1',
    title: 'Dictée du lundi',
    createdAt: 1,
    updatedAt: 1,
    sourceText: 'Le petit chat dormait.',
    segments: [{ id: 's0', text: 'Le petit chat' }],
    speech: { rate: 0.85, repeatAfterMs: 0 },
    showWordCount: true,
    allowReveal: false,
    origin: 'created',
    ...overrides,
  };
}

function renderLibrary() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<Accueil />} />
        <Route path="/eleve/:id" element={<p>mode élève</p>} />
        <Route path="/dictee/:id" element={<p>écran enseignant</p>} />
      </Routes>
    </MemoryRouter>
  );
}

async function renameTo(from: string, to: string) {
  const user = userEvent.setup();
  await user.click(await screen.findByRole('button', { name: `Renommer ${from}` }));

  const field = await screen.findByLabelText('Nom de la dictée');
  await user.clear(field);
  await user.type(field, to);
  await user.click(screen.getByRole('button', { name: 'Renommer' }));
}

beforeEach(async () => {
  // fake-indexeddb is shared across the tests in this file.
  for (const stored of await listDictations()) await deleteDictation(stored.id);
});

describe('Bibliothèque', () => {
  it('renames a dictation created on this device', async () => {
    await saveDictation(makeDictation({ id: 'created-1' }));
    renderLibrary();

    await renameTo('Dictée du lundi', 'Les accords du participe');

    expect(await screen.findByText('Les accords du participe')).toBeInTheDocument();
    await waitFor(async () => {
      expect((await getDictation('created-1'))?.title).toBe('Les accords du participe');
    });
  });

  /**
   * A pupil never reaches the teacher screen, so the library is their only way
   * to name the copy they were handed — hence renaming lives here.
   */
  it('renames a dictation received by QR code', async () => {
    await saveDictation(
      makeDictation({ id: 'received-1', title: 'Dictée reçue', sourceText: '', origin: 'received' })
    );
    renderLibrary();

    await renameTo('Dictée reçue', 'Dictée du 12 mars');

    expect(await screen.findByText('Dictée du 12 mars')).toBeInTheDocument();
    await waitFor(async () => {
      const stored = await getDictation('received-1');
      expect(stored?.title).toBe('Dictée du 12 mars');
      // Renaming must not turn a pupil's copy into a teacher's own.
      expect(stored?.origin).toBe('received');
    });
  });

  it('refuses an empty name rather than leaving an unidentifiable card', async () => {
    const user = userEvent.setup();
    await saveDictation(makeDictation({ id: 'created-2' }));
    renderLibrary();

    await user.click(await screen.findByRole('button', { name: 'Renommer Dictée du lundi' }));
    await user.clear(await screen.findByLabelText('Nom de la dictée'));

    expect(screen.getByRole('button', { name: 'Renommer' })).toBeDisabled();
  });

  it('keeps the name when the rename is cancelled', async () => {
    const user = userEvent.setup();
    await saveDictation(makeDictation({ id: 'created-3' }));
    renderLibrary();

    await user.click(await screen.findByRole('button', { name: 'Renommer Dictée du lundi' }));
    await user.type(await screen.findByLabelText('Nom de la dictée'), ' bis');
    await user.click(screen.getByRole('button', { name: 'Annuler' }));

    expect(screen.getByText('Dictée du lundi')).toBeInTheDocument();
    expect((await getDictation('created-3'))?.title).toBe('Dictée du lundi');
  });
});
