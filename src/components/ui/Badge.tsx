import type { ReactNode } from 'react';
import { cx } from './cx';

export type Tone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger';

// Text ≥ 4.5:1 on its own tint, light and dark.
export const TONE_TEXT: Record<Tone, string> = {
  neutral: 'bg-surface-sunken text-foreground border-border',
  primary: 'bg-primary-muted text-primary border-primary/25',
  success:
    'bg-success-50 text-success-800 border-success-200 dark:bg-success-950/50 dark:text-success-200 dark:border-success-800',
  warning:
    'bg-warning-50 text-warning-900 border-warning-200 dark:bg-warning-950/50 dark:text-warning-200 dark:border-warning-800',
  danger:
    'bg-danger-50 text-danger-800 border-danger-200 dark:bg-danger-950/50 dark:text-danger-200 dark:border-danger-800',
};

export interface BadgeProps {
  tone?: Tone;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** A short label: a need of the profile, a status, a format. */
export function Badge({ tone = 'neutral', icon, children, className }: BadgeProps) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 text-sm font-bold leading-snug',
        TONE_TEXT[tone],
        className
      )}
    >
      {icon}
      {children}
    </span>
  );
}
