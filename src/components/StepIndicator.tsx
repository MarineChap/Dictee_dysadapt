import { Check } from 'lucide-react';
import { cx } from '@/components/ui';

interface StepIndicatorProps {
  steps: string[];
  /** Zero-based index of the step being worked on. */
  current: number;
}

/**
 * A stepper on a tablet or computer, one line on a phone.
 */
export default function StepIndicator({ steps, current }: StepIndicatorProps) {
  return (
    <div className="mb-8">
      {/* Phone: "Étape 3/5 · Découpage", the full rail does not fit. */}
      <p className="sm:hidden text-sm">
        <span className="font-bold text-primary">
          Étape {current + 1}/{steps.length}
        </span>
        <span className="text-muted"> · {steps[current]}</span>
      </p>

      <ol className="hidden sm:flex items-center gap-2">
        {steps.map((step, index) => {
          const done = index < current;
          const active = index === current;

          return (
            <li
              key={step}
              aria-current={active ? 'step' : undefined}
              className="flex items-center gap-2 flex-1 last:flex-none"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  aria-hidden="true"
                  className={cx(
                    'size-7 rounded-full border flex items-center justify-center text-sm font-bold shrink-0',
                    done && 'bg-primary-muted border-primary text-primary',
                    active && 'bg-primary border-primary text-white',
                    !done && !active && 'bg-surface border-border-strong text-muted'
                  )}
                >
                  {done ? <Check className="size-4" /> : index + 1}
                </span>
                <span
                  className={cx(
                    'text-sm truncate',
                    active ? 'font-bold text-primary' : done ? 'text-foreground' : 'text-muted'
                  )}
                >
                  {step}
                </span>
              </div>
              {index < steps.length - 1 && (
                <span
                  aria-hidden="true"
                  className={cx('h-px flex-1', done ? 'bg-primary' : 'bg-border')}
                />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
