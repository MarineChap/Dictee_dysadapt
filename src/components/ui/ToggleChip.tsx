import { Check } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';
import { cx } from './cx';

export type ToggleChipProps = Omit<ComponentProps<'button'>, 'onChange'> & {
  pressed: boolean;
  children: ReactNode;
};

/** An on/off choice among several (aria-pressed). Selected = ink edge + tick. */
export function ToggleChip({
  pressed,
  children,
  className,
  type = 'button',
  ...rest
}: ToggleChipProps) {
  return (
    <button
      type={type}
      aria-pressed={pressed}
      className={cx(
        'inline-flex items-center gap-1.5 min-h-10 px-3 py-2 rounded-md border text-left transition-colors',
        pressed
          ? 'bg-primary-muted border-primary text-primary font-bold'
          : 'bg-surface border-border-strong text-foreground hover:border-primary',
        className
      )}
      {...rest}
    >
      {pressed && <Check className="size-4 shrink-0" aria-hidden="true" />}
      {children}
    </button>
  );
}
