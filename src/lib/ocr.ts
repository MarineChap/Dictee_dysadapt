/**
 * Client-side OCR. Everything Tesseract needs — the worker, the WASM core and
 * the French model — is served from `public/tesseract/`, so a recognition never
 * touches the network. That is the whole point: the app has to work in a
 * classroom with no wifi, and on a device that was never online since install.
 */
import { createWorker, type Worker } from 'tesseract.js';

/** Vite rewrites BASE_URL for the GitHub Pages sub-path; Capacitor keeps '/'. */
function assetPath(file: string): string {
  const base = import.meta.env.BASE_URL || '/';
  return `${base.endsWith('/') ? base : `${base}/`}tesseract/${file}`;
}

let workerPromise: Promise<Worker> | null = null;

export type OcrProgress = (ratio: number) => void;

async function getWorker(onProgress?: OcrProgress): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = createWorker('fra', 1, {
      workerPath: assetPath('worker.min.js'),
      langPath: assetPath('').replace(/\/$/, ''),
      corePath: assetPath('').replace(/\/$/, ''),
      // The bundled model is LSTM-only, so never ask for the legacy engine.
      legacyCore: false,
      legacyLang: false,
      logger: (message) => {
        if (message.status === 'recognizing text') onProgress?.(message.progress);
      },
    }).catch((error) => {
      // A failed init must not poison every later attempt.
      workerPromise = null;
      throw error;
    });
  }
  return workerPromise;
}

/**
 * Tidies what Tesseract returns into something a teacher can proofread:
 * hard-wrapped lines rejoined, hyphenation undone, French spacing restored.
 */
export function cleanOcrText(raw: string): string {
  return (
    raw
      .replace(/\r/g, '')
      // A word cut across two lines: "chan-\nson" -> "chanson".
      .replace(/(\p{L})-\n(\p{L})/gu, '$1$2')
      // A line continued by a lowercase word is a wrap: rejoin it. A line
      // followed by a capital is left alone, so an exercise heading
      // ("Dictée n° 4 — CE2") stays on its own line for the teacher to delete.
      .replace(/([^.!?:;»"\n])\n(?=\p{Ll})/gu, '$1 ')
      .replace(/\n{2,}/g, '\n')
      .replace(/[ \t]{2,}/g, ' ')
      // French typography: a thin space before the double marks.
      .replace(/\s*([;:!?])/g, ' $1')
      .replace(/\s+([,.])/g, '$1')
      .replace(/«\s*/g, '« ')
      .replace(/\s*»/g, ' »')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .join('\n')
  );
}

export interface OcrResult {
  text: string;
  /** 0-100. Below ~70 the teacher should expect real corrections. */
  confidence: number;
}

export async function recognise(
  image: HTMLCanvasElement | Blob,
  onProgress?: OcrProgress
): Promise<OcrResult> {
  const worker = await getWorker(onProgress);
  const { data } = await worker.recognize(image);
  return { text: cleanOcrText(data.text), confidence: data.confidence };
}

/** Frees the worker (and its ~8 MB of WASM) once the wizard is done with it. */
export async function terminateOcr(): Promise<void> {
  if (!workerPromise) return;
  const pending = workerPromise;
  workerPromise = null;
  try {
    await (await pending).terminate();
  } catch {
    /* already gone */
  }
}
