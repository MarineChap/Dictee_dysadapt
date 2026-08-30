import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { encodeDictation } from '@/lib/share';
import type { Dictation } from '@/lib/types';

interface QrShareProps {
  dictation: Dictation;
}

/**
 * Shows the dictation as one or more QR codes. Long texts need several, so the
 * teacher steps through them while the pupil scans each in turn — no file
 * sharing, no network, nothing to install.
 */
export default function QrShare({ dictation }: QrShareProps) {
  // One state object keyed by the dictation it describes: the effect only ever
  // writes it asynchronously, and "still loading" is simply the key not matching.
  const [result, setResult] = useState<{
    source: Dictation;
    images?: string[];
    error?: string;
  } | null>(null);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const chunks = encodeDictation(dictation);
        const images = await Promise.all(
          chunks.map((chunk) =>
            QRCode.toDataURL(chunk, {
              errorCorrectionLevel: 'L',
              margin: 2,
              width: 512,
              color: { dark: '#0f172a', light: '#ffffff' },
            })
          )
        );
        if (cancelled) return;
        setResult({ source: dictation, images });
        setIndex(0);
      } catch {
        if (cancelled) return;
        setResult({
          source: dictation,
          error: 'Ce texte est trop long pour être partagé par QR code.',
        });
        setIndex(0);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [dictation]);

  const current = result?.source === dictation ? result : null;
  const error = current?.error ?? null;
  const images = current?.images ?? null;

  if (error) {
    return (
      <p className="rounded-2xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 p-4 text-sm text-amber-800 dark:text-amber-200">
        {error}
      </p>
    );
  }

  if (!images) {
    return (
      <div className="flex items-center justify-center gap-2 p-12 text-slate-400">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm font-medium">Préparation du QR code…</span>
      </div>
    );
  }

  const multi = images.length > 1;

  return (
    <div className="flex flex-col items-center gap-4">
      {/* White plate: a QR code must stay black-on-white even in dark theme. */}
      <div className="rounded-3xl bg-white p-4 shadow-sm border border-slate-200 dark:border-slate-800">
        <img
          src={images[index]}
          alt={
            multi
              ? `QR code ${index + 1} sur ${images.length} de la dictée ${dictation.title}`
              : `QR code de la dictée ${dictation.title}`
          }
          className="w-56 h-56 sm:w-64 sm:h-64"
        />
      </div>

      {multi && (
        <>
          <div className="flex items-center gap-4">
            <button
              type="button"
              disabled={index === 0}
              onClick={() => setIndex((i) => i - 1)}
              aria-label="QR code précédent"
              className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
              Code {index + 1} sur {images.length}
            </span>
            <button
              type="button"
              disabled={index === images.length - 1}
              onClick={() => setIndex((i) => i + 1)}
              aria-label="QR code suivant"
              className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          <p className="text-xs text-center text-slate-500 dark:text-slate-400 max-w-xs">
            Ce texte tient sur {images.length} codes. Faites-les scanner l&apos;un après
            l&apos;autre — l&apos;ordre n&apos;a pas d&apos;importance.
          </p>
        </>
      )}

      {!multi && (
        <p className="text-xs text-center text-slate-500 dark:text-slate-400 max-w-xs">
          Sur l&apos;appareil de l&apos;élève, ouvrez Dictadapt puis{' '}
          <span className="font-bold">Recevoir un QR code</span>.
        </p>
      )}
    </div>
  );
}
