import { Check } from 'lucide-react';

interface StepIndicatorProps {
  steps: string[];
  /** Zero-based index of the step being worked on. */
  current: number;
}

/**
 * Desktop stepper / mobile breadcrumb, same two-mode pattern as DysAdapt's
 * StepIndicator.
 */
export default function StepIndicator({ steps, current }: StepIndicatorProps) {
  return (
    <div className="mb-8">
      {/* Mobile: just "3/5 — Découpage", the full rail does not fit a phone. */}
      <div className="sm:hidden flex items-center gap-2">
        <span className="breadcrumb-step text-primary">
          Étape {current + 1}/{steps.length}
        </span>
        <span className="text-slate-300 dark:text-slate-700">·</span>
        <span className="breadcrumb-step text-slate-500 dark:text-slate-400">{steps[current]}</span>
      </div>

      <ol className="hidden sm:flex items-center gap-2">
        {steps.map((step, index) => {
          const done = index < current;
          const active = index === current;

          return (
            <li key={step} className="flex items-center gap-2 flex-1 last:flex-none">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  aria-hidden="true"
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black flex-shrink-0 transition-all ${
                    done
                      ? 'bg-emerald-500 text-white'
                      : active
                        ? 'bg-primary text-white shadow-lg shadow-primary-muted'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500'
                  }`}
                >
                  {done ? <Check className="w-4 h-4" /> : index + 1}
                </span>
                <span
                  className={`breadcrumb-step truncate ${
                    active
                      ? 'text-primary'
                      : done
                        ? 'text-slate-500 dark:text-slate-400'
                        : 'text-slate-400 dark:text-slate-600'
                  }`}
                >
                  {step}
                </span>
              </div>
              {index < steps.length - 1 && (
                <span
                  aria-hidden="true"
                  className={`h-px flex-1 transition-colors ${
                    done ? 'bg-emerald-400' : 'bg-slate-200 dark:bg-slate-800'
                  }`}
                />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
