/**
 * The teacher's library, on this device and — when signed in — in the account.
 *
 * Saved like a DysAdapt document: the account holds the dictation, the last
 * save wins, a deletion is final. IndexedDB keeps a copy so that everything
 * still works offline; what could not reach the account is sent once the
 * network is back. With no account, nothing here talks to any server.
 */
import type { Account } from './account';
import {
  deleteDictation,
  getDictation,
  listDictations,
  putDictation,
  rekeyDictation,
  saveDictation,
} from './db';
import { isUuid, newDictationId } from './ids';
import { deleteRemote, fromRemote, listRemote, putRemote } from './remote';
import type { Dictation } from './types';

const PENDING_KEY = 'dictadapt.pending';

/** What still has to reach the account, by dictation id. */
type Pending = Record<string, 'put' | 'delete'>;

function readPending(): Pending {
  try {
    return JSON.parse(localStorage.getItem(PENDING_KEY) ?? '{}') as Pending;
  } catch {
    return {};
  }
}

function writePending(pending: Pending): void {
  try {
    if (Object.keys(pending).length) localStorage.setItem(PENDING_KEY, JSON.stringify(pending));
    else localStorage.removeItem(PENDING_KEY);
  } catch {
    // Storage blocked: the change is still on the device, just not queued.
  }
}

function markPending(id: string, op: 'put' | 'delete'): void {
  writePending({ ...readPending(), [id]: op });
}

function clearPending(id: string): void {
  const pending = readPending();
  delete pending[id];
  writePending(pending);
}

/** Sends what was saved or deleted offline. Stops at the first failure. */
async function flushPending(): Promise<void> {
  for (const [id, op] of Object.entries(readPending())) {
    if (op === 'delete') {
      await deleteRemote(id);
    } else {
      const dictation = await getDictation(id);
      if (dictation?.ownerId) await putRemote(dictation);
    }
    clearPending(id);
  }
}

/**
 * Removes the copies of any other account's dictations: on a shared classroom
 * computer, the next teacher must not see them. They are safe in their account.
 */
async function dropOtherAccounts(ownerId: string | null): Promise<void> {
  const others = (await listDictations()).filter((d) => d.ownerId && d.ownerId !== ownerId);
  if (others.length) writePending({});
  await Promise.all(others.map((d) => deleteDictation(d.id)));
}

/** Makes the device's copy match the account (dictations made or deleted elsewhere). */
async function mirror(ownerId: string): Promise<void> {
  const remote = await listRemote();
  const local = new Map((await listDictations()).map((d) => [d.id, d]));
  const pending = readPending();
  const remoteIds = new Set(remote.map((r) => r.id));

  for (const dictation of local.values()) {
    if (dictation.ownerId === ownerId && !remoteIds.has(dictation.id) && !pending[dictation.id]) {
      await deleteDictation(dictation.id);
    }
  }
  for (const r of remote) {
    if (pending[r.id]) continue; // a local change still on its way wins
    await putDictation(fromRemote(r, ownerId, local.get(r.id)?.imageId));
  }
}

/** The dictations to show: this device's own, plus the account's when signed in. */
export async function loadLibrary(account: Account | null): Promise<Dictation[]> {
  await dropOtherAccounts(account?.id ?? null);
  if (account) {
    try {
      await flushPending();
      await mirror(account.id);
    } catch {
      // Offline or DysAdapt unreachable: the copy on this device stands in.
    }
  }
  return listDictations();
}

async function push(dictation: Dictation): Promise<void> {
  try {
    await putRemote(dictation);
    clearPending(dictation.id);
  } catch {
    markPending(dictation.id, 'put');
  }
}

/**
 * Saves a teacher's dictation: on the device, and in the account when signed
 * in. Dictations received from a pupil-side QR code or file stay local.
 */
export async function saveToLibrary(
  dictation: Dictation,
  account: Account | null
): Promise<Dictation> {
  const owned = account && !dictation.imported ? { ...dictation, ownerId: account.id } : dictation;
  const saved = await saveDictation(owned);
  if (saved.ownerId) await push(saved);
  return saved;
}

export async function removeFromLibrary(dictation: Dictation): Promise<void> {
  await deleteDictation(dictation.id);
  if (!dictation.ownerId) return;
  try {
    await deleteRemote(dictation.id);
    clearPending(dictation.id);
  } catch {
    markPending(dictation.id, 'delete');
  }
}

/** Dictations made on this device before signing in, which the teacher may add. */
export function localOnly(dictations: Dictation[]): Dictation[] {
  return dictations.filter((d) => !d.ownerId && !d.imported);
}

/** Adds this device's dictations to the account (the teacher agreed to it). */
export async function addToAccount(dictations: Dictation[], account: Account): Promise<void> {
  for (const dictation of localOnly(dictations)) {
    let owned: Dictation = { ...dictation, ownerId: account.id };
    if (!isUuid(dictation.id)) {
      owned = { ...owned, id: newDictationId() };
      await rekeyDictation(dictation.id, owned);
    } else {
      await putDictation(owned);
    }
    await push(owned);
  }
}
