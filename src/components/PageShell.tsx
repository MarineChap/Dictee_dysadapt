import type { ReactNode } from 'react';
import Navbar from './Navbar';
import Footer from './Footer';
import { SectionTitle } from '@/components/ui';

interface PageShellProps {
  title: string;
  backTo?: string;
  backLabel?: string;
  headerRight?: ReactNode;
  children: ReactNode;
}

/**
 * The page skeleton every teacher-side screen uses, as DysAdapt's: fixed bar
 * with the title underlined in its middle, centred main, footer at the end.
 */
export default function PageShell({
  title,
  backTo,
  backLabel,
  headerRight,
  children,
}: PageShellProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar
        backTo={backTo}
        backLabel={backLabel}
        right={headerRight}
        centerContent={
          <span className="text-lg font-bold text-primary underline decoration-underline decoration-2 underline-offset-8">
            {title}
          </span>
        }
      />
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 md:pt-28 pb-16">
        {/* The bar's title is hidden below 1024 px: the page shows it instead */}
        <SectionTitle level={1} className="lg:sr-only mb-6">
          {title}
        </SectionTitle>
        {children}
      </main>
      <Footer />
    </div>
  );
}
