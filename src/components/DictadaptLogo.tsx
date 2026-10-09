import { useId } from 'react';

interface DictadaptLogoProps {
  /** Height of the book mark, in px; the wordmark follows it */
  markSize?: number;
  showWordmark?: boolean;
  /** The name only from 640 px up: a phone's bar keeps the book */
  compactOnPhone?: boolean;
  className?: string;
}

/**
 * Sibling of DysadaptLogo: the same ink book, its ruled lines turned into a
 * sound wave (this tool reads aloud), and the name in school cursive
 * (Marelle, bundled for offline use). Drawn in currentColor (text-primary).
 */
export default function DictadaptLogo({
  markSize = 28,
  showWordmark = true,
  compactOnPhone = false,
  className = '',
}: DictadaptLogoProps) {
  const maskId = `dt-wave-${useId().replace(/:/g, '')}`;

  return (
    <span className={`inline-flex items-center gap-2 text-primary ${className}`}>
      <svg
        width={markSize}
        height={markSize}
        viewBox="0 0 100 100"
        aria-hidden="true"
        className="shrink-0"
      >
        <defs>
          {/* The wave is cut out of the pages, so it shows the page behind */}
          <mask id={maskId}>
            <rect width="100" height="100" fill="white" />
            <path
              d="M18 50 V 58 M27 44 V 64 M36 40 V 68 M64 40 V 68 M73 44 V 64 M82 50 V 58"
              stroke="black"
              strokeWidth="4"
              strokeLinecap="round"
            />
          </mask>
        </defs>
        <g fill="currentColor" mask={`url(#${maskId})`}>
          <path d="M9 22 C 12 21, 30 20, 41 26 L 47 30 L 47 88 L 41 85 C 30 80, 14 80, 11 81 C 9.5 81, 9 79.5, 9 78 Z" />
          <path d="M91 22 C 88 21, 70 20, 59 26 L 53 30 L 53 88 L 59 85 C 70 80, 86 80, 89 81 C 90.5 81, 91 79.5, 91 78 Z" />
        </g>
      </svg>
      {showWordmark && (
        // Marelle's descenders (the p) hang low: a smaller size and a lift keep
        // the name inside the bar, centred on the book like DysAdapt's.
        <span
          className={`leading-none -translate-y-[0.12em] ${compactOnPhone ? 'hidden sm:inline' : ''}`}
          style={{ fontFamily: 'Marelle, cursive', fontSize: markSize * 0.78 }}
        >
          dictadapt
        </span>
      )}
    </span>
  );
}
