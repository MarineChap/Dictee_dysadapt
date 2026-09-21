/** One chunk the pupil listens to and writes down: 2-4 words, or up to a comma. */
export interface Segment {
  id: string;
  text: string;
}

export interface SpeechSettings {
  /** 0.5 (very slow) to 1 (normal). DysAdapt reads its exercises at 0.85. */
  rate: number;
  /** `SpeechSynthesisVoice.voiceURI`, or undefined to let the browser pick. */
  voiceURI?: string;
  /**
   * Automatically replays the segment after this many milliseconds, so the
   * pupil can keep writing instead of reaching for the screen. 0 disables it.
   */
  repeatAfterMs: number;
  /**
   * Says the punctuation out loud ("virgule", "point"…), the way a teacher
   * dictates it, so the pupil knows where the marks go. Undefined on
   * dictations saved before this option existed, which read as enabled.
   */
  speakPunctuation?: boolean;
}

export interface Dictation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  /** OCR output after the teacher has corrected it. Never shown to the pupil. */
  sourceText: string;
  segments: Segment[];
  speech: SpeechSettings;
  /** Show "3 mots" under each button — a hint that reveals no spelling. */
  showWordCount: boolean;
  /**
   * Lets the pupil reveal the text to self-correct once every part is done.
   * The reveal screen itself ships in v2; the flag is stored from v1 so
   * existing dictations keep their setting.
   */
  allowReveal: boolean;
  /** Key into the `blobs` store holding the source photo. Teacher side only. */
  imageId?: string;
  /**
   * Received on this device from a QR code or a .json file, rather than created
   * here. It carries no source text and must never open in teacher mode
   * (DicteeDetail) — there is nothing to edit and nothing to read: this device
   * only plays it to the pupil. Absent on dictations authored on this device.
   */
  imported?: boolean;
}

/** Which parts the pupil has already listened to. Survives closing the app. */
export interface Progress {
  dictationId: string;
  listened: string[];
  updatedAt: number;
}

export const DEFAULT_SPEECH: SpeechSettings = {
  rate: 0.85,
  repeatAfterMs: 0,
  speakPunctuation: true,
};

/** Global preferences, kept in localStorage (small, synchronous, no blobs). */
export interface Settings {
  theme: 'light' | 'dark' | 'system';
  /** Default reading settings applied to newly created dictations. */
  speech: SpeechSettings;
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  speech: DEFAULT_SPEECH,
};
