/**
 * The teacher's DysAdapt account, when there is one.
 *
 * Dictadapt is served on DysAdapt's own origin (dysadapt.com/dictee/), so the
 * DysAdapt session cookie reaches `/api/*` without Dictadapt ever handling a
 * token. With no session — or no DysAdapt behind the page at all, as when this
 * app runs on its own — everything stays on the device, as it always did.
 */

export interface Account {
  id: string;
  email?: string;
}

const STORAGE_KEY = 'dictadapt.account';

/**
 * Where DysAdapt's pages live. Empty in production (same origin); set at
 * build time when DysAdapt runs elsewhere, as on a local machine (:3000).
 */
const DYSADAPT_URL = (import.meta.env.VITE_DYSADAPT_URL ?? '').replace(/\/$/, '');

export function signInUrl(): string {
  // DysAdapt only sends a teacher back to a path of its own origin.
  return `${DYSADAPT_URL}/api/auth/signin?callbackUrl=${encodeURIComponent(import.meta.env.BASE_URL)}`;
}

export function signUpUrl(): string {
  return `${DYSADAPT_URL}/api/auth/signup`;
}

export function dashboardUrl(): string {
  return `${DYSADAPT_URL}/dashboard`;
}

/** The student's locker in DysAdapt, where the teacher previewing it goes back to. */
export function lockerUrl(profileId: string): string {
  return `${DYSADAPT_URL}/dashboard/profile/${profileId}/student`;
}

/** The locker a student opened with their access code, on their own device. */
export function studentLockerUrl(): string {
  return `${DYSADAPT_URL}/eleve`;
}

/** Where a student types their access code. */
export function studentCodeUrl(): string {
  return `${DYSADAPT_URL}/code`;
}

function lastKnown(): Account | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? (JSON.parse(stored) as Account) : null;
  } catch {
    return null;
  }
}

function remember(account: Account | null): void {
  try {
    if (account) localStorage.setItem(STORAGE_KEY, JSON.stringify(account));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Private window or blocked storage: the account is only known online.
  }
}

/**
 * Asks DysAdapt who is signed in. Offline, the last account seen stands in, so
 * a signed-in teacher keeps their dictations without a network.
 */
export async function fetchAccount(): Promise<Account | null> {
  let response: Response;
  try {
    response = await fetch('/api/auth/session', { headers: { Accept: 'application/json' } });
  } catch {
    return lastKnown();
  }
  if (response.status >= 500) return lastKnown();

  // Without DysAdapt behind the page, nginx answers index.html: not JSON.
  const session = response.ok ? await response.json().catch(() => null) : null;
  // A session whose token could not be refreshed is a signed-out one: the API
  // would refuse every call made with it.
  const user = session?.error ? null : session?.user;
  const account: Account | null = user?.id ? { id: String(user.id), email: user.email } : null;
  remember(account);
  return account;
}
