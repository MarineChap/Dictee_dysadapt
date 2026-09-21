import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FileDown, Play, QrCode, Save } from 'lucide-react';
import PageShell from '@/components/PageShell';
import QrShare from '@/components/QrShare';
import SegmentEditor from '@/components/SegmentEditor';
import SpeechSettingsFields from '@/components/SpeechSettingsFields';
import { getDictation, saveDictation } from '@/lib/db';
import { FILE_MIME, dictationFileName, encodeDictationFile } from '@/lib/file';
import { cancelSpeech, speak } from '@/lib/speech';
import type { Dictation } from '@/lib/types';

export default function DicteeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [dictation, setDictation] = useState<Dictation | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    void getDictation(id).then((found) => {
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
    await saveDictation(dictation);
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
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Cette dictée n&apos;existe plus sur cet appareil.
        </p>
      </PageShell>
    );
  }

  if (!dictation) {
    return (
      <PageShell title="Dictée" backTo="/" backLabel="Mes dictées">
        <div className="h-40 rounded-3xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
      </PageShell>
    );
  }

  return (
    <PageShell title={dictation.title} backTo="/" backLabel="Mes dictées">
      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <button
          type="button"
          onClick={() => navigate(`/eleve/${dictation.id}`)}
          className="flex-1 flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-primary/20"
        >
          <Play className="w-5 h-5" />
          Donner à l&apos;élève
        </button>
        <button
          type="button"
          onClick={() => setShowQr((current) => !current)}
          aria-expanded={showQr}
          className="flex items-center justify-center gap-2 px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-primary hover:text-primary transition-all active:scale-95"
        >
          <QrCode className="w-5 h-5" />
          {showQr ? 'Masquer le QR' : 'Partager par QR'}
        </button>
        <button
          type="button"
          onClick={exportFile}
          className="flex items-center justify-center gap-2 px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-primary hover:text-primary transition-all active:scale-95"
        >
          <FileDown className="w-5 h-5" />
          Exporter (fichier)
        </button>
      </div>

      {showQr && (
        <section className="mb-8 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
          <QrShare dictation={dictation} />
        </section>
      )}

      <section className="mb-8">
        <label
          htmlFor="title"
          className="block text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3"
        >
          Titre
        </label>
        <input
          id="title"
          type="text"
          value={dictation.title}
          onChange={(event) => patch({ title: event.target.value })}
          placeholder="Dictée du lundi"
          className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 focus:border-primary bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 transition-all outline-none"
        />
      </section>

      <section className="mb-8">
        <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3">
          Découpage — {dictation.segments.length} parties
        </h2>
        <SegmentEditor
          segments={dictation.segments.map((segment) => segment.text)}
          onChange={(texts) =>
            patch({
              segments: texts.map((text, index) => ({
                id: dictation.segments[index]?.id ?? `seg-${index}-${Date.now()}`,
                text,
              })),
            })
          }
          onPreview={(text) =>
            speak(text, {
              rate: dictation.speech.rate,
              voiceURI: dictation.speech.voiceURI,
              speakPunctuation: dictation.speech.speakPunctuation ?? true,
            })
          }
        />
      </section>

      <section className="mb-8">
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
        <div className="thumb-zone-nav safe-bottom">
          <div className="max-w-5xl mx-auto flex items-center justify-end gap-3">
            {saved && !dirty && (
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                Modifications enregistrées.
              </span>
            )}
            {dirty && (
              <button
                type="button"
                onClick={() => void save()}
                className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-primary-muted"
              >
                <Save className="w-4 h-4" />
                Enregistrer
              </button>
            )}
          </div>
        </div>
      )}
    </PageShell>
  );
}
