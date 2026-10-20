import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, RotateCcw, Volume2 } from 'lucide-react';
import DictadaptLogo from '@/components/DictadaptLogo';
import { Button, IconButton, Notice, cx } from '@/components/ui';
import { clearProgress, getDictation, getProgress, saveProgress } from '@/lib/db';
import { fetchAccount, lockerUrl, studentCodeUrl, studentLockerUrl } from '@/lib/account';
import { pupilDictation, RemoteError, savePupilProgress, type LockerSource } from '@/lib/remote';
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
 * and the pupil's progress come from the account instead of this device:
 * through the teacher's session when one is signed in (previewing the locker),
 * else with the student's access code.
 */
export default function ModeEleve() {
  const { id, assignmentId } = useParams<{ id: string; assignmentId: string }>();
  const navigate = useNavigate();
  // Set when the dictation comes from a student's locker in DysAdapt.
  const [lockerOf, setLockerOf] = useState<string | null>(null);
  const [source, setSource] = useState<LockerSource | null>(null);
  // A student without a working code on this device (renewed, expired, forgotten).
  const [needsCode, setNeedsCode] = useState(false);

  const [dictation, setDictation] = useState<Dictation | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [listened, setListened] = useState<Set<string>>(new Set());
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const repeatTimer = useRef<number | null>(null);

  useEffect(() => {
    if (!assignmentId) return;
    let cancelled = false;
    let opener: LockerSource = 'student';
    fetchAccount()
      .then((account) => {
        opener = account ? 'teacher' : 'student';
        return pupilDictation(assignmentId, opener);
      })
      .then((pupil) => {
        if (cancelled) return;
        setSource(opener);
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
      .catch((err) => {
        if (cancelled) return;
        setSource(opener);
        if (opener === 'student' && err instanceof RemoteError && err.status === 401) {
          setNeedsCode(true);
        } else setNotFound(true);
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
      if (source) void savePupilProgress(assignmentId, heard, source).catch(() => undefined);
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
    if (source === 'student') window.location.assign(studentLockerUrl());
    else if (lockerOf) window.location.assign(lockerUrl(lockerOf));
    // Back where the teacher gave it from (the dictation, or the library).
    else if ((window.history.state?.idx ?? 0) > 0) navigate(-1);
    else navigate('/');
  }

  if (needsCode) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-lg font-bold text-foreground">Ouvre ton casier avec ton code.</p>
        <Button onClick={() => window.location.assign(studentCodeUrl())}>Taper mon code</Button>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-lg font-bold text-foreground">
          {assignmentId
            ? "Cette dictée n'est plus dans ton casier."
            : "Cette dictée n'existe plus."}
        </p>
        <Button
          onClick={() => {
            if (source === 'student') window.location.assign(studentLockerUrl());
            else if (assignmentId) window.history.back();
            else navigate('/');
          }}
        >
          Retour
        </Button>
      </div>
    );
  }

  if (!dictation) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-32 h-8 rounded-full bg-surface-sunken animate-pulse" />
      </div>
    );
  }

  const total = dictation.segments.length;
  const done = dictation.segments.filter((segment) => listened.has(segment.id)).length;
  const finished = done === total && total > 0;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="fixed top-0 w-full z-40 bg-surface border-b border-border safe-top">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
          <DictadaptLogo markSize={28} showWordmark={false} />
          <h1 className="flex-1 min-w-0 text-center text-lg font-bold text-foreground truncate">
            {dictation.title}
          </h1>
          <IconButton icon={ArrowLeft} label="Quitter la dictée" onClick={leave} />
        </div>
      </header>

      <main className="flex-1 w-full max-w-3xl mx-auto px-4 pt-24 pb-40">
        {finished && (
          <Notice tone="success" live className="animate-success mb-6 text-lg font-bold">
            Bravo, tu as écouté toute la dictée !
          </Notice>
        )}

        <ol className="grid gap-4 sm:grid-cols-2" data-testid="part-buttons">
          {dictation.segments.map((segment, index) => {
            const heard = listened.has(segment.id);
            const speaking = speakingId === segment.id;

            return (
              <li key={segment.id}>
                {/* eslint-disable-next-line design-system/prefer-ui-button -- a pupil's giant part tile, not a button of the interface */}
                <button
                  type="button"
                  onClick={() => play(segment.id, segment.text)}
                  aria-label={`Écouter la partie ${index + 1}${heard ? ', déjà écoutée' : ''}`}
                  className={cx(
                    'w-full min-h-28 rounded-lg border-2 px-5 py-6 flex items-center gap-4 text-left transition-colors',
                    speaking && 'bg-primary border-primary text-white attention-pulse',
                    !speaking &&
                      heard &&
                      'bg-success-50 border-success-700 text-success-800 dark:bg-success-950/50 dark:border-success-300 dark:text-success-200',
                    !speaking &&
                      !heard &&
                      'bg-surface border-border-strong text-foreground hover:border-primary'
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cx(
                      'size-14 rounded-full flex items-center justify-center shrink-0',
                      speaking && 'bg-surface text-primary',
                      !speaking &&
                        heard &&
                        'bg-success-700 text-white dark:bg-success-300 dark:text-success-950',
                      !speaking && !heard && 'bg-primary-muted text-primary'
                    )}
                  >
                    {heard && !speaking ? (
                      <Check className="size-7" />
                    ) : (
                      <Volume2 className="size-7" />
                    )}
                  </span>

                  <span className="min-w-0">
                    <span className="block text-2xl font-bold">Partie {index + 1}</span>
                    {dictation.showWordCount && (
                      <span className="block text-sm">
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

      <div className="fixed bottom-0 inset-x-0 z-30 bg-surface border-t border-border px-4 py-3 safe-bottom">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-foreground mb-1.5">
              {done} sur {total} écoutée{done > 1 ? 's' : ''}
            </p>
            <div
              className="h-2 rounded-full bg-surface-sunken overflow-hidden"
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
            <Button variant="secondary" onClick={stop}>
              Stop
            </Button>
          )}

          <Button
            variant="secondary"
            icon={RotateCcw}
            onClick={() => void restart()}
            // The label is hidden on narrow screens, so name the button explicitly.
            aria-label="Recommencer la dictée"
          >
            <span className="hidden sm:inline">Recommencer</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
