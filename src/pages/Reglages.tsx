import { useState } from 'react';
import { Info, ShieldCheck } from 'lucide-react';
import PageShell from '@/components/PageShell';
import SpeechSettingsFields from '@/components/SpeechSettingsFields';
import { useSettings } from '@/hooks/useSettings';
import { speak } from '@/lib/speech';

export default function Reglages() {
  const { settings, update } = useSettings();
  const [code, setCode] = useState(settings.exitCode);

  function saveCode(next: string) {
    const digits = next.replace(/\D/g, '').slice(0, 4);
    setCode(digits);
    // A partial code would lock the teacher out, so only 0 or 4 digits count.
    if (digits.length === 0 || digits.length === 4) update({ exitCode: digits });
  }

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
              })
            }
          />
        </section>

        <section>
          <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3">
            Mode élève
          </h2>
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Pour sortir du mode élève, il faut garder le cadenas appuyé{' '}
                <span className="font-bold">deux secondes</span>. Ajoutez un code à quatre chiffres
                si vos élèves ont compris l&apos;astuce.
              </p>
            </div>

            <div>
              <label
                htmlFor="exit-code"
                className="block text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2"
              >
                Code de sortie (facultatif)
              </label>
              <input
                id="exit-code"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                placeholder="Aucun"
                value={code}
                onChange={(event) => saveCode(event.target.value)}
                className="w-40 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 focus:border-primary bg-white dark:bg-slate-800 text-center text-xl font-black tracking-[0.4em] text-slate-900 dark:text-slate-100 outline-none"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                {code.length === 4
                  ? 'Code actif.'
                  : code.length === 0
                    ? 'Aucun code : appui long uniquement.'
                    : 'Entrez les quatre chiffres pour activer le code.'}
              </p>
            </div>
          </div>
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
