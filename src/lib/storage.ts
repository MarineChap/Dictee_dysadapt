/**
 * Global preferences. Small and read on first paint, so localStorage rather
 * than IndexedDB. Every access is guarded: private browsing and locked-down
 * WebViews make `localStorage` throw rather than return null.
 */
import { DEFAULT_SETTINGS, type Settings } from './types';

const SETTINGS_KEY = 'dictadapt-settings';
export const THEME_KEY = 'dictadapt-theme';

export function readSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      speech: { ...DEFAULT_SETTINGS.speech, ...parsed.speech },
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function writeSettings(settings: Settings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    localStorage.setItem(THEME_KEY, settings.theme);
  } catch {
    /* nothing we can do — the app still works for this session */
  }
}
