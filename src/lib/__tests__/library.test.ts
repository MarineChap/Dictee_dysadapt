import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import {
  getDictation,
  getProgress,
  listDictations,
  resetDbForTests,
  saveDictation,
  saveProgress,
} from '../db';
import { addToAccount, loadLibrary, localOnly, removeFromLibrary, saveToLibrary } from '../library';
import { fetchAccount } from '../account';
import type { RemoteDictation } from '../remote';
import type { Dictation } from '../types';

const ME = { id: 'user-1' };
const UUID_A = '11111111-1111-4111-8111-111111111111';
const UUID_B = '22222222-2222-4222-8222-222222222222';

function dictation(overrides: Partial<Dictation> = {}): Dictation {
  return {
    id: UUID_A,
    title: 'Le chat',
    createdAt: Date.parse('2026-10-06T09:00:00Z'),
    updatedAt: Date.parse('2026-10-06T09:00:00Z'),
    sourceText: 'Le chat dort.',
    segments: [{ id: 's0', text: 'Le chat dort.' }],
    speech: { rate: 0.85, repeatAfterMs: 0, speakPunctuation: true },
    showWordCount: true,
    allowReveal: false,
    ...overrides,
  };
}

/** DysAdapt's dictation API, in memory. `online = false` makes every call fail. */
const server = {
  online: true,
  dictations: new Map<string, RemoteDictation>(),
  calls: [] as string[],
};

function remote(d: Dictation): RemoteDictation {
  return {
    id: d.id,
    title: d.title,
    source_text: d.sourceText,
    segments: d.segments,
    speech: { rate: d.speech.rate, voice_uri: null, repeat_after_ms: 0, speak_punctuation: true },
    show_word_count: d.showWordCount,
    allow_reveal: d.allowReveal,
    created_at: new Date(d.createdAt).toISOString(),
    updated_at: new Date(d.updatedAt).toISOString(),
  };
}

function json(body: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(body), { status }));
}

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
  resetDbForTests();
  localStorage.clear();
  server.online = true;
  server.dictations.clear();
  server.calls.length = 0;

  vi.stubGlobal('fetch', (url: string, init: RequestInit = {}) => {
    const method = init.method ?? 'GET';
    server.calls.push(`${method} ${url}`);
    if (!server.online) return Promise.reject(new TypeError('Failed to fetch'));
    const id = url.match(/\/dictations\/([^/]+)$/)?.[1];
    if (method === 'GET' && url.endsWith('/dictations'))
      return json([...server.dictations.values()]);
    if (method === 'PUT' && id) {
      const saved = { id, ...JSON.parse(String(init.body)) } as RemoteDictation;
      server.dictations.set(id, saved);
      return json(saved);
    }
    if (method === 'DELETE' && id) {
      server.dictations.delete(id);
      return Promise.resolve(new Response(null, { status: 204 }));
    }
    return json({ detail: 'not found' }, 404);
  });
});

describe('without an account', () => {
  it('keeps everything on the device and never calls a server', async () => {
    await saveToLibrary(dictation(), null);

    expect(await loadLibrary(null)).toHaveLength(1);
    expect(server.calls).toEqual([]);
  });
});

