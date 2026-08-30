import { useId } from 'react';

interface DictadaptLogoProps {
  markSize?: number;
  showWordmark?: boolean;
  wordmarkClass?: string;
  className?: string;
}

/**
 * Sibling of DysadaptLogo: same open book, same brand gradient, with the
 * central sparkle replaced by a sound wave — this tool speaks.
 */
export default function DictadaptLogo({
  markSize = 28,
  showWordmark = true,
  wordmarkClass = 'text-xl font-black tracking-tighter text-slate-900 dark:text-white italic lowercase leading-none',
  className = '',
}: DictadaptLogoProps) {
  const uid = useId().replace(/:/g, '');
  const gradId = `dtG-${uid}`;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg
        width={markSize}
        height={markSize}
        viewBox="0 0 100 100"
        aria-hidden="true"
        style={{ flexShrink: 0 }}
      >
        <style>{`
          .dt-page-${uid} { fill: #1e1b4b; }
          :where(.dark, .dark *) .dt-page-${uid} { fill: #4f46e5; }
        `}</style>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#e9d5ff" />
            <stop offset="45%" stopColor="#a855f7" />
            <stop offset="100%" stopColor="#7c3aed" />
          </linearGradient>
        </defs>
        {/* Left book page */}
        <path
          className={`dt-page-${uid}`}
          d="M9 22 C 12 21, 30 20, 41 26 L 47 30 L 47 88 L 41 85 C 30 80, 14 80, 11 81 C 9.5 81, 9 79.5, 9 78 Z"
        />
        {/* Right book page */}
        <path
          className={`dt-page-${uid}`}
          d="M91 22 C 88 21, 70 20, 59 26 L 53 30 L 53 88 L 59 85 C 70 80, 86 80, 89 81 C 90.5 81, 91 79.5, 91 78 Z"
        />
        <rect x="48.5" y="28" width="3" height="58" rx="1.5" fill="rgba(255,255,255,.05)" />
        {/* Sound wave: five bars rising out of the spine — the tool reads aloud */}
        <g fill={`url(#${gradId})`}>
          <rect x="28" y="46" width="6" height="9" rx="3" />
          <rect x="38" y="39" width="6" height="23" rx="3" />
          <rect x="47" y="31" width="6" height="39" rx="3" />
          <rect x="56" y="39" width="6" height="23" rx="3" />
          <rect x="66" y="46" width="6" height="9" rx="3" />
        </g>
        <rect x="47" y="38" width="6" height="12" rx="3" fill="#fff" opacity=".3" />
      </svg>
      {showWordmark && <span className={wordmarkClass}>dictadapt</span>}
    </div>
  );
}
