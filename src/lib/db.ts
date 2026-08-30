/**
 * Local-only persistence. There is no server, no account and no sync: a
 * dictation lives in the browser (or the APK's WebView) of the device it was
 * created on, and travels to the pupil's device as a QR code.
 *
 * IndexedDB rather than localStorage because we store the source photo as a
 * Blob, and v2 will add one recorded audio Blob per segment.
 */
import { openDB, type IDBPDatabase } from 'idb';
import type { Dictation, Progress } from './types';

const DB_NAME = 'dictadapt';
const DB_VERSION = 1;

export const STORE_DICTATIONS = 'dictations';
export const STORE_BLOBS = 'blobs';
export const STORE_PROGRESS = 'progress';

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_DICTATIONS)) {
          const store = db.createObjectStore(STORE_DICTATIONS, { keyPath: 'id' });
          store.createIndex('updatedAt', 'updatedAt');
        }
        if (!db.objectStoreNames.contains(STORE_BLOBS)) {
          db.createObjectStore(STORE_BLOBS);
        }
        if (!db.objectStoreNames.contains(STORE_PROGRESS)) {
          db.createObjectStore(STORE_PROGRESS, { keyPath: 'dictationId' });
        }
      },
    });
  }
  return dbPromise;
}

/** Test seam: drops the cached connection so fake-indexeddb can start clean. */
export function resetDbForTests(): void {
  dbPromise = null;
}

/** Most recently updated first — the teacher's newest dictation is on top. */
export async function listDictations(): Promise<Dictation[]> {
  const db = await getDb();
  const all = (await db.getAll(STORE_DICTATIONS)) as Dictation[];
  return all.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getDictation(id: string): Promise<Dictation | undefined> {
  const db = await getDb();
  return (await db.get(STORE_DICTATIONS, id)) as Dictation | undefined;
}

export async function saveDictation(dictation: Dictation): Promise<Dictation> {
  const db = await getDb();
  const stamped = { ...dictation, updatedAt: Date.now() };
  await db.put(STORE_DICTATIONS, stamped);
  return stamped;
}

/** Removes the dictation together with its photo and the pupil's progress. */
export async function deleteDictation(id: string): Promise<void> {
  const db = await getDb();
  const existing = (await db.get(STORE_DICTATIONS, id)) as Dictation | undefined;
  const tx = db.transaction([STORE_DICTATIONS, STORE_BLOBS, STORE_PROGRESS], 'readwrite');
  await Promise.all([
    tx.objectStore(STORE_DICTATIONS).delete(id),
    tx.objectStore(STORE_PROGRESS).delete(id),
    existing?.imageId ? tx.objectStore(STORE_BLOBS).delete(existing.imageId) : Promise.resolve(),
    tx.done,
  ]);
}

export async function putBlob(key: string, blob: Blob): Promise<void> {
  const db = await getDb();
  await db.put(STORE_BLOBS, blob, key);
}

export async function getBlob(key: string): Promise<Blob | undefined> {
  const db = await getDb();
  return (await db.get(STORE_BLOBS, key)) as Blob | undefined;
}

export async function deleteBlob(key: string): Promise<void> {
  const db = await getDb();
  await db.delete(STORE_BLOBS, key);
}

export async function getProgress(dictationId: string): Promise<Progress> {
  const db = await getDb();
  const stored = (await db.get(STORE_PROGRESS, dictationId)) as Progress | undefined;
  return stored ?? { dictationId, listened: [], updatedAt: 0 };
}

export async function saveProgress(progress: Progress): Promise<void> {
  const db = await getDb();
  await db.put(STORE_PROGRESS, { ...progress, updatedAt: Date.now() });
}

export async function clearProgress(dictationId: string): Promise<void> {
  const db = await getDb();
  await db.delete(STORE_PROGRESS, dictationId);
}
