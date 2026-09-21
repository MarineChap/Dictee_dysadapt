import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowUpRight,
  BookOpenCheck,
  Camera,
  Check,
  Copy,
  FileUp,
  Import,
  Pencil,
  Play,
  Plus,
  QrCode,
  Settings,
  SquarePen,
  Trash2,
  X,
} from 'lucide-react';
import { nanoid } from 'nanoid';
import PageShell from '@/components/PageShell';
import ConfirmDialog from '@/components/ConfirmDialog';
import { isNativePlatform } from '@/lib/platform';
import { useDictations } from '@/hooks/useDictations';
import { deleteDictation, saveDictation } from '@/lib/db';
import { decodeDictationFile } from '@/lib/file';
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
  const [importError, setImportError] = useState<string | null>(null);
  // Inline rename on a card: the id being edited and its working title. An
  // imported dictation has no teacher page, so the card is the only place to
  // rename it — and the same affordance renames the ones authored here.
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  function startRename(dictation: Dictation) {
    setRenamingId(dictation.id);
    setRenameValue(dictation.title);
  }

  function cancelRename() {
    setRenamingId(null);
    setRenameValue('');
  }

  function commitRename(dictation: Dictation) {
    const title = renameValue.trim();
    setRenamingId(null);
    setRenameValue('');
    if (!title || title === dictation.title) return;
    // Date.now()/saveDictation live in a promise callback, never in the render
    // path — the same pattern importFile uses to satisfy react-hooks/purity.
    void Promise.resolve()
      .then(() => saveDictation({ ...dictation, title, updatedAt: Date.now() }))
      .then(refresh);
  }

  /**
   * Imports a dictation from a .json file (see src/lib/file.ts) — the way to
   * bring one over from another computer when a QR code is impractical.
   */
  function importFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ''; // let the same file be picked again after an error
    if (!file) return;
    setImportError(null);

    file
      .text()
      .then((content) => {
        const imported = decodeDictationFile(content);
        const id = nanoid(10);
        const now = Date.now();
        return saveDictation({
          id,
          title: imported.title,
          createdAt: now,
          updatedAt: now,
          // Received on a fresh machine: the pupil's parts, never the photo.
          sourceText: '',
          segments: imported.segments.map((text) => ({ id: nanoid(8), text })),
          speech: imported.speech,
          showWordCount: imported.showWordCount,
          allowReveal: imported.allowReveal,
          imported: true,
        }).then(() => id);
      })
      // Straight to the pupil screen, exactly like a scanned QR code: a file
      // received on this device is there to be played, never to be read. The
      // teacher who made it keeps the original — this copy carries no text to
      // reveal (sourceText is empty) and no way in to see one.
      .then((id) => navigate(`/eleve/${id}`))
      .catch((err: unknown) => {
        setImportError(
          err instanceof Error ? err.message : "Ce fichier n'a pas pu être importé."
        );
      });
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
        <>
          {/* Web-only bridge back to the ecosystem: the native app is a
              standalone shell and skips it rather than opening a browser. */}
          {!isNativePlatform() && (
            <a
              href="https://dysadapt.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 pl-3 pr-2.5 py-1.5 rounded-xl text-sm font-bold text-primary bg-primary-muted hover:bg-primary hover:text-white transition-all active:scale-95"
            >
              DysAdapt
              <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
              <span className="sr-only">(ouvrir dysadapt.com)</span>
            </a>
          )}
          <Link
            to="/reglages"
            aria-label="Réglages"
            className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-400 transition-colors"
          >
            <Settings className="w-5 h-5" />
          </Link>
        </>
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
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center justify-center gap-2 px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-primary hover:text-primary transition-all active:scale-95"
        >
          <FileUp className="w-5 h-5" />
          Importer un fichier
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          onChange={importFile}
          className="hidden"
        />
      </div>

      {importError && (
        <div className="mb-8 flex items-start gap-3 rounded-2xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 p-4">
          <p className="text-sm text-amber-800 dark:text-amber-200">{importError}</p>
        </div>
      )}

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
          {dictations.map((dictation) => (
            <div
              key={dictation.id}
              className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 hover:shadow-lg hover:border-primary-hover transition-all group flex flex-col"
            >
              <div className="flex items-start gap-2">
                {renamingId === dictation.id ? (
                  <>
                    <div className="flex-1 min-w-0">
                      <input
                        type="text"
                        value={renameValue}
                        autoFocus
                        onChange={(event) => setRenameValue(event.target.value)}
                        onBlur={() => void commitRename(dictation)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            void commitRename(dictation);
                          } else if (event.key === 'Escape') {
                            cancelRename();
                          }
                        }}
                        aria-label={`Renommer ${dictation.title}`}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 focus:border-primary bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-black tracking-tight transition-all outline-none"
                      />
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mt-1">
                        {dictation.segments.length} parties · {formatDate(dictation.createdAt)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => void commitRename(dictation)}
                      aria-label="Valider le titre"
                      className="p-2.5 rounded-xl text-primary hover:bg-primary-muted transition-colors flex-shrink-0"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={cancelRename}
                      aria-label="Annuler le renommage"
                      className="p-2.5 -mr-1 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-200 transition-colors flex-shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <>
                    {/* The card body opens teacher mode when there is one; an
                        imported dictation has none, so it only plays for the pupil. */}
                    <Link
                      to={dictation.imported ? `/eleve/${dictation.id}` : `/dictee/${dictation.id}`}
                      className="flex-1 min-w-0"
                    >
                      <h3 className="flex items-center gap-1.5 font-black text-slate-900 dark:text-white tracking-tight">
                        {dictation.imported && (
                          <Import
                            className="w-4 h-4 flex-shrink-0 text-primary"
                            aria-label="Dictée importée"
                          />
                        )}
                        <span className="truncate">{dictation.title}</span>
                      </h3>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mt-1">
                        {dictation.segments.length} parties · {formatDate(dictation.createdAt)}
                      </p>
                    </Link>
                    <button
                      type="button"
                      onClick={() => startRename(dictation)}
                      aria-label={`Renommer ${dictation.title}`}
                      className="p-2.5 -mr-1 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-200 transition-colors flex-shrink-0"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2 mt-5">
                <button
                  type="button"
                  onClick={() => navigate(`/eleve/${dictation.id}`)}
                  className="flex-1 flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-white py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-primary-muted"
                >
                  <Play className="w-4 h-4" />
                  Faire la dictée
                </button>
                {!dictation.imported && (
                  <button
                    type="button"
                    onClick={() => navigate(`/dictee/${dictation.id}`)}
                    aria-label={`Modifier la dictée ${dictation.title}`}
                    className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-primary hover:text-primary transition-all active:scale-95"
                  >
                    <SquarePen className="w-4 h-4" />
                    Modifier
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => void duplicate(dictation)}
                  aria-label={`Dupliquer ${dictation.title}`}
                  className="p-2.5 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                >
                  <Copy className="w-4 h-4" />
                </button>
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
          ))}

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
