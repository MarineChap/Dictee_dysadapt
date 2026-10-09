import type { LucideIcon } from 'lucide-react';
import { cx } from './cx';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  icon?: LucideIcon;
  /** Full name when the label is short (« 2 » → « Exercice 2 — Les billes ») */
  ariaLabel?: string;
}

export interface SegmentedControlProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Names the group for screen readers */
  label: string;
  fullWidth?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

/** One choice among 2–4 views or modes (radio group drawn as tabs). */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  fullWidth = false,
  size = 'md',
  className,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cx(
        'inline-flex flex-wrap items-center gap-1 rounded-md bg-surface-sunken p-1',
        fullWidth && 'flex w-full',
        className
      )}
    >
      {options.map(({ value: v, label: l, icon: Icon, ariaLabel }) => {
        const active = v === value;
        return (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={ariaLabel}
            title={ariaLabel}
            onClick={() => onChange(v)}
            className={cx(
              'inline-flex items-center justify-center gap-1.5 rounded-sm border font-bold transition-colors',
              size === 'sm' ? 'min-h-8 px-3 text-sm' : 'min-h-9 px-4 text-sm',
              fullWidth && 'flex-1',
              active
                ? 'bg-surface border-primary text-primary'
                : 'border-transparent text-muted hover:text-primary'
            )}
          >
            {Icon && <Icon className="size-4 shrink-0" aria-hidden="true" />}
            {l}
          </button>
        );
      })}
    </div>
  );
}
