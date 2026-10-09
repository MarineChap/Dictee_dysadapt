import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowUpRight,
  Camera,
  CloudUpload,
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
import {
  Button,
  ButtonLink,
  Card,
  IconButton,
  Input,
  Notice,
  SectionTitle,
  buttonClasses,
} from '@/components/ui';
import { useAccount } from '@/hooks/useAccount';
import { useDictations } from '@/hooks/useDictations';
import { saveDictation } from '@/lib/db';
import { decodeDictationFile } from '@/lib/file';
import { newDictationId } from '@/lib/ids';
import { addToAccount, localOnly, removeFromLibrary, saveToLibrary } from '@/lib/library';
import { studentsOf } from '@/lib/remote';
import type { Dictation } from '@/lib/types';

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** "Léa", "Léa et Léo", "Léa, Léo et Zoé". */
function formatNames(names: string[]): string {
  return names.length > 1 ? `${names.slice(0, -1).join(', ')} et ${names.at(-1)}` : names[0];
}

export default function Accueil() {
  const { dictations, loading, error, refresh } = useDictations();
  const { account } = useAccount();
  const [adding, setAdding] = useState(false);
  const notInAccount = account ? localOnly(dictations) : [];
  const [pendingDelete, setPendingDelete] = useState<Dictation | null>(null);
  // Students whose locker holds the dictation about to be deleted.
  const [lockersHit, setLockersHit] = useState<string[]>([]);
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
      .then(() => saveToLibrary({ ...dictation, title, updatedAt: Date.now() }, account))
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
        const id = newDictationId();
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
        setImportError(err instanceof Error ? err.message : "Ce fichier n'a pas pu être importé.");
      });
  }

  async function duplicate(dictation: Dictation) {
    const now = Date.now();
    await saveToLibrary(
      {
        ...dictation,
        id: newDictationId(),
        title: `${dictation.title} (copie)`,
        createdAt: now,
        updatedAt: now,
        imageId: undefined,
      },
      account
    );
    refresh();
  }

  function askDelete(dictation: Dictation) {
    setPendingDelete(dictation);
    setLockersHit([]);
    if (!dictation.ownerId) return;
    studentsOf(dictation.id)
      .then((students) => setLockersHit(students.map((s) => s.profile_name)))
      .catch(() => undefined);
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    await removeFromLibrary(pendingDelete);
    setPendingDelete(null);
    refresh();
  }

  async function addLocalToAccount() {
    if (!account) return;
    setAdding(true);
    try {
      await addToAccount(notInAccount, account);
    } finally {
      setAdding(false);
      refresh();
    }
  }

  const ghostIcon =
    'size-9 inline-flex items-center justify-center rounded-md text-muted hover:text-primary hover:bg-primary-muted transition-colors shrink-0';

  return (
    <PageShell
      title="Mes dictées"
      headerRight={
        <>
          {/* Signed in, the bar is DysAdapt's already */}
          {!account && (
            <span className="hidden sm:inline-flex">
              <a
                href="https://dysadapt.com"
                target="_blank"
                rel="noopener noreferrer"
                className={buttonClasses({ variant: 'ghost', size: 'sm' })}
              >
                DysAdapt
                <ArrowUpRight className="size-4" aria-hidden="true" />
                <span className="sr-only">(ouvrir dysadapt.com)</span>
              </a>
            </span>
          )}
          <Link to="/reglages" aria-label="Réglages" title="Réglages" className={ghostIcon}>
            <Settings className="size-5" aria-hidden="true" />
          </Link>
        </>
      }
    >
      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <ButtonLink to="/nouvelle" size="lg" icon={Camera} className="sm:flex-1">
          Nouvelle dictée
        </ButtonLink>
        <ButtonLink to="/scanner" size="lg" variant="secondary" icon={QrCode}>
          Recevoir un QR code
        </ButtonLink>
        <Button
          size="lg"
          variant="secondary"
          icon={FileUp}
          onClick={() => fileInputRef.current?.click()}
        >
          Importer un fichier
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          onChange={importFile}
          className="hidden"
        />
      </div>

      {importError && (
        <Notice tone="warning" live className="mb-8">
          {importError}
        </Notice>
      )}

      {!loading && notInAccount.length > 0 && (
        <div data-testid="add-to-account" className="mb-8">
          <Notice
            tone="primary"
            actions={
              <Button
                size="sm"
                icon={CloudUpload}
                disabled={adding}
                onClick={() => void addLocalToAccount()}
              >
                {notInAccount.length > 1 ? 'Les ajouter' : 'L’ajouter'}
              </Button>
            }
          >
            {notInAccount.length > 1
              ? `${notInAccount.length} dictées de cet appareil ne sont pas dans votre compte DysAdapt.`
              : '1 dictée de cet appareil n’est pas dans votre compte DysAdapt.'}
          </Notice>
        </div>
      )}

      <div className="flex flex-wrap items-end gap-x-3 gap-y-1 mb-5">
        <SectionTitle
          aside={
            !loading && dictations.length > 0
              ? `${dictations.length} ${dictations.length > 1 ? 'dictées' : 'dictée'}`
              : undefined
          }
        >
          Bibliothèque
        </SectionTitle>
        {!loading && (
          <span data-testid="storage-indicator" className="ml-auto text-sm text-muted">
            {account ? 'Sauvegardé dans votre compte' : 'Sur cet appareil'}
          </span>
        )}
      </div>

      {loading && (
        <div className="grid gap-4 sm:grid-cols-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-40 rounded-lg bg-surface-sunken animate-pulse" />
          ))}
        </div>
      )}

      {!loading && error && (
        <Notice tone="danger" live actions={<Button onClick={() => refresh()}>Réessayer</Button>}>
          {error}
        </Notice>
      )}

      {!loading && !error && dictations.length === 0 && (
        <Card padding="lg" className="flex flex-col items-center gap-3 text-center">
          <span className="size-14 rounded-full bg-primary-muted flex items-center justify-center">
            <Camera className="size-7 text-primary" aria-hidden="true" />
          </span>
          <p className="text-lg font-bold text-foreground">Aucune dictée pour l&apos;instant</p>
          <p className="text-muted max-w-sm">
            Prenez l&apos;exercice en photo : le texte est reconnu, vous le vérifiez, puis
            l&apos;élève écoute la dictée partie par partie.
          </p>
        </Card>
      )}

      {!loading && !error && dictations.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {dictations.map((dictation) => (
            <Card key={dictation.id} interactive className="flex flex-col gap-5">
              <div className="flex items-start gap-2">
                {renamingId === dictation.id ? (
                  <>
                    <div className="flex-1 min-w-0">
                      <Input
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
                        className="font-bold"
                      />
                      <p className="text-sm text-muted mt-1">
                        {dictation.segments.length} parties · {formatDate(dictation.createdAt)}
                      </p>
                    </div>
                    <IconButton
                      icon={Check}
                      label="Valider le titre"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => void commitRename(dictation)}
                    />
                    <IconButton
                      icon={X}
                      label="Annuler le renommage"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={cancelRename}
                    />
                  </>
                ) : (
                  <>
                    {/* The card body opens teacher mode when there is one; an
                        imported dictation has none, so it only plays for the pupil. */}
                    <Link
                      to={dictation.imported ? `/eleve/${dictation.id}` : `/dictee/${dictation.id}`}
                      className="flex-1 min-w-0 group rounded-md"
                    >
                      <h3 className="flex items-center gap-1.5 text-lg font-bold text-foreground group-hover:text-primary group-hover:underline underline-offset-4">
                        {dictation.imported && (
                          <Import
                            className="size-4 shrink-0 text-primary"
                            aria-label="Dictée importée"
                          />
                        )}
                        <span className="truncate">{dictation.title}</span>
                      </h3>
                      <p className="text-sm text-muted mt-1">
                        {dictation.segments.length} parties · {formatDate(dictation.createdAt)}
                      </p>
                    </Link>
                    <IconButton
                      icon={Pencil}
                      size="sm"
                      label={`Renommer ${dictation.title}`}
                      onClick={() => startRename(dictation)}
                    />
                  </>
                )}
              </div>

              <div className="mt-auto flex flex-wrap items-center gap-2">
                {/* Signed in, the pupil gets it from their locker; a received copy has only this. */}
                {(!account || dictation.imported) && (
                  <Button
                    size="sm"
                    icon={Play}
                    onClick={() => navigate(`/eleve/${dictation.id}`)}
                    className="flex-1"
                  >
                    Faire la dictée
                  </Button>
                )}
                {!dictation.imported && (
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={SquarePen}
                    aria-label={`Modifier la dictée ${dictation.title}`}
                    onClick={() => navigate(`/dictee/${dictation.id}`)}
                  >
                    Modifier
                  </Button>
                )}
                <span className="ml-auto flex items-center gap-1">
                  <IconButton
                    icon={Copy}
                    size="sm"
                    label={`Dupliquer ${dictation.title}`}
                    onClick={() => void duplicate(dictation)}
                  />
                  <IconButton
                    icon={Trash2}
                    size="sm"
                    label={`Supprimer ${dictation.title}`}
                    onClick={() => askDelete(dictation)}
                    className="hover:text-danger-700 dark:hover:text-danger-300"
                  />
                </span>
              </div>
            </Card>
          ))}

          <Link
            to="/nouvelle"
            className="rounded-lg border-2 border-dashed border-border-strong p-6 flex flex-col items-center justify-center gap-2 text-muted hover:border-primary hover:text-primary transition-colors min-h-40"
          >
            <Plus className="size-7" aria-hidden="true" />
            <span className="font-bold">Ajouter une dictée</span>
          </Link>
        </div>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Supprimer cette dictée ?"
        description={
          pendingDelete
            ? `« ${pendingDelete.title} » sera effacée de cet appareil${
                pendingDelete.ownerId ? ' et de votre compte' : ''
              }.${
                lockersHit.length
                  ? ` Elle sera aussi retirée du casier de ${formatNames(lockersHit)}.`
                  : ''
              } Cette action est définitive.`
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
