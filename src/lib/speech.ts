/**
 * Reading a segment aloud.
 *
 * The pupil may have no network, so we only ever use voices the device can
 * synthesise locally. On the web that means `SpeechSynthesisVoice.localService`;
 * inside the Android APK it means the system TTS engine, which Capacitor
 * exposes through `@capacitor-community/text-to-speech`.
 *
 * The Capacitor plugin is resolved lazily and defensively: the same bundle runs
 * as a web page, where the plugin simply is not there.
 */

export interface Voice {
  /** Stable identifier stored on the dictation. */
  uri: string;
  name: string;
  /** True when the device can speak it with no network. */
  local: boolean;
}

interface NativeTts {
  speak(options: {
    text: string;
    lang: string;
    rate: number;
    pitch: number;
    category: string;
  }): Promise<void>;
  stop(): Promise<void>;
}

type CapacitorGlobal = {
  isNativePlatform?: () => boolean;
  Plugins?: { TextToSpeech?: NativeTts };
};

function nativeTts(): NativeTts | null {
  const cap = (globalThis as { Capacitor?: CapacitorGlobal }).Capacitor;
  if (!cap?.isNativePlatform?.()) return null;
  return cap.Plugins?.TextToSpeech ?? null;
}

export function isSpeechSupported(): boolean {
  return nativeTts() !== null || typeof globalThis.speechSynthesis !== 'undefined';
}

function frenchVoices(): SpeechSynthesisVoice[] {
  if (typeof globalThis.speechSynthesis === 'undefined') return [];
  return speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith('fr'));
}

export function listVoices(): Voice[] {
  return frenchVoices().map((v) => ({ uri: v.voiceURI, name: v.name, local: v.localService }));
}

/**
 * The browser populates the voice list asynchronously and fires
 * `voiceschanged` once it is ready — on some engines more than once, on
 * others never. Resolve on whichever comes first.
 */
export function whenVoicesReady(timeoutMs = 2000): Promise<Voice[]> {
  if (typeof globalThis.speechSynthesis === 'undefined') return Promise.resolve([]);
  if (speechSynthesis.getVoices().length > 0) return Promise.resolve(listVoices());

  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      speechSynthesis.removeEventListener('voiceschanged', finish);
      clearTimeout(timer);
      resolve(listVoices());
    };
    const timer = setTimeout(finish, timeoutMs);
    speechSynthesis.addEventListener('voiceschanged', finish);
  });
}

/**
 * The voice to actually use: the teacher's pick if it is still installed,
 * otherwise the first French voice that works offline, otherwise any French
 * voice at all.
 */
export function resolveVoice(voiceURI?: string): SpeechSynthesisVoice | undefined {
  const voices = frenchVoices();
  if (voices.length === 0) return undefined;
  return (
    (voiceURI ? voices.find((v) => v.voiceURI === voiceURI) : undefined) ??
    voices.find((v) => v.localService) ??
    voices[0]
  );
}

/** True when nothing can be spoken without the network. Drives the warning banner. */
export function hasOfflineFrenchVoice(): boolean {
  if (nativeTts() !== null) return true;
  return frenchVoices().some((v) => v.localService);
}

/**
 * Marks, inside the rewritten text, where the teacher takes a breath before
 * naming a mark. Never spoken: `spellPunctuation` strips it and `speechChunks`
 * cuts the text on it.
 */
const BREATH = '\u0001';

/**
 * Rewrites punctuation as the words a teacher says out loud during a dictation
 * ("virgule", "point d'interrogation"…), so the pupil hears where the marks go
 * instead of only a silent pause. Apostrophes and hyphens inside words are left
 * untouched — they belong to the spelling and are not dictated.
 */
function spellMarks(text: string): string {
  return (
    text
      .replace(/\.\.\.|…/g, ` ${BREATH}points de suspension `)
      .replace(/,/g, ` ${BREATH}virgule `)
      .replace(/;/g, ` ${BREATH}point-virgule `)
      .replace(/:/g, ` ${BREATH}deux-points `)
      .replace(/\?/g, ` ${BREATH}point d'interrogation `)
      .replace(/!/g, ` ${BREATH}point d'exclamation `)
      .replace(/«/g, ` ${BREATH}ouvrez les guillemets `)
      .replace(/»/g, ` ${BREATH}fermez les guillemets `)
      .replace(/\(/g, ` ${BREATH}ouvrez la parenthèse `)
      .replace(/\)/g, ` ${BREATH}fermez la parenthèse `)
      .replace(/[—–]/g, ` ${BREATH}tiret `)
      // Only a period ending a word/sentence, never a decimal point (3.5).
      .replace(/\.(?=\s|$)/g, ` ${BREATH}point `)
  );
}

/** The dictated text as one string, marks spelled out. */
export function spellPunctuation(text: string): string {
  return speechChunks(text).join(' ');
}

