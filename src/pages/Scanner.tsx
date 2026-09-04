import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import jsQR from 'jsqr';
import { nanoid } from 'nanoid';
import { AlertTriangle, Check, QrCode } from 'lucide-react';
import PageShell from '@/components/PageShell';
import { ChunkCollector, decodeChunks, parseChunk, type ImportedDictation } from '@/lib/share';
import { saveDictation } from '@/lib/db';

type Status = 'idle' | 'scanning' | 'denied' | 'done';

export default function Scanner() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const collectorRef = useRef(new ChunkCollector());

  const [status, setStatus] = useState<Status>('idle');
  const [received, setReceived] = useState(0);
  const [expected, setExpected] = useState(0);
  const [missing, setMissing] = useState<number[]>([]);
  const [imported, setImported] = useState<ImportedDictation | null>(null);
  const [error, setError] = useState<string | null>(null);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => stop, [stop]);

  /**
   * The decode loop lives inside an effect so it never has to reference itself
   * across renders: it starts when the camera is live and is torn down the
   * moment the status changes.
   */
  useEffect(() => {
    if (status !== 'scanning') return;
    let frame = 0;
    let stopped = false;

    const loop = () => {
      if (stopped) return;
      const video = videoRef.current;

      if (video && video.readyState === video.HAVE_ENOUGH_DATA) {
        const canvas = (canvasRef.current ??= document.createElement('canvas'));
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const found = jsQR(image.data, image.width, image.height, {
            inversionAttempts: 'dontInvert',
          });
          const header = found ? parseChunk(found.data) : null;

          if (header) {
            const collector = collectorRef.current;
            collector.add(header);
            setReceived(collector.received);
            setExpected(collector.expected);
            setMissing(collector.missing);

            if (collector.complete) {
              try {
                setImported(decodeChunks(collector.ordered()));
                setStatus('done');
                stop();
                return;
              } catch {
                setError("Ce QR code n'a pas pu être lu. Demandez à le réafficher.");
                collector.reset();
                setReceived(0);
                setExpected(0);
              }
            }
          }
        }
      }

      frame = requestAnimationFrame(loop);
    };

    frame = requestAnimationFrame(loop);
    return () => {
      stopped = true;
      cancelAnimationFrame(frame);
    };
  }, [status, stop]);

  async function start() {
    setError(null);
    collectorRef.current.reset();
    setReceived(0);
    setExpected(0);
    setMissing([]);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      setStatus('scanning');
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        await video.play();
      }
    } catch {
      setStatus('denied');
    }
  }

  async function save() {
    if (!imported) return;
    const id = nanoid(10);
    const now = Date.now();
    await saveDictation({
      id,
      title: imported.title,
      createdAt: now,
      updatedAt: now,
      // The pupil's device receives the parts, never the original text: there
      // is nothing to reveal and nothing to recopy.
      sourceText: '',
      segments: imported.segments.map((text) => ({ id: nanoid(8), text })),
      speech: imported.speech,
      showWordCount: imported.showWordCount,
      allowReveal: imported.allowReveal,
      // A received copy only ever opens in pupil mode. It stays in the library,
      // so the pupil can come back to it without scanning the code again.
      origin: 'received',
    });
    navigate(`/eleve/${id}`, { replace: true });
  }

  return (
    <PageShell title="Recevoir une dictée" backTo="/" backLabel="Mes dictées">
      {status === 'idle' && (
        <div className="space-y-4">
          <div className="rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-slate-700 p-12 text-center">
            <span className="w-16 h-16 rounded-full bg-primary-muted flex items-center justify-center mx-auto mb-4">
              <QrCode className="w-8 h-8 text-primary" />
            </span>
            <p className="font-black text-slate-900 dark:text-white tracking-tight">
              Scanner le QR code de l&apos;enseignant
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              La dictée est copiée sur cet appareil et rangée dans « Mes dictées » : elle
              s&apos;ouvre directement en mode élève, autant de fois que nécessaire. Aucune
              connexion internet n&apos;est nécessaire.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void start()}
            className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-primary/20"
          >
            <QrCode className="w-5 h-5" />
            Ouvrir la caméra
          </button>
        </div>
      )}

      {status === 'denied' && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 p-4">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-amber-800 dark:text-amber-200">
              L&apos;accès à la caméra a été refusé. Autorisez-le dans les réglages du navigateur,
              puis réessayez.
            </p>
            <button
              type="button"
              onClick={() => void start()}
              className="mt-3 bg-primary hover:bg-primary-hover text-white px-5 py-2 rounded-lg text-sm font-bold shadow-lg shadow-primary-muted transition-all active:scale-95"
            >
              Réessayer
            </button>
          </div>
        </div>
      )}

      <div className={status === 'scanning' ? 'space-y-4' : 'hidden'}>
        <div className="relative overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 bg-black">
          <video ref={videoRef} playsInline muted className="w-full aspect-[4/3] object-cover" />
          <span className="scanner-beam-active" aria-hidden="true" />
        </div>

        {error && (
          <p className="rounded-2xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 p-4 text-sm text-amber-800 dark:text-amber-200">
            {error}
          </p>
        )}

        {expected > 1 && (
          <p className="text-center text-sm text-slate-600 dark:text-slate-300">
            <span className="font-black">
              {received} code{received > 1 ? 's' : ''} sur {expected}
            </span>
            {missing.length > 0 && (
              <span className="block text-xs text-slate-500 dark:text-slate-400 mt-1">
                Il manque encore le code {missing.join(', ')}.
              </span>
            )}
          </p>
        )}

        <p className="text-center text-xs text-slate-500 dark:text-slate-400">
          Placez le QR code bien dans le cadre.
        </p>
      </div>

      {status === 'done' && imported && (
        <div className="space-y-5">
          <div className="animate-success flex items-center gap-3 rounded-3xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/30 p-5">
            <span className="w-11 h-11 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
              <Check className="w-6 h-6 text-white" />
            </span>
            <div className="min-w-0">
              <p className="font-black text-emerald-800 dark:text-emerald-200 tracking-tight truncate">
                {imported.title}
              </p>
              <p className="text-xs text-emerald-700 dark:text-emerald-300">
                {imported.segments.length} parties reçues · rangée dans « Mes dictées »
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void save()}
            className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-primary/20"
          >
            Commencer la dictée
          </button>
        </div>
      )}
    </PageShell>
  );
}
