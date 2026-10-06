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
    <section
      data-testid="locker-panel"
      className="mb-8 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6"
    >
      <h2 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">
        <Inbox className="w-4 h-4" />
        Casier des élèves
      </h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
        Cochez un élève pour mettre la dictée dans son casier DysAdapt.
      </p>

      {error && <p className="mb-3 text-sm font-bold text-red-600 dark:text-red-400">{error}</p>}

      {students === null && !error && (
        <div className="h-10 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
      )}

      {students?.length === 0 && (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Aucun élève dans votre compte : créez-en un dans DysAdapt.
        </p>
      )}

      <ul className="flex flex-wrap gap-2">
        {students?.map((student) => {
          const inLocker = assigned.some((a) => a.profile_id === student.id);
          return (
            <li key={student.id}>
              <button
                type="button"
                role="checkbox"
                aria-checked={inLocker}
                disabled={busy !== null}
                onClick={() => void toggle(student)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border transition-all active:scale-95 disabled:opacity-60 ${
                  inLocker
                    ? 'bg-primary border-primary text-white'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-primary hover:text-primary'
                }`}
              >
                {busy === student.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  inLocker && <Check className="w-4 h-4" />
                )}
                {student.name}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
