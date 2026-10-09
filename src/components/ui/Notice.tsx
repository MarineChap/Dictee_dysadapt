import type { ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Info, XCircle, type LucideIcon } from 'lucide-react';
import { TONE_TEXT, type Tone } from './Badge';
import { cx } from './cx';

const ICON: Record<Tone, LucideIcon> = {
  neutral: Info,
  primary: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: XCircle,
};

export interface NoticeProps {
  tone?: Tone;
  title?: ReactNode;
  children?: ReactNode;
  /** Buttons or links under the text */
  actions?: ReactNode;
  /** role="alert" for an error that appears after an action */
  live?: boolean;
  className?: string;
}

/** A message box: information, success, warning, error. */
export function Notice({
  tone = 'primary',
  title,
  children,
  actions,
  live,
  className,
}: NoticeProps) {
  const Icon = ICON[tone];
  return (
    <div
      role={live ? (tone === 'danger' ? 'alert' : 'status') : undefined}
      className={cx(
        'flex gap-3 rounded-lg border p-4 text-base leading-relaxed',
        TONE_TEXT[tone],
        className
      )}
    >
      <Icon size={20} className="shrink-0 mt-0.5" aria-hidden="true" />
      <div className="flex flex-col gap-1 min-w-0">
        {title && <p className="font-bold">{title}</p>}
        {children && <div>{children}</div>}
        {actions && <div className="flex flex-wrap gap-2 mt-2">{actions}</div>}
      </div>
    </div>
  );
}
