import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import jsQR from 'jsqr';
import { nanoid } from 'nanoid';
import { QrCode } from 'lucide-react';
import PageShell from '@/components/PageShell';
import { Button, Card, Notice } from '@/components/ui';
import { ChunkCollector, decodeChunks, parseChunk, type ImportedDictation } from '@/lib/share';
import { saveDictation } from '@/lib/db';
import { newDictationId } from '@/lib/ids';

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
    const id = newDictationId();
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
      imported: true,
    });
    navigate(`/eleve/${id}`, { replace: true });
  }

  return (
    <PageShell title="Recevoir une dictée" backTo="/" backLabel="Mes dictées">
      <div className="max-w-xl mx-auto flex flex-col gap-5">
        {status === 'idle' && (
          <Card padding="lg" className="flex flex-col items-center gap-5 text-center">
            <span className="size-14 rounded-full bg-primary-muted flex items-center justify-center">
              <QrCode className="size-7 text-primary" aria-hidden="true" />
            </span>
            <div className="flex flex-col gap-1">
              <p className="text-lg font-bold text-foreground">
                Scanner le QR code de l&apos;enseignant
              </p>
              <p className="text-muted max-w-sm">
                La dictée est copiée sur cet appareil. Aucune connexion internet n&apos;est
                nécessaire.
              </p>
            </div>
            <Button size="lg" icon={QrCode} fullWidth onClick={() => void start()}>
              Ouvrir la caméra
            </Button>
          </Card>
        )}

        {status === 'denied' && (
          <Notice
            tone="warning"
            live
            actions={<Button onClick={() => void start()}>Réessayer</Button>}
          >
            L&apos;accès à la caméra a été refusé. Autorisez-le dans les réglages du navigateur,
            puis réessayez.
          </Notice>
        )}

        <div className={status === 'scanning' ? 'flex flex-col gap-4' : 'hidden'}>
          <div className="relative overflow-hidden rounded-lg border border-border bg-black">
            <video ref={videoRef} playsInline muted className="w-full aspect-[4/3] object-cover" />
            <span className="scanner-beam-active" aria-hidden="true" />
          </div>

          {error && <Notice tone="warning">{error}</Notice>}

          {expected > 1 && (
            <p className="text-center" role="status">
              <span className="font-bold text-foreground">
                {received} code{received > 1 ? 's' : ''} sur {expected}
              </span>
              {missing.length > 0 && (
                <span className="block text-sm text-muted mt-1">
                  Il manque encore le code {missing.join(', ')}.
                </span>
              )}
            </p>
          )}

          <p className="text-center text-sm text-muted">Placez le QR code bien dans le cadre.</p>
        </div>

        {status === 'done' && imported && (
          <>
            <Notice tone="success" title={imported.title} className="animate-success">
              {imported.segments.length} parties reçues
            </Notice>
            <Button size="lg" fullWidth onClick={() => void save()}>
              Commencer la dictée
            </Button>
          </>
        )}
      </div>
    </PageShell>
  );
}
