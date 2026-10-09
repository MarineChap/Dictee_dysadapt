import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui';

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
      className="m-auto w-[calc(100vw-2rem)] max-w-md rounded-lg border border-border bg-surface text-foreground p-6 shadow-overlay backdrop:bg-black/40"
    >
      <h2 className="text-xl font-bold mb-2">{title}</h2>
      <p className="text-muted mb-6">{description}</p>
      <div className="flex flex-wrap items-center justify-end gap-3">
        <Button variant="secondary" onClick={onCancel}>
          {cancelLabel}
        </Button>
        <Button variant={destructive ? 'danger' : 'primary'} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </dialog>
  );
}
