import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Check, RotateCcw, Volume2 } from 'lucide-react';
import DictadaptLogo from '@/components/DictadaptLogo';
import ExitLock from '@/components/ExitLock';
import { clearProgress, getDictation, getProgress, saveProgress } from '@/lib/db';
import { cancelSpeech, speak } from '@/lib/speech';
import { countWords } from '@/lib/segment';
import { readSettings } from '@/lib/storage';
import type { Dictation } from '@/lib/types';

/**
 * The pupil's screen.
 *
 * It shows one big button per part, labelled "Partie 1", "Partie 2"… and never
 * the text: this is a dictation, the child listens and writes. Tapping plays
 * the part; tapping again replays it, as many times as needed. A part that has
 * been heard turns green, so the child always knows where they are.
 */
export default function ModeEleve() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [dictation, setDictation] = useState<Dictation | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [listened, setListened] = useState<Set<string>>(new Set());
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  // Read once at mount: changing the code mid-dictation would be surprising.
  const [exitCode] = useState(() => readSettings().exitCode);
  const repeatTimer = useRef<number | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    void (async () => {
      const [found, progress] = await Promise.all([getDictation(id), getProgress(id)]);
      if (cancelled) return;
      if (!found) {
        setNotFound(true);
        return;
      }
      setDictation(found);
      setListened(new Set(progress.listened));
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  function clearRepeat() {
    if (repeatTimer.current !== null) {
      window.clearTimeout(repeatTimer.current);
      repeatTimer.current = null;
    }
  }

  // Nothing should keep talking once the pupil leaves the screen.
  useEffect(
    () => () => {
      cancelSpeech();
      if (repeatTimer.current !== null) window.clearTimeout(repeatTimer.current);
    },
    []
  );

  /**
   * Plays one part and, when auto-repeat is on, schedules the next reading.
   * `readAloud` is local so the repeat loop needs no memoised self-reference.
   */
  function play(segmentId: string, text: string) {
    if (!dictation) return;
    clearRepeat();
    setSpeakingId(segmentId);

    const readAloud = () => {
      speak(text, {
        rate: dictation.speech.rate,
        voiceURI: dictation.speech.voiceURI,
        onEnd: () => {
          setSpeakingId((current) => (current === segmentId ? null : current));
          if (dictation.speech.repeatAfterMs > 0) {
            repeatTimer.current = window.setTimeout(readAloud, dictation.speech.repeatAfterMs);
          }
        },
        onError: () => setSpeakingId((current) => (current === segmentId ? null : current)),
      });
    };

    readAloud();

    setListened((current) => {
      if (current.has(segmentId)) return current;
      const next = new Set(current);
      next.add(segmentId);
      void saveProgress({ dictationId: dictation.id, listened: [...next], updatedAt: 0 });
      return next;
    });
  }

  function stop() {
    clearRepeat();
    cancelSpeech();
    setSpeakingId(null);
  }

  async function restart() {
    if (!dictation) return;
    stop();
    setListened(new Set());
    await clearProgress(dictation.id);
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="font-black text-slate-900 dark:text-white">
          Cette dictée n&apos;existe plus.
        </p>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="bg-primary hover:bg-primary-hover text-white px-5 py-2 rounded-lg text-sm font-bold shadow-lg shadow-primary-muted transition-all active:scale-95"
        >
          Retour
        </button>
      </div>
    );
  }

  if (!dictation) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-32 h-8 rounded-full bg-slate-100 dark:bg-slate-800 animate-pulse" />
      </div>
    );
  }

  const total = dictation.segments.length;
  const done = dictation.segments.filter((segment) => listened.has(segment.id)).length;
  const finished = done === total && total > 0;

  return (
    <div className="min-h-screen bg-background flex flex-col transition-colors duration-300">
      <header className="fixed top-0 w-full z-40 bg-background/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 safe-top">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
          <DictadaptLogo markSize={28} showWordmark={false} />
          <p className="flex-1 min-w-0 text-center font-black text-slate-900 dark:text-white tracking-tight truncate">
            {dictation.title}
          </p>
          <ExitLock code={exitCode} onExit={() => navigate(`/dictee/${dictation.id}`)} />
        </div>
      </header>

      <main className="flex-1 w-full max-w-3xl mx-auto px-4 pt-24 pb-40">
        {finished && (
          <div className="animate-success mb-6 flex items-center gap-3 rounded-3xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/30 p-5">
            <span className="w-11 h-11 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
              <Check className="w-6 h-6 text-white" />
            </span>
            <p className="font-black text-emerald-800 dark:text-emerald-200 tracking-tight">
              Bravo, tu as écouté toute la dictée !
            </p>
          </div>
        )}

        <ol className="grid gap-4 sm:grid-cols-2" data-testid="part-buttons">
          {dictation.segments.map((segment, index) => {
            const heard = listened.has(segment.id);
            const speaking = speakingId === segment.id;

            return (
              <li key={segment.id}>
                <button
                  type="button"
                  onClick={() => play(segment.id, segment.text)}
                  aria-label={`Écouter la partie ${index + 1}${heard ? ', déjà écoutée' : ''}`}
                  className={`w-full min-h-28 rounded-3xl border-2 px-5 py-6 flex items-center gap-4 text-left transition-all active:scale-[0.97] ${
                    speaking
                      ? 'bg-primary border-primary text-white shadow-lg shadow-primary-muted attention-pulse'
                      : heard
                        ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-400 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white hover:border-primary'
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 transition-colors ${
                      speaking
                        ? 'bg-white/20 text-white'
                        : heard
                          ? 'bg-emerald-500 text-white'
                          : 'bg-primary-muted text-primary'
                    }`}
                  >
                    {heard && !speaking ? (
                      <Check className="w-7 h-7" />
                    ) : (
                      <Volume2 className="w-7 h-7" />
                    )}
                  </span>

                  <span className="min-w-0">
                    <span className="block text-2xl font-black tracking-tight">
                      Partie {index + 1}
                    </span>
                    {dictation.showWordCount && (
                      <span
                        className={`block text-xs font-bold ${
                          speaking
                            ? 'text-white/80'
                            : heard
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-slate-400 dark:text-slate-500'
                        }`}
                      >
                        {countWords(segment.text)} mot{countWords(segment.text) > 1 ? 's' : ''}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </main>

      <div className="thumb-zone-nav safe-bottom">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1.5">
              {done} sur {total} écoutée{done > 1 ? 's' : ''}
            </p>
            <div
              className="h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden"
              role="progressbar"
              aria-valuenow={done}
              aria-valuemin={0}
              aria-valuemax={total}
              aria-label="Progression de la dictée"
            >
              <div
                className="h-full bg-primary rounded-full transition-[width] duration-300"
                style={{ width: `${total === 0 ? 0 : (done / total) * 100}%` }}
              />
            </div>
          </div>

          {speakingId !== null && (
            <button
              type="button"
              onClick={stop}
              className="px-5 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 transition-all active:scale-95"
            >
              Stop
            </button>
          )}

          <button
            type="button"
            onClick={() => void restart()}
            // The label is hidden on narrow screens, so name the button explicitly.
            aria-label="Recommencer la dictée"
            className="flex items-center gap-2 px-5 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-primary hover:text-primary transition-all active:scale-95"
          >
            <RotateCcw className="w-4 h-4" />
            <span className="hidden sm:inline">Recommencer</span>
          </button>
        </div>
      </div>
    </div>
  );
}
