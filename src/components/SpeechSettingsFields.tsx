import { useEffect, useState } from 'react';
import { AlertTriangle, Volume2 } from 'lucide-react';
import { hasOfflineFrenchVoice, whenVoicesReady, type Voice } from '@/lib/speech';
import type { SpeechSettings } from '@/lib/types';

interface SpeechSettingsFieldsProps {
  value: SpeechSettings;
  onChange: (value: SpeechSettings) => void;
  onPreview: () => void;
}

const RATE_LABELS: Array<{ max: number; label: string }> = [
  { max: 0.6, label: 'Très lent' },
  { max: 0.75, label: 'Lent' },
  { max: 0.9, label: 'Posé' },
  { max: 1.01, label: 'Normal' },
];

function rateLabel(rate: number): string {
  return RATE_LABELS.find((entry) => rate <= entry.max)?.label ?? 'Normal';
}

/** Voice, speed and writing pause — shared by the wizard and the settings page. */
export default function SpeechSettingsFields({
  value,
  onChange,
  onPreview,
}: SpeechSettingsFieldsProps) {
  const [voices, setVoices] = useState<Voice[]>([]);
  const [offlineVoice, setOfflineVoice] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void whenVoicesReady().then((available) => {
      if (cancelled) return;
      setVoices(available);
      setOfflineVoice(hasOfflineFrenchVoice());
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <fieldset className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-5">
      <legend className="px-2 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
        Lecture à voix haute
      </legend>

      {!offlineVoice && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 p-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800 dark:text-amber-200">
            Aucune voix française ne fonctionne hors connexion sur cet appareil. Sur Android,
            installez la voix française dans <em>Paramètres → Synthèse vocale</em> pour que la
            dictée marche sans wifi.
          </p>
        </div>
      )}

      {voices.length > 1 && (
        <div>
          <label
            htmlFor="voice"
            className="block text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2"
          >
            Voix
          </label>
          <select
            id="voice"
            value={value.voiceURI ?? ''}
            onChange={(event) => onChange({ ...value, voiceURI: event.target.value || undefined })}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 focus:border-primary bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 transition-all outline-none"
          >
            <option value="">Voix par défaut de l&apos;appareil</option>
            {voices.map((voice) => (
              <option key={voice.uri} value={voice.uri}>
                {voice.name}
                {voice.local ? '' : ' (nécessite une connexion)'}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label
          htmlFor="rate"
          className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3"
        >
          Vitesse
          <span className="text-primary">{rateLabel(value.rate)}</span>
        </label>
        <input
          id="rate"
          type="range"
          min={0.5}
          max={1}
          step={0.05}
          value={value.rate}
          onChange={(event) => onChange({ ...value, rate: Number(event.target.value) })}
          className="w-full accent-[var(--primary)]"
        />
      </div>

      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={value.speakPunctuation ?? true}
          onChange={(event) => onChange({ ...value, speakPunctuation: event.target.checked })}
          className="mt-1 w-5 h-5 rounded accent-[var(--primary)]"
        />
        <span>
          <span className="block text-sm font-bold text-slate-800 dark:text-slate-100">
            Lire la ponctuation
          </span>
          <span className="block text-xs text-slate-500 dark:text-slate-400">
            Annonce « virgule », « point »… à voix haute, comme en vraie dictée, pour que
            l&apos;élève sache où placer les signes.
          </span>
        </span>
      </label>

      <div>
        <label
          htmlFor="pause"
          className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3"
        >
          Répétition automatique
          <span className="text-primary">
            {value.repeatAfterMs === 0
              ? 'désactivée'
              : `après ${(value.repeatAfterMs / 1000).toFixed(0)} s`}
          </span>
        </label>
        <input
          id="pause"
          type="range"
          min={0}
          max={10000}
          step={1000}
          value={value.repeatAfterMs}
          onChange={(event) => onChange({ ...value, repeatAfterMs: Number(event.target.value) })}
          className="w-full accent-[var(--primary)]"
        />
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
          Relit la partie automatiquement après ce délai, pour laisser le temps d&apos;écrire sans
          avoir à retoucher l&apos;écran.
        </p>
      </div>

      <button
        type="button"
        onClick={onPreview}
        className="flex items-center gap-2 px-4 py-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-sm font-medium transition-colors"
      >
        <Volume2 className="w-4 h-4" />
        Écouter un exemple
      </button>
    </fieldset>
  );
}
