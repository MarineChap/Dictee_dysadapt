import { forwardRef, useId, type ComponentProps, type ReactNode } from 'react';
import { cx } from './cx';

/** A text field's own classes — the edge reaches 3:1 (WCAG 1.4.11). */
export const inputClasses = cx(
  'w-full rounded-md border border-border-strong bg-surface px-3 py-2.5 text-base text-foreground',
  'focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/25',
  'disabled:opacity-50 disabled:cursor-not-allowed',
  'aria-invalid:border-danger-700 dark:aria-invalid:border-danger-300'
);

export interface FieldProps {
  label: ReactNode;
  /** Help under the label, read with the field (aria-describedby) */
  hint?: ReactNode;
  error?: ReactNode;
  /** Receives the id and aria props to spread on the control */
  children: (control: {
    id: string;
    'aria-describedby'?: string;
    'aria-invalid'?: true;
  }) => ReactNode;
  className?: string;
  /** A stable id for the control (tests, anchors); generated otherwise */
  id?: string;
}

/** Label + control + help + error, wired for screen readers. */
export function Field({ label, hint, error, children, className, id: fixedId }: FieldProps) {
  const generatedId = useId();
  const id = fixedId ?? generatedId;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;
  return (
    <div className={cx('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="font-bold text-foreground">
        {label}
      </label>
      {hint && (
        <p id={hintId} className="text-sm text-muted">
          {hint}
        </p>
      )}
      {children({ id, 'aria-describedby': describedBy, 'aria-invalid': error ? true : undefined })}
      {error && (
        <p id={errorId} className="text-sm font-bold text-danger-700 dark:text-danger-300">
          {error}
        </p>
      )}
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, ComponentProps<'input'>>(function Input(
  { className, ...rest },
  ref
) {
  return <input ref={ref} className={cx(inputClasses, className)} {...rest} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, ComponentProps<'textarea'>>(
  function Textarea({ className, ...rest }, ref) {
    return (
      <textarea ref={ref} className={cx(inputClasses, 'leading-relaxed', className)} {...rest} />
    );
  }
);

export const Select = forwardRef<HTMLSelectElement, ComponentProps<'select'>>(function Select(
  { className, ...rest },
  ref
) {
  return <select ref={ref} className={cx(inputClasses, 'pr-8', className)} {...rest} />;
});
