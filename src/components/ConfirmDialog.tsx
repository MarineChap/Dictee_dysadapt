import { useEffect, useRef } from 'react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Small modal built on the native <dialog>: DysAdapt uses Radix, but this app
 * has exactly one dialog shape and the platform element already gives us the
 * focus trap, the backdrop and Escape handling for free.
 */
export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Annuler',
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
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
      <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight mb-2">
        {title}
      </h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{description}</p>
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-sm font-medium transition-colors"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className={`px-5 py-2 rounded-lg text-sm font-bold text-white shadow-lg transition-all active:scale-95 ${
            destructive
              ? 'bg-red-600 hover:bg-red-700 shadow-red-600/20'
              : 'bg-primary hover:bg-primary-hover shadow-primary-muted'
          }`}
        >
          {confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
