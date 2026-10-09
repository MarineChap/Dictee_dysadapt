import { useEffect, useState } from 'react';
import { Check, Inbox, Loader2 } from 'lucide-react';
import {
  assignTo,
  listStudents,
  studentsOf,
  unassign,
  type AssignedStudent,
  type Student,
} from '@/lib/remote';
import { Card, Notice, SectionTitle, cx } from '@/components/ui';

interface LockerPanelProps {
  dictationId: string;
}

/**
 * Puts the dictation in the DysAdapt locker of one or several students — or
 * takes it out. Ticking a student is enough: there is nothing to confirm.
 */
export default function LockerPanel({ dictationId }: LockerPanelProps) {
  const [students, setStudents] = useState<Student[] | null>(null);
  const [assigned, setAssigned] = useState<AssignedStudent[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([listStudents(), studentsOf(dictationId)])
      .then(([all, inLocker]) => {
        if (cancelled) return;
        setStudents(all);
        setAssigned(inLocker);
      })
      .catch(() => {
        if (!cancelled) setError('Les élèves de votre compte ne peuvent pas être chargés.');
      });
    return () => {
      cancelled = true;
    };
  }, [dictationId]);

  async function toggle(student: Student) {
    const current = assigned.find((a) => a.profile_id === student.id);
    setBusy(student.id);
    setError(null);
    try {
      if (current) {
        await unassign(current.assignment_id);
        setAssigned((list) => list.filter((a) => a !== current));
      } else {
        setAssigned(await assignTo(dictationId, [student.id]));
      }
    } catch {
      setError("Le casier n'a pas pu être mis à jour. Réessayez.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card as="section" data-testid="locker-panel" className="mb-8 flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <SectionTitle icon={<Inbox className="size-5 text-primary" aria-hidden="true" />}>
          Casier des élèves
        </SectionTitle>
        <p className="text-muted">
          Cochez un élève pour mettre la dictée dans son casier DysAdapt.
        </p>
      </div>

      {error && (
        <Notice tone="danger" live>
          {error}
        </Notice>
      )}

      {students === null && !error && (
        <div className="h-10 rounded-md bg-surface-sunken animate-pulse" />
      )}

      {students?.length === 0 && (
        <p className="text-muted">Aucun élève dans votre compte : créez-en un dans DysAdapt.</p>
      )}

      {students && students.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {students.map((student) => {
            const inLocker = assigned.some((a) => a.profile_id === student.id);
            return (
              <li key={student.id}>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={inLocker}
                  disabled={busy !== null}
                  onClick={() => void toggle(student)}
                  className={cx(
                    'inline-flex items-center gap-1.5 min-h-11 px-4 rounded-md border transition-colors disabled:opacity-60',
                    inLocker
                      ? 'bg-primary-muted border-primary text-primary font-bold'
                      : 'bg-surface border-border-strong text-foreground hover:border-primary'
                  )}
                >
                  {busy === student.id ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  ) : (
                    inLocker && <Check className="size-4" aria-hidden="true" />
                  )}
                  {student.name}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
