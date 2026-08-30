import type { ReactNode } from 'react';
import Navbar from './Navbar';
import Footer from './Footer';

interface PageShellProps {
  title: string;
  backTo?: string;
  backLabel?: string;
  headerRight?: ReactNode;
  children: ReactNode;
}

/**
 * The page skeleton every teacher-side screen uses, mirroring the DysAdapt
 * dashboard shell: fixed navbar, centred max-w-5xl main, footer pinned down.
 */
export default function PageShell({
  title,
  backTo,
  backLabel,
  headerRight,
  children,
}: PageShellProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col transition-colors duration-300">
      <Navbar
        backTo={backTo}
        backLabel={backLabel}
        right={headerRight}
        centerContent={
          <span className="text-lg md:text-xl font-black text-slate-900 dark:text-white tracking-tight">
            {title}
          </span>
        }
      />
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 md:pt-28 pb-16">
        <h1 className="md:hidden text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-6">
          {title}
        </h1>
        {children}
      </main>
      <Footer />
    </div>
  );
}
