/**
 * Export / import a dictation as a file, so a teacher can move it between
 * computers with no camera and no network: a USB key, a shared folder, a mail
 * attachment on the school's own server. The QR path (share.ts) hands a
 * dictation to the pupil's phone; this hands a teacher's library to another
 * machine.
 *
 * Two forces shape the format, and they pull in opposite directions:
 *
 * 1. Antivirus. An opaque binary blob under an unknown extension is exactly what
 *    a strict antivirus quarantines as "packed" the moment it lands on a USB
 *    key. So the file is a `.json` document with an `application/json` type — a
 *    recognised, inert text format that travels unmolested.
 *
 * 2. The pupil must not be able to read the dictation. A plain-text JSON of the
 *    sentences would let any pupil open the file and cheat. So the dictation
 *    itself is the same deflated, base64url payload the QR code carries
 *    (`encodePayload`), tucked inside a `data` field — not human-readable, yet
 *    still valid JSON text. This is obfuscation, not encryption: exactly the
 *    protection the QR transport already offers, no more, no less.
 *
 * As with the QR code, the source photo never travels.
 */
import { decodePayload, encodePayload, type ImportedDictation } from './share';
import type { Dictation } from './types';

export const FILE_FORMAT = 'dictadapt';
export const FILE_VERSION = 1;
export const FILE_EXTENSION = 'json';
export const FILE_MIME = 'application/json';

/** The on-disk envelope. `format`/`version` let import reject foreign JSON. */
interface DictationFile {
  format: typeof FILE_FORMAT;
  version: number;
  /** The dictation as `encodePayload` produces it — deflated, base64url. */
  data: string;
}

/** Serialises a dictation to the JSON text written to disk. Never the photo. */
export function encodeDictationFile(dictation: Dictation): string {
  const file: DictationFile = {
    format: FILE_FORMAT,
    version: FILE_VERSION,
    data: encodePayload(dictation),
  };
  return JSON.stringify(file, null, 2);
}

/** A filesystem-safe name from the title, e.g. "dictee-du-lundi.json". */
export function dictationFileName(dictation: Dictation): string {
  const slug = dictation.title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return `${slug || 'dictee'}.${FILE_EXTENSION}`;
}

/** Rebuilds a dictation from file text. Throws on anything that is not ours. */
export function decodeDictationFile(text: string): ImportedDictation {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Ce fichier n'est pas une dictée Dictadapt.");
  }

  const file = (parsed ?? {}) as Partial<DictationFile>;
  if (file.format !== FILE_FORMAT || typeof file.data !== 'string') {
    throw new Error("Ce fichier n'est pas une dictée Dictadapt.");
  }

  try {
    return decodePayload(file.data);
  } catch {
    throw new Error('Ce fichier est abîmé et ne peut pas être ouvert.');
  }
}
