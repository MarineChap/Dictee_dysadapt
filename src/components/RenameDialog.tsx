import { useEffect, useRef, useState } from 'react';

interface RenameDialogProps {
  /** The name as it stands. The field opens on it, selected, ready to replace. */
  currentTitle: string;
  onRename: (title: string) => void;
  onCancel: () => void;
}

/** Long enough for "Dictée du 12 mars — les accords", short enough to stay on one line. */
const MAX_LENGTH = 80;

/**
 * Renaming a dictation. Reachable from the library, so it works whichever mode
 * the device is in: the teacher renames their own dictations, and a pupil
 * renames the copy they received by QR code without needing a teacher screen.
 *
 * Mounted only while it is open — the draft is seeded from props on mount and
 * never reset from an effect, which the hooks lint rule forbids.
 */
export default function RenameDialog({ currentTitle, onRename, onCancel }: RenameDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const [draft, setDraft] = useState(currentTitle);

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  const trimmed = draft.trim();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    // An empty name would leave an unidentifiable card in the library.
    if (!trimmed) return;
    onRename(trimmed);
  }

  return (
    <dialog
      ref={ref}
      aria-label="Renommer la dictée"
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
      onClick={(event) => {
        // Clicking the backdrop (the dialog element itself) dismisses it.
        if (event.target === ref.current) onCancel();
      }}
      className="m-auto w-[calc(100vw-2rem)] max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl backdrop:bg-black/40 backdrop:backdrop-blur-sm"
    >
      <form onSubmit={submit}>
        <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight mb-2">
          Renommer la dictée
        </h2>
        <label
          htmlFor="rename-title"
          className="block text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2"
        >
          Nom de la dictée
        </label>
        <input
          id="rename-title"
          type="text"
          autoComplete="off"
          maxLength={MAX_LENGTH}
          autoFocus
          value={draft}
          onFocus={(event) => event.target.select()}
          onChange={(event) => setDraft(event.target.value)}
          className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 focus:border-primary bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold outline-none"
        />
        <div className="flex items-center justify-end gap-2 mt-6">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-sm font-medium transition-colors"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={!trimmed}
            className="px-5 py-2 rounded-lg text-sm font-bold text-white bg-primary hover:bg-primary-hover shadow-lg shadow-primary-muted transition-all active:scale-95 disabled:opacity-40 disabled:active:scale-100"
          >
            Renommer
          </button>
        </div>
      </form>
    </dialog>
  );
}
