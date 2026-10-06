import { LayoutDashboard, LogIn, UserPlus } from 'lucide-react';
import { useAccount } from '@/hooks/useAccount';
import { dashboardUrl, signInUrl, signUpUrl } from '@/lib/account';

const quiet =
  'inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors';
const strong =
  'inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90 transition-opacity shadow-sm';

/**
 * DysAdapt's account entries, as in its own header: "Mon espace" when signed
 * in, "Se connecter" and "Créer un compte" otherwise.
 */
export default function AccountButton() {
  const { account, ready } = useAccount();
  if (!ready) return null;

  if (account) {
    return (
      <a href={dashboardUrl()} data-testid="account-dashboard" className={quiet}>
        <LayoutDashboard className="w-4 h-4" aria-hidden="true" />
        <span className="hidden sm:inline">Mon espace</span>
        <span className="sr-only sm:hidden">Mon espace</span>
      </a>
    );
  }
  return (
    <>
      <a href={signInUrl()} data-testid="account-signin" className={quiet}>
        <LogIn className="w-4 h-4" aria-hidden="true" />
        <span className="hidden sm:inline">Se connecter</span>
        <span className="sr-only sm:hidden">Se connecter</span>
      </a>
      <a href={signUpUrl()} data-testid="account-signup" className={strong}>
        <UserPlus className="w-4 h-4" aria-hidden="true" />
        <span className="hidden sm:inline">Créer un compte</span>
        <span className="sr-only sm:hidden">Créer un compte</span>
      </a>
    </>
  );
}
