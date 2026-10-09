import { useEffect, useState } from 'react';
import { nanoid } from 'nanoid';
import { useNavigate, useParams } from 'react-router-dom';
import { FileDown, Play, QrCode, Save } from 'lucide-react';
import PageShell from '@/components/PageShell';
import QrShare from '@/components/QrShare';
import LockerPanel from '@/components/LockerPanel';
import SegmentEditor from '@/components/SegmentEditor';
import SpeechSettingsFields from '@/components/SpeechSettingsFields';
import { getDictation } from '@/lib/db';
import { accountOnce, useAccount } from '@/hooks/useAccount';
import { loadLibrary, saveToLibrary } from '@/lib/library';
import { reconcileSegmentIds, sameWords } from '@/lib/segment';
import { FILE_MIME, dictationFileName, encodeDictationFile } from '@/lib/file';
import { cancelSpeech, speak } from '@/lib/speech';
import type { Dictation } from '@/lib/types';
import ActionBar from '@/components/ActionBar';
import { Button, Card, Field, Input, SectionTitle } from '@/components/ui';

export default function DicteeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [dictation, setDictation] = useState<Dictation | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);
  const { account, ready } = useAccount();
  // Signed in, a dictation reaches the pupil through their locker only: the
  // pupil screen, the QR code and the file are for teachers without an account.
  const sharesByHand = ready && !account;

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    // Not on this device yet (opened from a link on a new device): the account may have it.
    void getDictation(id)
      .then(
        (local) =>
          local ??
          accountOnce()
            .then(loadLibrary)
            .then(() => getDictation(id))
      )
      .then((found) => {
        if (cancelled) return;
        if (!found) {
          setNotFound(true);
          return;
        }
        // A dictation received here (QR or file) has no teacher mode: no source
        // text to read, nothing to edit. Bounce it straight to the pupil screen
        // so this page can never expose it.
        if (found.imported) {
          navigate(`/eleve/${found.id}`, { replace: true });
          return;
        }
        setDictation(found);
      });
    return () => {
      cancelled = true;
    };
  }, [id, navigate]);

  useEffect(() => () => cancelSpeech(), []);

  function patch(changes: Partial<Dictation>) {
    setDictation((current) => (current ? { ...current, ...changes } : current));
    setDirty(true);
    setSaved(false);
  }

  async function save() {
    if (!dictation) return;
    setDictation(await saveToLibrary(dictation, account));
    setDirty(false);
    setSaved(true);
  }

  /**
   * Downloads the dictation as a .json file, for moving it to another computer
   * on a USB key when there is no camera to scan a QR code. The text is not in
   * clear inside the file — see src/lib/file.ts.
   */
  function exportFile() {
    if (!dictation) return;
    const blob = new Blob([encodeDictationFile(dictation)], { type: FILE_MIME });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = dictationFileName(dictation);
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  if (notFound) {
    return (
      <PageShell title="Dictée introuvable" backTo="/" backLabel="Mes dictées">
        <p className="text-muted">Cette dictée n&apos;existe plus sur cet appareil.</p>
      </PageShell>
    );
  }

  if (!dictation) {
    return (
      <PageShell title="Dictée" backTo="/" backLabel="Mes dictées">
        <div className="h-40 rounded-lg bg-surface-sunken animate-pulse" />
      </PageShell>
    );
  }

  return (
    <PageShell title={dictation.title} backTo="/" backLabel="Mes dictées">
      {sharesByHand && (
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <Button
            size="lg"
            icon={Play}
            onClick={() => navigate(`/eleve/${dictation.id}`)}
            className="sm:flex-1"
          >
            Donner à l&apos;élève
          </Button>
          <Button
            size="lg"
            variant="secondary"
            icon={QrCode}
            aria-expanded={showQr}
            onClick={() => setShowQr((current) => !current)}
          >
            {showQr ? 'Masquer le QR' : 'Partager par QR'}
          </Button>
          <Button size="lg" variant="secondary" icon={FileDown} onClick={exportFile}>
            Exporter (fichier)
          </Button>
        </div>
      )}

      {account && dictation.ownerId === account.id && <LockerPanel dictationId={dictation.id} />}

      {sharesByHand && showQr && (
        <Card as="section" className="mb-8">
          <QrShare dictation={dictation} />
        </Card>
      )}

      <Field label="Titre" id="title" className="mb-10">
        {(control) => (
          <Input
            {...control}
            type="text"
            value={dictation.title}
            onChange={(event) => patch({ title: event.target.value })}
            placeholder="Dictée du lundi"
          />
        )}
      </Field>

      <section className="mb-10 flex flex-col gap-3">
        <SectionTitle aside={`${dictation.segments.length} parties`}>Découpage</SectionTitle>
        <SegmentEditor
          segments={dictation.segments.map((segment) => segment.text)}
          onChange={(texts) => {
            const joined = texts.join(' ');
            patch({
              segments: reconcileSegmentIds(dictation.segments, texts, () => nanoid(8)),
              // Keep the source text in step once a word is added or fixed, but
              // leave it untouched (line breaks and all) after a mere cut or glue.
              ...(sameWords(joined, dictation.sourceText) ? {} : { sourceText: joined }),
            });
          }}
          onPreview={(text) =>
            speak(text, {
              rate: dictation.speech.rate,
              voiceURI: dictation.speech.voiceURI,
              speakPunctuation: dictation.speech.speakPunctuation ?? true,
            })
          }
        />
      </section>

      <section className={dirty || saved ? 'mb-24' : 'mb-8'}>
        <SpeechSettingsFields
          value={dictation.speech}
          onChange={(speech) => patch({ speech })}
          onPreview={() =>
            speak(dictation.segments[0]?.text ?? 'Bonjour', {
              rate: dictation.speech.rate,
              voiceURI: dictation.speech.voiceURI,
              speakPunctuation: dictation.speech.speakPunctuation ?? true,
            })
          }
        />
      </section>

      {(dirty || saved) && (
        <ActionBar>
          {saved && !dirty && (
            <span role="status" className="font-bold text-success-700 dark:text-success-300">
              Modifications enregistrées.
            </span>
          )}
          {dirty && (
            <Button icon={Save} onClick={() => void save()}>
              Enregistrer
            </Button>
          )}
        </ActionBar>
      )}
    </PageShell>
  );
}
