/**
 * Dictation ids are UUIDs: DysAdapt stores a dictation under the id it was
 * created with here. Older dictations carry a short nanoid and get a UUID when
 * they move into an account (see library.ts).
 */
export function newDictationId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  // randomUUID only exists in secure contexts; a LAN address over http is not one.
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(id: string): boolean {
  return UUID.test(id);
}
