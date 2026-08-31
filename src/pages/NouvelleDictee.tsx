import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Camera,
  Check,
  Keyboard,
  Loader2,
  RotateCw,
  ScanLine,
  Sparkles,
  Volume2,
} from 'lucide-react';
import { nanoid } from 'nanoid';
import PageShell from '@/components/PageShell';
import StepIndicator from '@/components/StepIndicator';
import SegmentEditor from '@/components/SegmentEditor';
import SpeechSettingsFields from '@/components/SpeechSettingsFields';
import { canvasToBlob, prepareForOcr } from '@/lib/image';
import { recognise, terminateOcr } from '@/lib/ocr';
import { DEFAULT_SEGMENT_OPTIONS, segmentText } from '@/lib/segment';
import { putBlob, saveDictation } from '@/lib/db';
import { cancelSpeech, speak } from '@/lib/speech';
import { useSettings } from '@/hooks/useSettings';
import type { SpeechSettings } from '@/lib/types';

const STEPS = ['Photo', 'Reconnaissance', 'Vérification', 'Découpage', 'Réglages'];

type Stage = 'photo' | 'ocr' | 'texte' | 'decoupage' | 'reglages';
const STAGE_INDEX: Record<Stage, number> = {
  photo: 0,
  ocr: 1,
  texte: 2,
  decoupage: 3,
  reglages: 4,
};

