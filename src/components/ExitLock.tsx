import { useEffect, useRef, useState } from 'react';
import { Lock, X } from 'lucide-react';

interface ExitLockProps {
  /** Four digits set by the teacher, or '' for long-press only. */
  code: string;
  onExit: () => void;
}

const HOLD_MS = 2000;

/**
 * Leaving pupil mode.
 *
 * The dictation text is in clear on every teacher screen, so a pupil who can
 * simply tap "back" can read the answers. The way out is therefore a two-second
 * press — a gesture a child will not perform by accident — optionally followed
 * by the teacher's four-digit code.
 */
export default function ExitLock({ code, onExit }: ExitLockProps) {
  const [holding, setHolding] = useState(false);
  const [askCode, setAskCode] = useState(false);
  const [entered, setEntered] = useState('');
  const [wrong, setWrong] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => () => clearHold(), []);

  function clearHold() {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  function startHold() {
    clearHold();
    setHolding(true);
    timerRef.current = window.setTimeout(() => {
      setHolding(false);
      if (code) {
        setEntered('');
        setWrong(false);
        setAskCode(true);
      } else {
        onExit();
      }
    }, HOLD_MS);
  }

  function stopHold() {
    clearHold();
    setHolding(false);
  }

  function submitCode(event: React.FormEvent) {
    event.preventDefault();
    if (entered === code) {
      onExit();
    } else {
      setWrong(true);
      setEntered('');
    }
  }

  return (
    <>
      <button
        type="button"
        onPointerDown={startHold}
        onPointerUp={stopHold}
        onPointerLeave={stopHold}
        onPointerCancel={stopHold}
        onContextMenu={(event) => event.preventDefault()}
        aria-label="Quitter le mode élève (appui long de 2 secondes)"
        className="relative p-2 rounded-xl text-slate-300 dark:text-slate-600 hover:text-slate-500 transition-colors select-none touch-none"
      >
        <Lock className="w-5 h-5" />
        {holding && (
          <span
            aria-hidden="true"
            className="absolute inset-0 rounded-xl border-2 border-primary animate-pulse"
          />
        )}
      </button>

      {askCode && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={submitCode}
            className="w-full max-w-xs rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl p-6"
          >
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                Code enseignant
              </h2>
              <button
                type="button"
                onClick={() => setAskCode(false)}
                aria-label="Annuler"
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <input
              type="password"
              inputMode="numeric"
              autoComplete="off"
              pattern="\d{4}"
              maxLength={4}
              autoFocus
              value={entered}
              onChange={(event) => {
                setEntered(event.target.value.replace(/\D/g, ''));
                setWrong(false);
              }}
              aria-invalid={wrong}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 focus:border-primary bg-white dark:bg-slate-800 text-center text-2xl font-black tracking-[0.5em] text-slate-900 dark:text-slate-100 outline-none"
            />
            {wrong && (
              <p className="text-xs font-bold text-red-600 dark:text-red-400 mt-2 text-center">
                Code incorrect.
              </p>
            )}
            <button
              type="submit"
              className="w-full mt-4 bg-primary hover:bg-primary-hover text-white py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-primary-muted"
            >
              Quitter le mode élève
            </button>
          </form>
        </div>
      )}
    </>
  );
}
