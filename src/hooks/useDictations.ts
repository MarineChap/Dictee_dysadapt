import { useCallback, useEffect, useState } from 'react';
import { listDictations } from '@/lib/db';
import type { Dictation } from '@/lib/types';

/**
 * The teacher's local library.
 *
 * `refresh()` bumps a token rather than re-running a fetch directly: state is
 * then only ever written from a promise callback, and a reload that lands after
 * the component unmounts is discarded instead of warning.
 */
export function useDictations() {
  const [dictations, setDictations] = useState<Dictation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    listDictations()
      .then((rows) => {
        if (cancelled) return;
        setDictations(rows);
        setError(null);
      })
      .catch(() => {
        if (cancelled) return;
        setError('Impossible de lire les dictées enregistrées sur cet appareil.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  const refresh = useCallback(() => setReloadToken((token) => token + 1), []);

  return { dictations, loading, error, refresh };
}
