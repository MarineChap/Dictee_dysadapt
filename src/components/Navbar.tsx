import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import DictadaptLogo from './DictadaptLogo';
import ThemeToggle from './ThemeToggle';

interface NavbarProps {
  /** Title shown centred on desktop. */
  centerContent?: ReactNode;
  /** Route to go back to. When set, the logo is replaced by a back arrow. */
  backTo?: string;
  backLabel?: string;
  right?: ReactNode;
}

/**
 * Fixed glass bar, same geometry as DysAdapt's Navbar (h-16, backdrop blur,
 * three zones with the middle one absolutely centred).
 */
export default function Navbar({ centerContent, backTo, backLabel, right }: NavbarProps) {
  return (
    <nav className="fixed top-0 w-full z-40 bg-background/70 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 safe-top">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
        <div className="flex items-center min-w-0">
          {backTo ? (
            <Link
              to={backTo}
              aria-label={backLabel ?? 'Retour'}
              className="flex items-center gap-2 px-3 py-2 -ml-3 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 flex-shrink-0" />
              <span className="hidden sm:inline">{backLabel ?? 'Retour'}</span>
            </Link>
          ) : (
            <Link to="/" className="flex items-center" aria-label="Accueil Dictadapt">
              <DictadaptLogo markSize={30} />
            </Link>
          )}
        </div>

        {centerContent && (
          <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 items-center pointer-events-none">
            {centerContent}
          </div>
        )}

        <div className="flex items-center gap-1">
          {right}
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
}
