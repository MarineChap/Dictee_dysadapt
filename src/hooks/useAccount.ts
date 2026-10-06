import { useEffect, useState } from 'react';
import { fetchAccount, type Account } from '@/lib/account';

// Asked once per page load: every screen shares the answer.
let request: Promise<Account | null> | null = null;

export function accountOnce(): Promise<Account | null> {
  request ??= fetchAccount();
  return request;
}

/** Test seam: forget the answer so the next render asks again. */
export function resetAccountForTests(): void {
  request = null;
}

/**
 * The signed-in DysAdapt account, or null. `ready` stays false until the
 * answer is known, so nothing is shown as "on this device only" too early.
 */
export function useAccount() {
  const [state, setState] = useState<{ account: Account | null; ready: boolean }>({
    account: null,
    ready: false,
  });

  useEffect(() => {
    let cancelled = false;
    void accountOnce().then((account) => {
      if (!cancelled) setState({ account, ready: true });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
