import type { ReactNode } from 'react';

/**
 * The screen's main action, fixed at the bottom where the thumb is, above
 * the phone's gesture area. Content stays aligned with the page's column.
 */
export default function ActionBar({ children }: { children: ReactNode }) {
  return (
    <div className="fixed bottom-0 inset-x-0 z-30 bg-surface border-t border-border px-4 sm:px-6 py-3 safe-bottom">
      <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-end gap-3">
        {children}
      </div>
    </div>
  );
}