describe('with an account', () => {
  it('saves a dictation in the account too', async () => {
    const saved = await saveToLibrary(dictation(), ME);

    expect(saved.ownerId).toBe(ME.id);
    expect(server.dictations.get(UUID_A)?.source_text).toBe('Le chat dort.');
  });

  it('shows the dictations made on another device, and drops the ones deleted there', async () => {
    await saveToLibrary(dictation({ id: UUID_A, imageId: 'photo-a' }), ME);
    server.dictations.delete(UUID_A); // deleted on another device
    server.dictations.set(UUID_B, remote(dictation({ id: UUID_B, title: 'Faite ailleurs' })));

    const shown = await loadLibrary(ME);

    expect(shown.map((d) => d.title)).toEqual(['Faite ailleurs']);
    expect(shown[0].ownerId).toBe(ME.id);
  });

  it('keeps the photo of this device on a dictation updated elsewhere', async () => {
    await saveToLibrary(dictation({ imageId: 'photo-a' }), ME);
    server.dictations.set(UUID_A, {
      ...server.dictations.get(UUID_A)!,
      title: 'Renommée ailleurs',
    });

    const [shown] = await loadLibrary(ME);

    expect(shown.title).toBe('Renommée ailleurs');
    expect(shown.imageId).toBe('photo-a');
  });

  it('sends what was saved offline once the network is back', async () => {
    server.online = false;
    await saveToLibrary(dictation({ title: 'Écrite hors ligne' }), ME);
    expect(server.dictations.size).toBe(0);

    server.online = true;
    const shown = await loadLibrary(ME);

    expect(server.dictations.get(UUID_A)?.title).toBe('Écrite hors ligne');
    expect(shown.map((d) => d.title)).toEqual(['Écrite hors ligne']);
  });

  it('keeps showing the device copy when offline', async () => {
    await saveToLibrary(dictation(), ME);
    server.online = false;

    expect((await loadLibrary(ME)).map((d) => d.id)).toEqual([UUID_A]);
  });

  it('deletes from the account, now or once back online', async () => {
    const saved = await saveToLibrary(dictation(), ME);
    server.online = false;
    await removeFromLibrary(saved);
    expect(server.dictations.has(UUID_A)).toBe(true);

    server.online = true;
    await loadLibrary(ME);

    expect(server.dictations.has(UUID_A)).toBe(false);
    expect(await getDictation(UUID_A)).toBeUndefined();
  });

  it("removes another teacher's dictations from a shared device", async () => {
    await saveToLibrary(dictation({ id: UUID_A }), { id: 'someone-else' });
    await saveToLibrary(dictation({ id: UUID_B, title: 'Locale' }), null);

    const shown = await loadLibrary(null);

    expect(shown.map((d) => d.title)).toEqual(['Locale']);
  });

  it('never sends a dictation received from a QR code', async () => {
    const saved = await saveToLibrary(dictation({ imported: true }), ME);

    expect(saved.ownerId).toBeUndefined();
    expect(server.calls).toEqual([]);
  });
});

describe('adding the device dictations to the account', () => {
  it('gives an old short id a UUID and moves its progress', async () => {
    await saveDictation(dictation({ id: 'abc123defg' }));
    await saveProgress({ dictationId: 'abc123defg', listened: ['s0'], updatedAt: 0 });
    await saveDictation(dictation({ id: UUID_B, imported: true, title: 'Reçue par QR' }));

    const local = await listDictations();
    expect(localOnly(local).map((d) => d.id)).toEqual(['abc123defg']);
    await addToAccount(local, ME);

    const [moved] = [...server.dictations.values()];
    expect(server.dictations.size).toBe(1);
    expect(moved.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(await getDictation('abc123defg')).toBeUndefined();
    expect((await getProgress(moved.id)).listened).toEqual(['s0']);
    expect((await getDictation(moved.id))?.ownerId).toBe(ME.id);
  });
});

describe('fetchAccount', () => {
  it('reads the signed-in teacher from the DysAdapt session', async () => {
    vi.stubGlobal('fetch', () => json({ user: { id: 'user-1', email: 'prof@ecole.fr' } }));
    expect(await fetchAccount()).toEqual({ id: 'user-1', email: 'prof@ecole.fr' });
  });

  it('treats a session that could not be refreshed as signed out', async () => {
    vi.stubGlobal('fetch', () => json({ user: { id: 'user-1' }, error: 'RefreshAccessTokenError' }));
    expect(await fetchAccount()).toBeNull();
  });

  it('finds no account when no DysAdapt answers (index.html instead of JSON)', async () => {
    vi.stubGlobal('fetch', () => Promise.resolve(new Response('<!doctype html>', { status: 200 })));
    expect(await fetchAccount()).toBeNull();
  });

  it('keeps the last account seen while offline, and forgets it once signed out', async () => {
    vi.stubGlobal('fetch', () => json({ user: { id: 'user-1' } }));
    await fetchAccount();

    vi.stubGlobal('fetch', () => Promise.reject(new TypeError('offline')));
    expect(await fetchAccount()).toEqual({ id: 'user-1' });

    vi.stubGlobal('fetch', () => json({}));
    expect(await fetchAccount()).toBeNull();
  });
});
