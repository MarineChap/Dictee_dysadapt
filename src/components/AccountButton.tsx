import { LayoutDashboard, LogIn } from 'lucide-react';
import { useAccount } from '@/hooks/useAccount';
import { dashboardUrl, signInUrl, signUpUrl } from '@/lib/account';
import { buttonClasses } from '@/components/ui';

/**
 * DysAdapt's account entries, as in its own bar: the dashboard when signed
 * in, "Se connecter" and "S'inscrire" otherwise.
 */
export default function AccountButton() {
  const { account, ready } = useAccount();
  if (!ready) return null;

  if (account) {
    return (
      <a
        href={dashboardUrl()}
        data-testid="account-dashboard"
        className={buttonClasses({ variant: 'ghost', size: 'sm' })}
      >
        <LayoutDashboard className="size-4" aria-hidden="true" />
        <span className="sr-only sm:not-sr-only">Tableau de bord</span>
      </a>
    );
  }
  return (
    <>
      <a
        href={signInUrl()}
        data-testid="account-signin"
        className={buttonClasses({ variant: 'ghost', size: 'sm' })}
      >
        <LogIn className="size-4" aria-hidden="true" />
        <span className="sr-only sm:not-sr-only">Se connecter</span>
      </a>
      {/* Below 640 px the bar has no room for it: signing in leads there too */}
      <span className="hidden sm:inline-flex">
        <a
          href={signUpUrl()}
          data-testid="account-signup"
          className={buttonClasses({ size: 'sm' })}
        >
          S&apos;inscrire
        </a>
      </span>
    </>
  );
}
