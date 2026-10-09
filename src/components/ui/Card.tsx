import type { ComponentProps, ElementType, ReactNode } from 'react';
import { cx } from './cx';

type Padding = 'none' | 'sm' | 'md' | 'lg';
const PADDING: Record<Padding, string> = {
  none: '',
  sm: 'p-4',
  md: 'p-5 md:p-6',
  lg: 'p-6 md:p-8',
};

/** The classes of a card, for an element that must stay something else
 *  (a dropzone root, a <label> wrapping a radio). */
export function cardClasses({
  padding = 'md',
  interactive = false,
  tone = 'surface',
}: { padding?: Padding; interactive?: boolean; tone?: 'surface' | 'sunken' | 'primary' } = {}) {
  return cx(
    'rounded-lg border',
    tone === 'surface' && 'bg-surface border-border',
    tone === 'sunken' && 'bg-surface-sunken border-border',
    tone === 'primary' && 'bg-primary-muted border-primary/30',
    interactive && 'transition-colors hover:border-border-strong',
    PADDING[padding]
  );
}

export type CardProps<T extends ElementType = 'div'> = {
  as?: T;
  padding?: Padding;
  /** Hover edge for a card that is itself clickable */
  interactive?: boolean;
  tone?: 'surface' | 'sunken' | 'primary';
  children?: ReactNode;
} & Omit<ComponentProps<T>, 'as' | 'children'>;

/** A white card with a thin edge — no shadow, no big radius. */
export function Card<T extends ElementType = 'div'>({
  as,
  padding,
  interactive,
  tone,
  className,
  children,
  ...rest
}: CardProps<T>) {
  const Tag = (as ?? 'div') as ElementType;
  return (
    <Tag className={cx(cardClasses({ padding, interactive, tone }), className)} {...rest}>
      {children}
    </Tag>
  );
}
