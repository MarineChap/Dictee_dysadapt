/**
 * Handing a dictation to the pupil's device with no network, no account and no
 * file manager: a QR code the pupil scans with their own copy of the app.
 *
 * The payload is the dictation stripped to what the pupil needs (never the
 * photo), deflated and base64url-encoded. A QR code holds about 2 950 bytes, so
 * a long text is split across several codes shown in sequence; the scanner
 * accumulates the parts and tells the pupil which ones are still missing.
 */
import { deflateSync, inflateSync, strFromU8, strToU8 } from 'fflate';
import { nanoid } from 'nanoid';
import type { Dictation, SpeechSettings } from './types';
import { DEFAULT_SPEECH } from './types';

export const PAYLOAD_PREFIX = 'DICTADAPT1';

/** Conservative: byte mode, error level L, version 40 holds 2 953 bytes. */
const MAX_CHUNK_CHARS = 2600;

/** Short keys: every byte saved is a byte that need not fit in the QR code. */
interface WirePayload {
  /** transfer id — ties the chunks of one dictation together */
  i: string;
  /** title */
  t: string;
  /** segments */
  s: string[];
  /** speech rate */
  r: number;
  /** auto-repeat delay, ms */
  p: number;
  /** show word count */
  w: 0 | 1;
  /** allow reveal */
  v: 0 | 1;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded.padEnd(Math.ceil(padded.length / 4) * 4, '='));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/**
 * Encodes a dictation into the chunks to display, in order.
 * Each chunk is `DICTADAPT1:<transferId>:<n>:<total>:<data>`.
 */
export function encodeDictation(dictation: Dictation): string[] {
  const transferId = nanoid(6);
  const payload: WirePayload = {
    i: transferId,
    t: dictation.title,
    s: dictation.segments.map((segment) => segment.text),
    r: dictation.speech.rate,
    p: dictation.speech.repeatAfterMs,
    w: dictation.showWordCount ? 1 : 0,
    v: dictation.allowReveal ? 1 : 0,
  };

  const encoded = toBase64Url(deflateSync(strToU8(JSON.stringify(payload)), { level: 9 }));
  const total = Math.max(1, Math.ceil(encoded.length / MAX_CHUNK_CHARS));

  return Array.from({ length: total }, (_, index) => {
    const slice = encoded.slice(index * MAX_CHUNK_CHARS, (index + 1) * MAX_CHUNK_CHARS);
    return `${PAYLOAD_PREFIX}:${transferId}:${index + 1}:${total}:${slice}`;
  });
}

export interface ChunkHeader {
  transferId: string;
  index: number;
  total: number;
  data: string;
}

/** Parses one scanned code. Returns null for anything that is not ours. */
export function parseChunk(raw: string): ChunkHeader | null {
  const parts = raw.trim().split(':');
  if (parts.length < 5 || parts[0] !== PAYLOAD_PREFIX) return null;

  const [, transferId, indexRaw, totalRaw] = parts;
  const index = Number(indexRaw);
  const total = Number(totalRaw);
  if (!transferId || !Number.isInteger(index) || !Number.isInteger(total)) return null;
  if (index < 1 || total < 1 || index > total) return null;

  // The payload itself is base64url, so it can never contain a colon —
  // re-joining is safe and keeps the parser tolerant of extra separators.
  return { transferId, index, total, data: parts.slice(4).join(':') };
}

export interface ImportedDictation {
  title: string;
  segments: string[];
  speech: SpeechSettings;
  showWordCount: boolean;
  allowReveal: boolean;
}

/** Rebuilds a dictation from a complete, ordered set of chunk payloads. */
export function decodeChunks(chunks: string[]): ImportedDictation {
  const raw = strFromU8(inflateSync(fromBase64Url(chunks.join(''))));
  const payload = JSON.parse(raw) as Partial<WirePayload>;

  if (!Array.isArray(payload.s) || payload.s.some((entry) => typeof entry !== 'string')) {
    throw new Error('Ce QR code ne contient pas de dictée valide.');
  }

  return {
    title: typeof payload.t === 'string' && payload.t.trim() ? payload.t : 'Dictée reçue',
    segments: payload.s.filter((entry) => entry.trim().length > 0),
    speech: {
      rate: typeof payload.r === 'number' ? payload.r : DEFAULT_SPEECH.rate,
      repeatAfterMs: typeof payload.p === 'number' ? payload.p : DEFAULT_SPEECH.repeatAfterMs,
    },
    showWordCount: payload.w !== 0,
    allowReveal: payload.v === 1,
  };
}

/**
 * Accumulates scanned chunks for one transfer. Scanning a code from a different
 * transfer restarts the collection — the teacher probably moved on.
 */
export class ChunkCollector {
  private transferId: string | null = null;
  private total = 0;
  private readonly chunks = new Map<number, string>();

  add(header: ChunkHeader): void {
    if (header.transferId !== this.transferId) {
      this.transferId = header.transferId;
      this.total = header.total;
      this.chunks.clear();
    }
    this.chunks.set(header.index, header.data);
  }

  get received(): number {
    return this.chunks.size;
  }

  get expected(): number {
    return this.total;
  }

  /** 1-based indexes still to scan, so the UI can say "il manque le 2". */
  get missing(): number[] {
    return Array.from({ length: this.total }, (_, i) => i + 1).filter(
      (index) => !this.chunks.has(index)
    );
  }

  get complete(): boolean {
    return this.total > 0 && this.chunks.size === this.total;
  }

  ordered(): string[] {
    return Array.from({ length: this.total }, (_, i) => this.chunks.get(i + 1) ?? '');
  }

  reset(): void {
    this.transferId = null;
    this.total = 0;
    this.chunks.clear();
  }
}
