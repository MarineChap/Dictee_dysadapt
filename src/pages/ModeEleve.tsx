import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, RotateCcw, Volume2 } from 'lucide-react';
import DictadaptLogo from '@/components/DictadaptLogo';
import { clearProgress, getDictation, getProgress, saveProgress } from '@/lib/db';
import { lockerUrl } from '@/lib/account';
import { pupilDictation, savePupilProgress } from '@/lib/remote';
import { cancelSpeech, speak } from '@/lib/speech';
import { countWords } from '@/lib/segment';
import type { Dictation } from '@/lib/types';

/**
 * The pupil's screen.
 *
 * It shows one big button per part, labelled "Partie 1", "Partie 2"… and never
 * the text: this is a dictation, the child listens and writes. Tapping plays
 * the part; tapping again replays it, as many times as needed. A part that has
 * been heard turns green, so the child always knows where they are.
 *
 * Opened from a DysAdapt locker (`/eleve/casier/:assignmentId`), the dictation
 * and the pupil's progress come from the account instead of this device.
 */
export default function ModeEleve() {
  const { id, assignmentId } = useParams<{ id: string; assignmentId: string }>();
  const navigate = useNavigate();
  // Set when the dictation comes from a student's locker in DysAdapt.
  const [lockerOf, setLockerOf] = useState<string | null>(null);

  const [dictation, setDictation] = useState<Dictation | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [listened, setListened] = useState<Set<string>>(new Set());
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const repeatTimer = useRef<number | null>(null);

  useEffect(() => {
    if (!assignmentId) return;
    let cancelled = false;
    pupilDictation(assignmentId)
      .then((pupil) => {
        if (cancelled) return;
        setLockerOf(pupil.profile_id);
        setDictation({
          id: pupil.dictation_id,
          title: pupil.title,
          createdAt: 0,
          updatedAt: 0,
          sourceText: '',
          segments: pupil.segments,
          speech: {
            rate: pupil.speech.rate,
            voiceURI: pupil.speech.voice_uri ?? undefined,
            repeatAfterMs: pupil.speech.repeat_after_ms,
            speakPunctuation: pupil.speech.speak_punctuation ?? undefined,
          },
          showWordCount: pupil.show_word_count,
          allowReveal: false,
        });
        setListened(new Set(pupil.listened));
      })
      .catch(() => {
        if (!cancelled) setNotFound(true);
      });
    return () => {
      cancelled = true;
    };
  }, [assignmentId]);

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
        speakPunctuation: dictation.speech.speakPunctuation ?? true,
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
      keepProgress([...next]);
      return next;
    });
  }

  function stop() {
    clearRepeat();
    cancelSpeech();
    setSpeakingId(null);
  }

  function keepProgress(heard: string[]) {
    if (!dictation) return;
    if (assignmentId) {
      // Best effort: the parts stay green on screen even if the save fails.
      void savePupilProgress(assignmentId, heard).catch(() => undefined);
    } else {
      void saveProgress({ dictationId: dictation.id, listened: heard, updatedAt: 0 });
    }
  }

  async function restart() {
    if (!dictation) return;
    stop();
    setListened(new Set());
    if (assignmentId) keepProgress([]);
    else await clearProgress(dictation.id);
  }

  function leave() {
    if (lockerOf) window.location.assign(lockerUrl(lockerOf));
    // Back where the teacher gave it from (the dictation, or the library).
    else if ((window.history.state?.idx ?? 0) > 0) navigate(-1);
    else navigate('/');
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="font-black text-slate-900 dark:text-white">
          {assignmentId
            ? "Cette dictée n'est plus dans ton casier."
            : "Cette dictée n'existe plus."}
        </p>
        <button
          type="button"
          onClick={() => (assignmentId ? window.history.back() : navigate('/'))}
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
          <button
            type="button"
            onClick={leave}
            aria-label="Quitter la dictée"
            className="p-2 rounded-xl text-slate-400 dark:text-slate-500 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
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