/**
 * The pieces to speak one after the other, with a pause between them.
 *
 * A teacher dictating does not run the mark into the word before it: they read
 * the words, breathe, then name the mark — "dormait sur le fauteuil" … "virgule".
 * Speaking it as a single utterance gives the pupil no time to finish writing
 * the word before the next thing arrives, so the text is cut just before each
 * mark and `speak` leaves a silence there.
 */
export function speechChunks(text: string, spellThem = true): string[] {
  const prepared = spellThem ? spellMarks(text) : text;
  return prepared
    .split(BREATH)
    .map((part) => part.replace(/\s+/g, ' ').trim())
    .filter((part) => part.length > 0);
}

/**
 * How long that silence lasts, at the normal reading rate. Long enough to be a
 * breath rather than a stumble; short enough that a pupil taking a dictation
 * does not think the app has stopped. Scaled by the reading rate: a teacher
 * reading slowly for a struggling pupil pauses for longer too.
 */
export const BREATH_PAUSE_MS = 400;

function breathPause(rate: number): number {
  return Math.round(BREATH_PAUSE_MS / Math.max(rate, 0.25));
}

export interface SpeakOptions {
  rate?: number;
  voiceURI?: string;
  /** Say the punctuation aloud. Defaults to true. */
  speakPunctuation?: boolean;
  onEnd?: () => void;
  onError?: () => void;
}

/**
 * A reading is a chain of chunks separated by silences, so it outlives any one
 * utterance. `generation` is what stops a chain: bumping it makes every
 * callback still in flight — an `onend`, a pending pause, a native promise —
 * return without speaking the rest or reporting an end that never came.
 */
let generation = 0;
let pauseTimer: number | null = null;

function stopChain(): void {
  generation += 1;
  if (pauseTimer !== null) {
    clearTimeout(pauseTimer);
    pauseTimer = null;
  }
}

export function cancelSpeech(): void {
  stopChain();
  const native = nativeTts();
  if (native) {
    void native.stop().catch(() => undefined);
    return;
  }
  if (typeof globalThis.speechSynthesis !== 'undefined') speechSynthesis.cancel();
}

/**
 * Speaks one segment. Always cancels whatever was playing first: a child who
 * taps twice wants to hear it again from the start, not two overlapping voices.
 *
 * When the punctuation is spoken, the segment comes in several pieces and a
 * silence is left before each mark — see `speechChunks`. `onEnd` fires once,
 * after the last piece.
 */
export function speak(text: string, options: SpeakOptions = {}): void {
  const { rate = 0.85, voiceURI, speakPunctuation = true, onEnd, onError } = options;
  const chunks = speechChunks(text, speakPunctuation);
  if (chunks.length === 0) {
    onEnd?.();
    return;
  }

  stopChain();
  const mine = generation;
  const pause = breathPause(rate);

  const native = nativeTts();
  if (native) {
    void (async () => {
      try {
        await native.stop().catch(() => undefined);
        for (const [index, chunk] of chunks.entries()) {
          if (mine !== generation) return;
          if (index > 0) await breathe(pause);
          if (mine !== generation) return;
          await native.speak({ text: chunk, lang: 'fr-FR', rate, pitch: 1, category: 'playback' });
        }
        if (mine === generation) onEnd?.();
      } catch {
        if (mine === generation) onError?.();
      }
    })();
    return;
  }

  if (typeof globalThis.speechSynthesis === 'undefined') {
    onError?.();
    return;
  }

  speechSynthesis.cancel();

  const speakChunk = (index: number) => {
    const utterance = new SpeechSynthesisUtterance(chunks[index]);
    utterance.lang = 'fr-FR';
    utterance.rate = rate;
    const voice = resolveVoice(voiceURI);
    if (voice) utterance.voice = voice;

    utterance.onend = () => {
      if (mine !== generation) return;
      if (index + 1 >= chunks.length) {
        onEnd?.();
        return;
      }
      // The breath: the pupil finishes writing the word before hearing the mark.
      pauseTimer = setTimeout(() => {
        pauseTimer = null;
        if (mine === generation) speakChunk(index + 1);
      }, pause) as unknown as number;
    };

    utterance.onerror = (event) => {
      // Cancelling on purpose fires an error too — that is not a failure.
      if (event.error === 'canceled' || event.error === 'interrupted') return;
      if (mine !== generation) return;
      onError?.();
    };

    speechSynthesis.speak(utterance);
  };

  speakChunk(0);
}

/** The silence itself, cancellable through the shared `pauseTimer`. */
function breathe(ms: number): Promise<void> {
  return new Promise((resolve) => {
    pauseTimer = setTimeout(() => {
      pauseTimer = null;
      resolve();
    }, ms) as unknown as number;
  });
}
