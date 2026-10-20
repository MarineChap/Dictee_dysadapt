/**
 * The DysAdapt API, reached through DysAdapt's same-origin proxy
 * (`/api/backend/*`), which adds the session's token server-side.
 *
 * Only ever called for a signed-in teacher (see account.ts and library.ts),
 * except a locker's dictation, which a student also opens with the access code
 * kept on their device: that goes through DysAdapt's student proxy
 * (`/api/eleve/*`), which adds the code from its httpOnly cookie.
 */
import type { Dictation } from './types';

const API = '/api/backend/services';
const STUDENT_API = '/api/eleve';

export class RemoteError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(`DysAdapt API answered ${status}`);
    this.status = status;
  }
}

/** A dictation as the API speaks it: snake_case, ISO dates, no photo. */
export interface RemoteDictation {
  id: string;
  title: string;
  source_text: string;
  segments: { id: string; text: string }[];
  speech: {
    rate: number;
    voice_uri: string | null;
    repeat_after_ms: number;
    speak_punctuation: boolean | null;
  };
  show_word_count: boolean;
  allow_reveal: boolean;
  created_at: string;
  updated_at: string;
}

async function request<T>(url: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...init.headers },
  });
  if (!response.ok) throw new RemoteError(response.status);
  return (response.status === 204 ? undefined : await response.json()) as T;
}

function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  return request(`${API}${path}`, init);
}

export function toRemote(dictation: Dictation): Omit<RemoteDictation, 'id'> {
  return {
    title: dictation.title,
    source_text: dictation.sourceText,
    segments: dictation.segments,
    speech: {
      rate: dictation.speech.rate,
      voice_uri: dictation.speech.voiceURI ?? null,
      repeat_after_ms: dictation.speech.repeatAfterMs,
      speak_punctuation: dictation.speech.speakPunctuation ?? null,
    },
    show_word_count: dictation.showWordCount,
    allow_reveal: dictation.allowReveal,
    created_at: new Date(dictation.createdAt).toISOString(),
    updated_at: new Date(dictation.updatedAt).toISOString(),
  };
}

/** The photo stays on the device: it is carried over from the local copy. */
export function fromRemote(remote: RemoteDictation, ownerId: string, imageId?: string): Dictation {
  return {
    id: remote.id,
    title: remote.title,
    sourceText: remote.source_text,
    segments: remote.segments,
    speech: {
      rate: remote.speech.rate,
      voiceURI: remote.speech.voice_uri ?? undefined,
      repeatAfterMs: remote.speech.repeat_after_ms,
      speakPunctuation: remote.speech.speak_punctuation ?? undefined,
    },
    showWordCount: remote.show_word_count,
    allowReveal: remote.allow_reveal,
    createdAt: Date.parse(remote.created_at),
    updatedAt: Date.parse(remote.updated_at),
    imageId,
    ownerId,
  };
}

export function listRemote(): Promise<RemoteDictation[]> {
  return call('/dictations');
}

export function putRemote(dictation: Dictation): Promise<RemoteDictation> {
  return call(`/dictations/${dictation.id}`, {
    method: 'PUT',
    body: JSON.stringify(toRemote(dictation)),
  });
}

export async function deleteRemote(id: string): Promise<void> {
  try {
    await call(`/dictations/${id}`, { method: 'DELETE' });
  } catch (err) {
    // Already gone from the account: what was asked is done.
    if (!(err instanceof RemoteError && err.status === 404)) throw err;
  }
}

// --- Students' lockers ---

export interface Student {
  id: string;
  name: string;
}

/** A student whose locker holds the dictation. */
export interface AssignedStudent {
  assignment_id: string;
  profile_id: string;
  profile_name: string;
}

/** What the pupil's screen gets from a locker: the parts, never the source text. */
export interface PupilDictation {
  assignment_id: string;
  dictation_id: string;
  profile_id: string;
  title: string;
  segments: { id: string; text: string }[];
  speech: RemoteDictation['speech'];
  show_word_count: boolean;
  listened: string[];
}

export function listStudents(): Promise<Student[]> {
  return call('/profiles');
}

export function studentsOf(dictationId: string): Promise<AssignedStudent[]> {
  return call(`/dictations/${dictationId}/assignments`);
}

export function assignTo(dictationId: string, profileIds: string[]): Promise<AssignedStudent[]> {
  return call(`/dictations/${dictationId}/assignments`, {
    method: 'POST',
    body: JSON.stringify({ profile_ids: profileIds }),
  });
}

export function unassign(assignmentId: string): Promise<void> {
  return call(`/dictation-assignments/${assignmentId}`, { method: 'DELETE' });
}

/**
 * Who opens a locker's dictation: the teacher previewing it (their session),
 * or the student, with their access code.
 */
export type LockerSource = 'teacher' | 'student';

function assignmentUrl(source: LockerSource, assignmentId: string): string {
  return source === 'teacher'
    ? `${API}/dictation-assignments/${assignmentId}`
    : `${STUDENT_API}/dictations/${assignmentId}`;
}

export function pupilDictation(
  assignmentId: string,
  source: LockerSource
): Promise<PupilDictation> {
  return request(assignmentUrl(source, assignmentId));
}

export function savePupilProgress(
  assignmentId: string,
  listened: string[],
  source: LockerSource
): Promise<void> {
  return request(`${assignmentUrl(source, assignmentId)}/progress`, {
    method: 'PUT',
    body: JSON.stringify({ listened }),
  });
}