/** Suggests a title from the first few words, so the teacher rarely types one. */
function suggestTitle(text: string): string {
  const words = text.replace(/\s+/g, ' ').trim().split(' ').slice(0, 5).join(' ');
  const cleaned = words.replace(/[.,;:!?…»«"]+$/, '');
  return cleaned ? `${cleaned}…` : 'Dictée sans titre';
}

export default function NouvelleDictee() {
  const navigate = useNavigate();
  const { settings } = useSettings();

  const [stage, setStage] = useState<Stage>('photo');
  // Blob and preview URL travel together so the URL is revoked exactly once.
  const [photo, setPhoto] = useState<{ blob: Blob; url: string } | null>(null);
  const [rotation, setRotation] = useState(0);
  const [progress, setProgress] = useState(0);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [ocrError, setOcrError] = useState<string | null>(null);

  const [text, setText] = useState('');
  const [segments, setSegments] = useState<string[]>([]);
  const [maxWords, setMaxWords] = useState(DEFAULT_SEGMENT_OPTIONS.maxWords);

  const [title, setTitle] = useState('');
  const [speech, setSpeech] = useState<SpeechSettings>(settings.speech);
  const [showWordCount, setShowWordCount] = useState(true);
  const [allowReveal, setAllowReveal] = useState(false);
  const [saving, setSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const processedRef = useRef<Blob | null>(null);
  const photoUrlRef = useRef<string | null>(null);

  useEffect(
    () => () => {
      if (photoUrlRef.current) URL.revokeObjectURL(photoUrlRef.current);
    },
    []
  );

  // The OCR worker holds ~8 MB of WASM; release it as soon as we leave.
  useEffect(() => () => void terminateOcr(), []);
  useEffect(() => () => cancelSpeech(), []);

  const runOcr = useCallback(async (source: Blob, rotationQuarters: number) => {
    setStage('ocr');
    setProgress(0);
    setOcrError(null);
    try {
      const canvas = await prepareForOcr(source, { rotationQuarters });
      processedRef.current = await canvasToBlob(canvas);
      const result = await recognise(canvas, setProgress);
      setConfidence(result.confidence);
      setText(result.text);
      setTitle((current) => current || suggestTitle(result.text));
      setStage('texte');
    } catch {
      setOcrError(
        'La reconnaissance a échoué. Reprenez la photo, ou saisissez le texte à la main.'
      );
      setStage('photo');
    }
  }, []);

  function onPickPhoto(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (photoUrlRef.current) URL.revokeObjectURL(photoUrlRef.current);
    photoUrlRef.current = URL.createObjectURL(file);
    setPhoto({ blob: file, url: photoUrlRef.current });
    setRotation(0);
    void runOcr(file, 0);
  }

  function rotateAndRetry() {
    if (!photo) return;
    const next = rotation + 1;
    setRotation(next);
    void runOcr(photo.blob, next);
  }

  function goToSegments() {
    setSegments(segmentText(text, { maxWords }));
    setStage('decoupage');
  }

  function resegment(nextMax: number) {
    setMaxWords(nextMax);
    setSegments(segmentText(text, { maxWords: nextMax }));
  }

  async function save() {
    setSaving(true);
    try {
      const id = nanoid(10);
      const now = Date.now();
      let imageId: string | undefined;

      if (processedRef.current) {
        imageId = `photo-${id}`;
        await putBlob(imageId, processedRef.current);
      }

      await saveDictation({
        id,
        title: title.trim() || 'Dictée sans titre',
        createdAt: now,
        updatedAt: now,
        sourceText: text.trim(),
        segments: segments.map((segmentText_) => ({ id: nanoid(8), text: segmentText_ })),
        speech,
        showWordCount,
        allowReveal,
        imageId,
      });

      await terminateOcr();
      navigate(`/dictee/${id}`, { replace: true });
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageShell title="Nouvelle dictée" backTo="/" backLabel="Mes dictées">
      <StepIndicator steps={STEPS} current={STAGE_INDEX[stage]} />

      {stage === 'photo' && (
        <div className="space-y-4">
          {ocrError && (
            <div className="flex items-start gap-3 rounded-2xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 p-4">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800 dark:text-amber-200">{ocrError}</p>
            </div>
          )}

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-primary p-12 flex flex-col items-center gap-4 transition-all active:scale-[0.99] group"
          >
            <span className="w-16 h-16 rounded-full bg-primary-muted flex items-center justify-center group-hover:scale-105 transition-transform">
              <Camera className="w-8 h-8 text-primary" />
            </span>
            <span className="text-center">
              <span className="block font-black text-slate-900 dark:text-white tracking-tight">
                Photographier l&apos;exercice
              </span>
              <span className="block text-sm text-slate-500 dark:text-slate-400 mt-1">
                Cadrez le texte bien à plat, sans ombre. Le texte est reconnu sur l&apos;appareil,
                sans connexion.
              </span>
            </span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={onPickPhoto}
            className="sr-only"
          />

          <div className="flex items-center gap-3">
            <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
              ou
            </span>
            <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
          </div>

          <button
            type="button"
            onClick={() => setStage('texte')}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-xs uppercase tracking-widest border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-primary hover:text-primary transition-all active:scale-95"
          >
            <Keyboard className="w-5 h-5" />
            Saisir le texte à la main
          </button>
        </div>
      )}

      {stage === 'ocr' && (
        <div className="relative overflow-hidden rounded-[2.5rem] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center">
          <span className="scanner-beam-active" aria-hidden="true" />
          <ScanLine className="w-10 h-10 text-primary mx-auto mb-4" />
          <p className="font-black text-slate-900 dark:text-white tracking-tight">
            Lecture du texte…
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 mb-6">
            Tout se passe sur l&apos;appareil. Cela peut prendre quelques secondes.
          </p>
          <div
            className="h-1.5 w-full max-w-xs mx-auto rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden"
            role="progressbar"
            aria-valuenow={Math.round(progress * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Progression de la reconnaissance"
          >
            <div
              className="h-full bg-primary rounded-full transition-[width] duration-300"
              style={{ width: `${Math.max(4, Math.round(progress * 100))}%` }}
            />
          </div>
        </div>
      )}

      {stage === 'texte' && (
        <div className="space-y-5">
          {confidence !== null && confidence < 75 && (
            <div className="flex items-start gap-3 rounded-2xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 p-4">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800 dark:text-amber-200">
                La photo était difficile à lire. Relisez le texte avec attention — ou reprenez la
                photo avec plus de lumière.
              </p>
            </div>
          )}

          <div>
            <label
              htmlFor="ocr-text"
              className="block text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2"
            >
              Texte de la dictée
            </label>
            <textarea
              id="ocr-text"
              value={text}
              onChange={(event) => setText(event.target.value)}
              rows={10}
              autoFocus
              placeholder="Saisissez ou corrigez le texte de la dictée…"
              className="reading-text w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 focus:border-primary bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 transition-all outline-none resize-y"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              Vérifiez la ponctuation : c&apos;est elle qui décide du découpage.
            </p>
          </div>

          {photo && (
            <details className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <summary className="cursor-pointer px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                Revoir la photo
              </summary>
              <div className="p-4 pt-0 space-y-3">
                <img
                  src={photo.url}
                  alt="Photo de l'exercice"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800"
                />
                <button
                  type="button"
                  onClick={rotateAndRetry}
                  className="flex items-center gap-2 px-4 py-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-sm font-medium transition-colors"
                >
                  <RotateCw className="w-4 h-4" />
                  Pivoter et relire
                </button>
              </div>
            </details>
          )}

          <button
            type="button"
            disabled={text.trim().length === 0}
            onClick={goToSegments}
            className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-primary/20 disabled:opacity-50 disabled:active:scale-100"
          >
            <Sparkles className="w-5 h-5" />
            Découper en parties
          </button>
        </div>
      )}

      {stage === 'decoupage' && (
        <div className="space-y-5">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
            <label
              htmlFor="max-words"
              className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3"
            >
              Longueur des parties
              <span className="text-primary">{maxWords} mots maximum</span>
            </label>
            <input
              id="max-words"
              type="range"
              min={2}
              max={8}
              step={1}
              value={maxWords}
              onChange={(event) => resegment(Number(event.target.value))}
              className="w-full accent-[var(--primary)]"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              {segments.length} partie{segments.length > 1 ? 's' : ''} — recalculées à chaque
              changement, vos retouches sont alors perdues.
            </p>
          </div>

          <SegmentEditor
            segments={segments}
            onChange={setSegments}
            onPreview={(segment) =>
              speak(segment, {
                rate: speech.rate,
                voiceURI: speech.voiceURI,
                speakPunctuation: speech.speakPunctuation ?? true,
              })
            }
          />

          <button
            type="button"
            disabled={segments.length === 0}
            onClick={() => setStage('reglages')}
            className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-primary/20 disabled:opacity-50"
          >
            <Check className="w-5 h-5" />
            Le découpage me convient
          </button>
        </div>
      )}

      {stage === 'reglages' && (
        <div className="space-y-5">
          <div>
            <label
              htmlFor="title"
              className="block text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2"
            >
              Titre
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Dictée du lundi"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 focus:border-primary bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 transition-all outline-none"
            />
          </div>

          <SpeechSettingsFields
            value={speech}
            onChange={setSpeech}
            onPreview={() =>
              speak(segments[0] ?? 'Bonjour', {
                rate: speech.rate,
                voiceURI: speech.voiceURI,
                speakPunctuation: speech.speakPunctuation ?? true,
              })
            }
          />

          <fieldset className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-3">
            <legend className="px-2 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
              Écran de l&apos;élève
            </legend>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={showWordCount}
                onChange={(event) => setShowWordCount(event.target.checked)}
                className="mt-1 w-5 h-5 rounded accent-[var(--primary)]"
              />
              <span>
                <span className="block text-sm font-bold text-slate-800 dark:text-slate-100">
                  Afficher le nombre de mots
                </span>
                <span className="block text-xs text-slate-500 dark:text-slate-400">
                  « 3 mots » sous chaque bouton. Aide à se repérer sans rien dévoiler de
                  l&apos;orthographe.
                </span>
              </span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={allowReveal}
                onChange={(event) => setAllowReveal(event.target.checked)}
                className="mt-1 w-5 h-5 rounded accent-[var(--primary)]"
              />
              <span>
                <span className="block text-sm font-bold text-slate-800 dark:text-slate-100">
                  Autoriser l&apos;auto-correction
                </span>
                <span className="block text-xs text-slate-500 dark:text-slate-400">
                  Réservé pour une prochaine version : l&apos;élève pourra révéler le texte une fois
                  toutes les parties écoutées.
                </span>
              </span>
            </label>
          </fieldset>

          <div className="flex items-center gap-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 p-4">
            <Volume2 className="w-5 h-5 text-slate-400 flex-shrink-0" />
            <p className="text-xs text-slate-500 dark:text-slate-400">
              L&apos;élève ne verra jamais le texte : uniquement des boutons « Partie 1 », « Partie
              2 »… qu&apos;il peut réécouter autant de fois qu&apos;il veut.
            </p>
          </div>

          <button
            type="button"
            disabled={saving}
            onClick={() => void save()}
            className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-primary/20 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
            Enregistrer la dictée
          </button>
        </div>
      )}
    </PageShell>
  );
}
