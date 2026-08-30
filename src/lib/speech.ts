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

export interface SpeakOptions {
  rate?: number;
  voiceURI?: string;
  onEnd?: () => void;
  onError?: () => void;
}

export function cancelSpeech(): void {
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
 */
export function speak(text: string, options: SpeakOptions = {}): void {
  const { rate = 0.85, voiceURI, onEnd, onError } = options;
  const trimmed = text.trim();
  if (!trimmed) {
    onEnd?.();
    return;
  }

  const native = nativeTts();
  if (native) {
    void native
      .stop()
      .catch(() => undefined)
      .then(() =>
        native.speak({ text: trimmed, lang: 'fr-FR', rate, pitch: 1, category: 'playback' })
      )
      .then(() => onEnd?.())
      .catch(() => onError?.());
    return;
  }

  if (typeof globalThis.speechSynthesis === 'undefined') {
    onError?.();
    return;
  }

  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(trimmed);
  utterance.lang = 'fr-FR';
  utterance.rate = rate;
  const voice = resolveVoice(voiceURI);
  if (voice) utterance.voice = voice;
  utterance.onend = () => onEnd?.();
  utterance.onerror = (event) => {
    // Cancelling on purpose fires an error too — that is not a failure.
    if (event.error === 'canceled' || event.error === 'interrupted') return;
    onError?.();
  };
  speechSynthesis.speak(utterance);
}
