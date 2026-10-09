import { useEffect, useState } from 'react';
import { Volume2 } from 'lucide-react';
import { hasOfflineFrenchVoice, whenVoicesReady, type Voice } from '@/lib/speech';
import type { SpeechSettings } from '@/lib/types';
import { Button, Field, Notice, Select } from '@/components/ui';

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

  const rangeLabel = 'flex items-center justify-between gap-3 font-bold text-foreground';

  return (
    <fieldset className="rounded-lg border border-border bg-surface p-4 sm:p-5 flex flex-col gap-5">
      <legend className="px-2 font-bold text-foreground">Lecture à voix haute</legend>

      {!offlineVoice && (
        <Notice tone="warning">
          Aucune voix française ne fonctionne hors connexion sur cet appareil. Sur Android,
          installez la voix française dans <em>Paramètres → Synthèse vocale</em> pour que la dictée
          marche sans wifi.
        </Notice>
      )}

      {voices.length > 1 && (
        <Field label="Voix" id="voice">
          {(control) => (
            <Select
              {...control}
              value={value.voiceURI ?? ''}
              onChange={(event) =>
                onChange({ ...value, voiceURI: event.target.value || undefined })
              }
            >
              <option value="">Voix par défaut de l&apos;appareil</option>
              {voices.map((voice) => (
                <option key={voice.uri} value={voice.uri}>
                  {voice.name}
                  {voice.local ? '' : ' (nécessite une connexion)'}
                </option>
              ))}
            </Select>
          )}
        </Field>
      )}

      <div className="flex flex-col gap-2">
        <label htmlFor="rate" className={rangeLabel}>
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
          className="w-full"
        />
      </div>

      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={value.speakPunctuation ?? true}
          onChange={(event) => onChange({ ...value, speakPunctuation: event.target.checked })}
          className="mt-1 size-5 shrink-0"
        />
        <span>
          <span className="block font-bold text-foreground">Lire la ponctuation</span>
          <span className="block text-sm text-muted">
            Annonce « virgule », « point »… à voix haute, comme en vraie dictée, pour que
            l&apos;élève sache où placer les signes.
          </span>
        </span>
      </label>

      <div className="flex flex-col gap-2">
        <label htmlFor="pause" className={rangeLabel}>
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
          aria-describedby="pause-hint"
          onChange={(event) => onChange({ ...value, repeatAfterMs: Number(event.target.value) })}
          className="w-full"
        />
        <p id="pause-hint" className="text-sm text-muted">
          Relit la partie automatiquement après ce délai, pour laisser le temps d&apos;écrire sans
          avoir à retoucher l&apos;écran.
        </p>
      </div>

      <Button
        variant="secondary"
        size="sm"
        icon={Volume2}
        onClick={onPreview}
        className="self-start"
      >
        Écouter un exemple
      </Button>
    </fieldset>
  );
}
