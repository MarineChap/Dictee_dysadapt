import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import DictadaptLogo from './DictadaptLogo';
import DysadaptLogo from './DysadaptLogo';
import ThemeToggle from './ThemeToggle';
import AccountButton from './AccountButton';
import { useAccount } from '@/hooks/useAccount';
import { dashboardUrl } from '@/lib/account';

interface NavbarProps {
  /** Title shown centred on desktop. */
  centerContent?: ReactNode;
  /**
   * Route to go back to, shown next to the logo. Signed in, the teacher's
   * home is their DysAdapt space, not this library: a back to "/" then leads
   * there.
   */
  backTo?: string;
  backLabel?: string;
  right?: ReactNode;
}

const backClass =
  'flex items-center gap-1.5 px-2 py-2 rounded-md font-bold text-muted hover:text-primary transition-colors';

/**
 * DysAdapt's bar (h-16, white, bordered, title centred). Signed in, it *is*
 * DysAdapt's: its logo leads to the teacher's dashboard, so Dictadapt reads
 * as one of its tools. Without an account, Dictadapt's own logo.
 */
export default function Navbar({ centerContent, backTo, backLabel, right }: NavbarProps) {
  const { account } = useAccount();
  const toSpace = !!account && backTo === '/';

  return (
    <nav className="fixed top-0 w-full z-40 bg-surface border-b border-border safe-top">
      <div className="px-4 sm:px-6 h-16 flex items-center justify-between gap-3 relative">
        <div className="flex items-center gap-2 min-w-0">
          {account ? (
            <a href={dashboardUrl()} className="rounded-md" aria-label="Tableau de bord DysAdapt">
              <DysadaptLogo markSize={30} />
            </a>
          ) : (
            <Link to="/" className="rounded-md" aria-label="Accueil Dictadapt">
              <DictadaptLogo markSize={30} compactOnPhone />
            </Link>
          )}
          {(toSpace || backTo) && <div className="w-px h-5 bg-border shrink-0" />}
          {toSpace ? (
            <a href={dashboardUrl()} data-testid="back-to-space" className={backClass}>
              <ArrowLeft className="size-4 shrink-0" aria-hidden="true" />
              <span className="sr-only md:not-sr-only">Tableau de bord</span>
            </a>
          ) : backTo ? (
            <Link to={backTo} className={backClass}>
              <ArrowLeft className="size-4 shrink-0" aria-hidden="true" />
              <span className="sr-only md:not-sr-only">{backLabel ?? 'Retour'}</span>
            </Link>
          ) : null}
        </div>

        {centerContent && (
          <div className="hidden lg:flex absolute left-1/2 -translate-x-1/2 items-center pointer-events-none">
            {centerContent}
          </div>
        )}

        <div className="flex items-center gap-1">
          {right}
          <ThemeToggle />
          {/* The back arrow already leads to the space: no second way there. */}
          {!toSpace && <AccountButton />}
        </div>
      </div>
    </nav>
  );
}
