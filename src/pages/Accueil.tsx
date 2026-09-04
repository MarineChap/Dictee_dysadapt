import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  BookOpenCheck,
  Camera,
  Copy,
  Headphones,
  Pencil,
  Play,
  Plus,
  QrCode,
  Settings,
  Trash2,
} from 'lucide-react';
import { nanoid } from 'nanoid';
import PageShell from '@/components/PageShell';
import ConfirmDialog from '@/components/ConfirmDialog';
import RenameDialog from '@/components/RenameDialog';
import { useDictations } from '@/hooks/useDictations';
import { deleteDictation, saveDictation } from '@/lib/db';
import { isReceived } from '@/lib/types';
import type { Dictation } from '@/lib/types';

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function Accueil() {
  const { dictations, loading, error, refresh } = useDictations();
  const [pendingDelete, setPendingDelete] = useState<Dictation | null>(null);
  const [pendingRename, setPendingRename] = useState<Dictation | null>(null);
  const navigate = useNavigate();

  /**
   * Renaming lives here rather than on the teacher screen so that it works in
   * both modes: a pupil only ever sees the library and pupil mode, and a
   * dictation called "Dictée reçue" is one they must be able to name.
   */
  async function rename(dictation: Dictation, title: string) {
    await saveDictation({ ...dictation, title });
    setPendingRename(null);
    refresh();
  }

  async function duplicate(dictation: Dictation) {
    const now = Date.now();
    await saveDictation({
      ...dictation,
      id: nanoid(10),
      title: `${dictation.title} (copie)`,
      createdAt: now,
      updatedAt: now,
      imageId: undefined,
      origin: 'created',
    });
    refresh();
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    await deleteDictation(pendingDelete.id);
    setPendingDelete(null);
    refresh();
  }

  return (
    <PageShell
      title="Mes dictées"
      headerRight={
        <Link
          to="/reglages"
          aria-label="Réglages"
          className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-400 transition-colors"
        >
          <Settings className="w-5 h-5" />
        </Link>
      }
    >
      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <Link
          to="/nouvelle"
          className="flex-1 flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-primary/20"
        >
          <Camera className="w-5 h-5" />
          Nouvelle dictée
        </Link>
        <Link
          to="/scanner"
          className="flex items-center justify-center gap-2 px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-primary hover:text-primary transition-all active:scale-95"
        >
          <QrCode className="w-5 h-5" />
          Recevoir un QR code
        </Link>
      </div>

      <div className="flex items-center gap-2 mb-5">
        <BookOpenCheck className="w-5 h-5 text-primary flex-shrink-0" />
        <h2 className="text-lg md:text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
          Bibliothèque
        </h2>
        {!loading && dictations.length > 0 && (
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
            {dictations.length} {dictations.length > 1 ? 'dictées' : 'dictée'}
          </span>
        )}
      </div>

      {loading && (
        <div className="grid gap-4 sm:grid-cols-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-40 rounded-3xl bg-slate-100 dark:bg-slate-800 animate-pulse"
            />
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="rounded-3xl border-2 border-dashed border-red-300 dark:border-red-900 p-8 text-center">
          <p className="text-sm font-bold text-red-600 dark:text-red-400 mb-4">{error}</p>
          <button
            type="button"
            onClick={() => refresh()}
            className="bg-primary hover:bg-primary-hover text-white px-5 py-2 rounded-lg text-sm font-bold shadow-lg shadow-primary-muted transition-all active:scale-95"
          >
            Réessayer
          </button>
        </div>
      )}

      {!loading && !error && dictations.length === 0 && (
        <div className="rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700 p-10 text-center">
          <div className="w-14 h-14 rounded-full bg-primary-muted flex items-center justify-center mx-auto mb-4">
            <Camera className="w-7 h-7 text-primary" />
          </div>
          <p className="font-black text-slate-800 dark:text-slate-100 mb-1">
            Aucune dictée pour l&apos;instant
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            Prenez l&apos;exercice en photo : le texte est reconnu, vous le vérifiez, puis
            l&apos;élève écoute la dictée partie par partie.
          </p>
        </div>
      )}

      {!loading && !error && dictations.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {dictations.map((dictation) => {
            // A dictation received by QR code has no teacher side on this
            // device: the card opens pupil mode, and there is nothing to edit,
            // to duplicate or to hand on.
            const received = isReceived(dictation);

            return (
              <div
                key={dictation.id}
                className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 hover:shadow-lg hover:border-primary-hover transition-all group flex flex-col"
              >
                <Link
                  to={received ? `/eleve/${dictation.id}` : `/dictee/${dictation.id}`}
                  className="flex-1 min-w-0"
                >
                  <h3 className="font-black text-slate-900 dark:text-white tracking-tight truncate">
                    {dictation.title}
                  </h3>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mt-1">
                    {dictation.segments.length} parties · {formatDate(dictation.createdAt)}
                  </p>
                  {received && (
                    <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-primary-muted px-3 py-1 text-[10px] font-black uppercase tracking-widest text-primary">
                      <QrCode className="w-3.5 h-3.5" />
                      Reçue par QR code
                    </span>
                  )}
                </Link>

                <div className="flex items-center gap-2 mt-5">
                  <button
                    type="button"
                    onClick={() => navigate(`/eleve/${dictation.id}`)}
                    className="flex-1 flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-white py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-primary-muted"
                  >
                    {received ? <Headphones className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    {received ? 'Écouter la dictée' : "Donner à l'élève"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingRename(dictation)}
                    aria-label={`Renommer ${dictation.title}`}
                    className="p-2.5 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  {!received && (
                    <button
                      type="button"
                      onClick={() => void duplicate(dictation)}
                      aria-label={`Dupliquer ${dictation.title}`}
                      className="p-2.5 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setPendingDelete(dictation)}
                    aria-label={`Supprimer ${dictation.title}`}
                    className="p-2.5 rounded-xl text-slate-400 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}

          <Link
            to="/nouvelle"
            className="rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700 p-6 flex flex-col items-center justify-center gap-2 text-slate-400 dark:text-slate-500 hover:border-primary hover:text-primary transition-all min-h-40"
          >
            <Plus className="w-7 h-7" />
            <span className="text-[10px] font-black uppercase tracking-widest">
              Ajouter une dictée
            </span>
          </Link>
        </div>
      )}

      {pendingRename && (
        <RenameDialog
          currentTitle={pendingRename.title}
          onRename={(title) => void rename(pendingRename, title)}
          onCancel={() => setPendingRename(null)}
        />
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Supprimer cette dictée ?"
        description={
          pendingDelete
            ? `« ${pendingDelete.title} » sera effacée de cet appareil. Cette action est définitive.`
            : ''
        }
        confirmLabel="Supprimer"
        destructive
        onConfirm={() => void confirmDelete()}
        onCancel={() => setPendingDelete(null)}
      />
    </PageShell>
  );
}
