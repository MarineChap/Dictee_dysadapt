import type { ReactNode } from 'react';
import { cx } from './cx';

type Level = 1 | 2 | 3;
type Size = 'sm' | 'md' | 'lg' | 'xl' | '2xl';
const SIZE: Record<Size, string> = {
  sm: 'text-base md:text-lg',
  md: 'text-lg md:text-xl',
  lg: 'text-2xl md:text-3xl',
  xl: 'text-3xl md:text-4xl',
  '2xl': 'text-4xl md:text-5xl',
};
const SIZE_OF_LEVEL: Record<Level, Size> = { 1: 'lg', 2: 'md', 3: 'sm' };

export interface SectionTitleProps {
  children: ReactNode;
  /** Heading level (h1–h3), for the document outline */
  level?: Level;
  /** Visual size; follows the level unless set (a landing page's h2 is large) */
  size?: Size;
  /** Only the page title (level 1) is underlined by default; 'double' is reserved
   *  for a child's name, like a title in a school notebook */
  underline?: 'single' | 'double' | 'none';
  /** Text after the title, on the same line (class, needs…) */
  aside?: ReactNode;
  icon?: ReactNode;
  id?: string;
  className?: string;
}

/** A title; the page title is underlined with the blue pen, hugging the text width. */
export function SectionTitle({
  children,
  level = 2,
  size,
  underline,
  aside,
  icon,
  id,
  className,
}: SectionTitleProps) {
  const Tag = `h${level}` as const;
  const line = underline ?? (level === 1 ? 'single' : 'none');
  return (
    <div className={cx('flex flex-wrap items-end gap-x-3 gap-y-1', className)}>
      <Tag
        id={id}
        className={cx(
          'm-0 font-bold leading-snug text-foreground inline-flex items-center gap-2',
          SIZE[size ?? SIZE_OF_LEVEL[level]],
          level === 1 && 'text-primary',
          line === 'single' && 'border-b-2 border-underline pb-1',
          line === 'double' && 'border-b-[6px] border-double border-underline pb-1'
        )}
      >
        {icon}
        {children}
      </Tag>
      {aside && <span className="text-muted text-base pb-1.5">{aside}</span>}
    </div>
  );
}
