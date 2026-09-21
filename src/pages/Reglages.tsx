import { Info } from 'lucide-react';
import PageShell from '@/components/PageShell';
import SpeechSettingsFields from '@/components/SpeechSettingsFields';
import { useSettings } from '@/hooks/useSettings';
import { speak } from '@/lib/speech';

export default function Reglages() {
  const { settings, update } = useSettings();

  return (
    <PageShell title="Réglages" backTo="/" backLabel="Mes dictées">
      <div className="space-y-6">
        <section>
          <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3">
            Lecture par défaut
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
            Appliquée aux nouvelles dictées. Chaque dictée garde ensuite ses propres réglages.
          </p>
          <SpeechSettingsFields
            value={settings.speech}
            onChange={(speech) => update({ speech })}
            onPreview={() =>
              speak('Le petit chat noir dormait sur le fauteuil.', {
                rate: settings.speech.rate,
                voiceURI: settings.speech.voiceURI,
                speakPunctuation: settings.speech.speakPunctuation ?? true,
              })
            }
          />
        </section>

        <section>
          <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3">
            À propos
          </h2>
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 flex items-start gap-3">
            <Info className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-slate-600 dark:text-slate-300 space-y-2">
              <p>
                <span className="font-bold">Dictadapt</span> fonctionne entièrement sur votre
                appareil : pas de compte, pas de serveur, pas de connexion. Photos, textes et
                dictées ne quittent jamais l&apos;appareil.
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Effacer les données du navigateur (ou désinstaller l&apos;application) supprime
                définitivement les dictées enregistrées. Partagez-les par QR code pour les conserver
                ailleurs.
              </p>
            </div>
          </div>
        </section>
      </div>
    </PageShell>
  );
}
