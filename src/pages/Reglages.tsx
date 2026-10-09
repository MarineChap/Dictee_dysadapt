import PageShell from '@/components/PageShell';
import SpeechSettingsFields from '@/components/SpeechSettingsFields';
import { useSettings } from '@/hooks/useSettings';
import { speak } from '@/lib/speech';
import { Notice, SectionTitle } from '@/components/ui';

export default function Reglages() {
  const { settings, update } = useSettings();

  return (
    <PageShell title="Réglages" backTo="/" backLabel="Mes dictées">
      <div className="flex flex-col gap-10">
        <section className="flex flex-col gap-3">
          <div>
            <SectionTitle>Lecture par défaut</SectionTitle>
            <p className="text-muted mt-1">
              Appliquée aux nouvelles dictées. Chaque dictée garde ensuite ses propres réglages.
            </p>
          </div>
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

        <section className="flex flex-col gap-3">
          <SectionTitle>À propos</SectionTitle>
          <Notice tone="neutral">
            <p>
              <span className="font-bold">Dictadapt</span> fonctionne entièrement sur votre
              appareil, sans connexion. Sans compte, photos, textes et dictées ne quittent jamais
              l&apos;appareil. Connecté à votre compte DysAdapt, le texte des dictées et la
              progression des élèves y sont aussi enregistrés ; la photo reste sur l&apos;appareil.
            </p>
            <p className="text-sm text-muted mt-2">
              Effacer les données du navigateur (ou désinstaller l&apos;application) supprime
              définitivement les dictées enregistrées. Partagez-les par QR code pour les conserver
              ailleurs.
            </p>
          </Notice>
        </section>
      </div>
    </PageShell>
  );
}
