/**
 * Platform detection. The same bundle ships to the browser and, wrapped by
 * Capacitor, inside the Android APK. `Capacitor.isNativePlatform()` is the one
 * signal that tells the two apart; it is absent on the web, where the call
 * short-circuits to `false`. Mirrors the defensive lookup in `speech.ts`.
 */
type CapacitorGlobal = { isNativePlatform?: () => boolean };

/** True only inside the native (Capacitor) shell, never in a browser. */
export function isNativePlatform(): boolean {
  const cap = (globalThis as { Capacitor?: CapacitorGlobal }).Capacitor;
  return cap?.isNativePlatform?.() === true;
}
