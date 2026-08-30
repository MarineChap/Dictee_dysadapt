import { useCallback, useState } from 'react';
import { readSettings, writeSettings } from '@/lib/storage';
import type { Settings } from '@/lib/types';

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(readSettings);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((current) => {
      const next = { ...current, ...patch };
      writeSettings(next);
      return next;
    });
  }, []);

  return { settings, update };
}
