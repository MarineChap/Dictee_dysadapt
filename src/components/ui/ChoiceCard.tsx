import { ArrowRight, Check, Loader2, type LucideIcon } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';
import { cx } from './cx';

export type ChoiceCardProps = Omit<ComponentProps<'button'>, 'title'> & {
  icon: LucideIcon;
  title: ReactNode;
  /** A short line above the title (subject, level) */
  eyebrow?: ReactNode;
  description?: ReactNode;
  /** The call to action under the text — shows the card is clickable */
  cta?: ReactNode;
  selected?: boolean;
  loading?: boolean;
};

/** A large clickable choice (a format, a mode). The whole card is the button. */
export function ChoiceCard({
  icon: Icon,
  title,
  eyebrow,
  description,
  cta,
  selected = false,
  loading = false,
  className,
  type = 'button',
  disabled,
  ...rest
}: ChoiceCardProps) {
  return (
    <button
      type={type}
      aria-pressed={selected}
      disabled={disabled || loading}
      className={cx(
        'group text-left rounded-lg border-2 p-5 md:p-6 flex flex-col gap-3 h-full transition-colors',
        'disabled:cursor-not-allowed',
        selected
          ? 'border-primary bg-primary-muted'
          : 'border-border-strong bg-surface hover:border-primary',
        className
      )}
      {...rest}
    >
      {eyebrow && <span className="text-sm font-bold text-primary">{eyebrow}</span>}
      <span className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-3">
          {loading ? (
            <Loader2 className="size-7 shrink-0 text-primary animate-spin" aria-hidden="true" />
          ) : (
            <Icon className="size-7 shrink-0 text-primary" aria-hidden="true" />
          )}
          <span className="text-lg md:text-xl font-bold text-foreground">{title}</span>
        </span>
        {selected && <Check className="size-5 shrink-0 text-primary" aria-hidden="true" />}
      </span>
      {description && <span className="text-muted leading-relaxed flex-1">{description}</span>}
      {cta && (
        <span className="inline-flex items-center gap-1.5 font-bold text-primary underline underline-offset-4 decoration-2 group-hover:decoration-underline">
          {cta}
          <ArrowRight className="size-4" aria-hidden="true" />
        </span>
      )}
    </button>
  );
}
