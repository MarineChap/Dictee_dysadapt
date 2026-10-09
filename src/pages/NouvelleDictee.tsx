import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Camera,
  Check,
  Keyboard,
  PenLine,
  RotateCw,
  ScanLine,
  Scissors,
} from 'lucide-react';
import { nanoid } from 'nanoid';
import PageShell from '@/components/PageShell';
import StepIndicator from '@/components/StepIndicator';
import SegmentEditor from '@/components/SegmentEditor';
import SpeechSettingsFields from '@/components/SpeechSettingsFields';
import { Button, Card, Field, Input, Notice, SeyesZone, Textarea } from '@/components/ui';
import { canvasToBlob, prepareForOcr } from '@/lib/image';
import { recognise, terminateOcr } from '@/lib/ocr';
import { DEFAULT_SEGMENT_OPTIONS, sameWords, segmentText } from '@/lib/segment';
import { putBlob } from '@/lib/db';
import { accountOnce } from '@/hooks/useAccount';
import { newDictationId } from '@/lib/ids';
import { saveToLibrary } from '@/lib/library';
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

  /**
   * Back to the full text for a bigger correction. Words fixed in the parts
   * are carried back; when only the cuts changed, the original text is kept
   * as typed, line breaks included. Either way the split is recomputed.
   */
  function backToText() {
    const joined = segments.join(' ');
    if (!sameWords(joined, text)) setText(joined);
    setStage('texte');
  }

  function resegment(nextMax: number) {
    setMaxWords(nextMax);
    setSegments(segmentText(text, { maxWords: nextMax }));
  }

  async function save() {
    setSaving(true);
    try {
      const id = newDictationId();
      const now = Date.now();
      let imageId: string | undefined;

      if (processedRef.current) {
        imageId = `photo-${id}`;
        await putBlob(imageId, processedRef.current);
      }

      const account = await accountOnce();
      await saveToLibrary(
        {
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
        },
        account
      );

      await terminateOcr();
      navigate(`/dictee/${id}`, { replace: true });
    } finally {
      setSaving(false);
    }
  }

  const checkbox = 'mt-1 size-5 shrink-0';

  return (
    <PageShell title="Nouvelle dictée" backTo="/" backLabel="Mes dictées">
      <div className="max-w-3xl mx-auto">
        <StepIndicator steps={STEPS} current={STAGE_INDEX[stage]} />

        {stage === 'photo' && (
          <div className="flex flex-col gap-4">
            {ocrError && (
              <Notice tone="warning" live>
                {ocrError}
              </Notice>
            )}

            {/* The same sheet of school paper as DysAdapt's upload */}
            <Card padding="none" className="overflow-hidden">
              <SeyesZone
                lines={[
                  'Posez la dictée ici',
                  'Une photo de l’exercice, bien à plat.',
                  'Le texte est lu sur l’appareil.',
                ]}
              >
                <div className="flex flex-wrap gap-3">
                  <Button icon={Camera} onClick={() => fileInputRef.current?.click()}>
                    Photographier l&apos;exercice
                  </Button>
                  <Button variant="secondary" icon={Keyboard} onClick={() => setStage('texte')}>
                    Saisir le texte à la main
                  </Button>
                </div>
              </SeyesZone>
            </Card>
            <p className="text-sm text-muted">
              Cadrez le texte sans ombre. La reconnaissance se fait sur l&apos;appareil, sans
              connexion.
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={onPickPhoto}
              className="sr-only"
              tabIndex={-1}
              aria-hidden="true"
            />
          </div>
        )}

        {stage === 'ocr' && (
          <Card
            padding="lg"
            className="relative overflow-hidden flex flex-col items-center gap-2 text-center"
          >
            <span className="scanner-beam-active" aria-hidden="true" />
            <ScanLine className="size-10 text-primary" aria-hidden="true" />
            <p className="text-lg font-bold text-foreground">Lecture du texte…</p>
            <p className="text-muted mb-4">
              Tout se passe sur l&apos;appareil. Cela peut prendre quelques secondes.
            </p>
            <div
              className="h-2 w-full max-w-xs rounded-full bg-surface-sunken overflow-hidden"
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
          </Card>
        )}

        {stage === 'texte' && (
          <div className="flex flex-col gap-6">
            {confidence !== null && confidence < 75 && (
              <Notice tone="warning">
                La photo était difficile à lire. Relisez le texte avec attention — ou reprenez la
                photo avec plus de lumière.
              </Notice>
            )}

            <Field label="Titre" id="title">
              {(control) => (
                <Input
                  {...control}
                  type="text"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Dictée du lundi"
                />
              )}
            </Field>

            <Field
              label="Texte de la dictée"
              id="ocr-text"
              hint="Vérifiez la ponctuation : c'est elle qui décide du découpage."
            >
              {(control) => (
                <Textarea
                  {...control}
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  rows={10}
                  autoFocus
                  placeholder="Saisissez ou corrigez le texte de la dictée…"
                  className="reading-text resize-y"
                />
              )}
            </Field>

            {photo && (
              <details className="rounded-lg border border-border bg-surface overflow-hidden">
                <summary className="cursor-pointer px-4 py-3 font-bold text-foreground hover:bg-surface-sunken">
                  Revoir la photo
                </summary>
                <div className="p-4 pt-0 flex flex-col gap-3">
                  <img
                    src={photo.url}
                    alt="Photo de l'exercice"
                    className="w-full rounded-md border border-border"
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={RotateCw}
                    onClick={rotateAndRetry}
                    className="self-start"
                  >
                    Pivoter et relire
                  </Button>
                </div>
              </details>
            )}

            <Button
              size="lg"
              icon={Scissors}
              disabled={text.trim().length === 0}
              onClick={goToSegments}
              className="sm:self-end"
            >
              Découper en parties
            </Button>
          </div>
        )}

        {stage === 'decoupage' && (
          <div className="flex flex-col gap-6">
            <Card className="flex flex-col gap-2">
              <label
                htmlFor="max-words"
                className="flex items-center justify-between gap-3 font-bold text-foreground"
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
                aria-describedby="max-words-hint"
                onChange={(event) => resegment(Number(event.target.value))}
                className="w-full"
              />
              <p id="max-words-hint" className="text-sm text-muted">
                {segments.length} partie{segments.length > 1 ? 's' : ''} — recalculées à chaque
                changement, vos retouches sont alors perdues.
              </p>
            </Card>

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

            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex flex-col gap-1">
                <Button
                  variant="secondary"
                  icon={PenLine}
                  onClick={backToText}
                  className="sm:self-start"
                >
                  Revenir au texte
                </Button>
                <p className="text-sm text-muted">
                  Le découpage sera recalculé quand vous reviendrez ici.
                </p>
              </div>
              <Button
                size="lg"
                icon={Check}
                disabled={segments.length === 0}
                onClick={() => setStage('reglages')}
              >
                Le découpage me convient
              </Button>
            </div>
          </div>
        )}

        {stage === 'reglages' && (
          <div className="flex flex-col gap-6">
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

            <fieldset className="rounded-lg border border-border bg-surface p-4 sm:p-5 flex flex-col gap-4">
              <legend className="px-2 font-bold text-foreground">Écran de l&apos;élève</legend>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showWordCount}
                  onChange={(event) => setShowWordCount(event.target.checked)}
                  className={checkbox}
                />
                <span>
                  <span className="block font-bold text-foreground">
                    Afficher le nombre de mots
                  </span>
                  <span className="block text-sm text-muted">
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
                  className={checkbox}
                />
                <span>
                  <span className="block font-bold text-foreground">
                    Autoriser l&apos;auto-correction
                  </span>
                  <span className="block text-sm text-muted">
                    Réservé pour une prochaine version : l&apos;élève pourra révéler le texte une
                    fois toutes les parties écoutées.
                  </span>
                </span>
              </label>
            </fieldset>

            <Notice tone="neutral">
              L&apos;élève ne verra jamais le texte : uniquement des boutons « Partie 1 », « Partie
              2 »… qu&apos;il peut réécouter autant de fois qu&apos;il veut.
            </Notice>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-3">
              <Button
                variant="secondary"
                icon={ArrowLeft}
                disabled={saving}
                onClick={() => setStage('decoupage')}
              >
                Revenir au découpage
              </Button>
              <Button size="lg" icon={Check} loading={saving} onClick={() => void save()}>
                Enregistrer la dictée
              </Button>
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
}
