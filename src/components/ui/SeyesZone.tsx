import type { ReactNode } from 'react';
import { cx } from './cx';

export interface SeyesZoneProps {
  /** One short sentence per ruled line — never wrapped (32 px per line); a
   *  line too long for a phone is clipped, so keep them short */
  lines: ReactNode[];
  /** The first line in bold ink, like a title on the page */
  emphasizeFirst?: boolean;
  /** Controls at the foot of the sheet, on unruled paper (the upload buttons) */
  children?: ReactNode;
  className?: string;
}

/**
 * Seyès school paper: each sentence sits on a main line, 32 px apart, in
 * 15 px Luciole (its x-height fills one fine interline). Only for short text
 * — a line never wraps.
 */
export function SeyesZone({ lines, emphasizeFirst = true, children, className }: SeyesZoneProps) {
  return (
    <div className={cx('rounded-sm overflow-hidden', className)}>
      <div className="bg-seyes pl-[30px] pr-5 pb-2 flex flex-col">
        {lines.map((line, i) => (
          <p key={i} className="h-8 m-0 flex items-end min-w-0">
            {/* clipped sideways only: a vertical clip would cut the descenders */}
            <span
              className={cx(
                'seyes-line block min-w-0 whitespace-nowrap overflow-x-clip text-[15px]',
                emphasizeFirst && i === 0
                  ? 'font-bold text-primary'
                  : 'text-neutral-700 dark:text-neutral-200'
              )}
            >
              {line}
            </span>
          </p>
        ))}
      </div>
      {children && <div className="bg-surface pl-[30px] pr-5 py-4">{children}</div>}
    </div>
  );
}
