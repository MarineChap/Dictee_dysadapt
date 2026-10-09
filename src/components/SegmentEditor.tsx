import { useRef, useState } from 'react';
import { Link2, Pencil, Volume2 } from 'lucide-react';
import { countWords } from '@/lib/segment';
import { IconButton, cx } from '@/components/ui';

interface SegmentEditorProps {
  /** Segment texts, in reading order. */
  segments: string[];
  onChange: (segments: string[]) => void;
  onPreview: (text: string) => void;
  /** Index currently being spoken, for the highlight. */
  speakingIndex?: number | null;
}

/**
 * Touch-first correction of the automatic split. No automatic segmentation is
 * ever perfect in French, so the teacher gets three gestures: tap a word to cut
 * before it, tap "Réunir" between two parts to glue them, or tap the pencil to
 * retype a part — a missed word should never mean starting the dictation over.
 */
export default function SegmentEditor({
  segments,
  onChange,
  onPreview,
  speakingIndex = null,
}: SegmentEditorProps) {
  const [editing, setEditing] = useState<{ index: number; draft: string } | null>(null);
  // Enter or Escape closes the input, which may still fire a blur on its way
  // out: the edit is already settled by then, so the blur must do nothing.
  const closedRef = useRef(false);

  function startEditing(segmentIndex: number) {
    closedRef.current = false;
    setEditing({ index: segmentIndex, draft: segments[segmentIndex] });
  }

  function commitEdit() {
    if (!editing || closedRef.current) return;
    closedRef.current = true;
    const text = editing.draft.replace(/\s+/g, ' ').trim();
    setEditing(null);
    if (text === segments[editing.index]) return;
    const next = [...segments];
    // An emptied part is a deleted part.
    if (text) next.splice(editing.index, 1, text);
    else next.splice(editing.index, 1);
    onChange(next);
  }

  function cancelEdit() {
    closedRef.current = true;
    setEditing(null);
  }

  function splitAt(segmentIndex: number, wordIndex: number) {
    const words = segments[segmentIndex].split(' ');
    if (wordIndex <= 0 || wordIndex >= words.length) return;
    const next = [...segments];
    next.splice(
      segmentIndex,
      1,
      words.slice(0, wordIndex).join(' '),
      words.slice(wordIndex).join(' ')
    );
    onChange(next);
  }

  function mergeWithNext(segmentIndex: number) {
    if (segmentIndex >= segments.length - 1) return;
    const next = [...segments];
    next.splice(segmentIndex, 2, `${segments[segmentIndex]} ${segments[segmentIndex + 1]}`);
    onChange(next);
  }

  return (
    <div>
      <p className="text-sm text-muted mb-4">
        Touchez un <span className="font-bold">mot</span> pour couper juste avant,{' '}
        <span className="font-bold">Réunir</span> pour coller deux parties, ou le{' '}
        <span className="font-bold">crayon</span> pour corriger le texte d&apos;une partie.
      </p>

      <ol className="space-y-1" data-testid="segment-list">
        {segments.map((segment, segmentIndex) => {
          const words = segment.split(' ');
          const isSpeaking = speakingIndex === segmentIndex;
          const isEditing = editing?.index === segmentIndex;

          return (
            <li key={`${segmentIndex}-${segment}`}>
              <div
                className={cx(
                  'flex items-start gap-3 rounded-lg border p-3 transition-colors',
                  isSpeaking ? 'border-primary bg-primary-muted' : 'border-border bg-surface'
                )}
              >
                <span className="mt-1.5 size-7 shrink-0 rounded-full bg-surface-sunken text-muted text-sm font-bold flex items-center justify-center">
                  {segmentIndex + 1}
                </span>

                {isEditing ? (
                  <input
                    type="text"
                    value={editing.draft}
                    autoFocus
                    aria-label={`Texte de la partie ${segmentIndex + 1}`}
                    onChange={(event) =>
                      setEditing({ index: segmentIndex, draft: event.target.value })
                    }
                    onBlur={commitEdit}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') commitEdit();
                      if (event.key === 'Escape') cancelEdit();
                    }}
                    className="reading-text flex-1 min-w-0 px-3 py-1.5 rounded-md border border-primary bg-surface text-foreground"
                  />
                ) : (
                  <div className="flex-1 min-w-0 flex flex-wrap items-center gap-x-0.5 gap-y-1 reading-text">
                    {words.map((word, wordIndex) => (
                      <button
                        key={`${wordIndex}-${word}`}
                        type="button"
                        disabled={wordIndex === 0}
                        onClick={() => splitAt(segmentIndex, wordIndex)}
                        title={wordIndex === 0 ? undefined : `Couper avant « ${word} »`}
                        className={cx(
                          'px-1 rounded-sm text-foreground transition-colors',
                          wordIndex === 0
                            ? 'cursor-default'
                            : 'hover:bg-primary-muted hover:text-primary'
                        )}
                      >
                        {word}
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-1 shrink-0">
                  <span className="hidden sm:inline text-sm text-muted mr-1">
                    {countWords(segment)} mot{countWords(segment) > 1 ? 's' : ''}
                  </span>
                  {!isEditing && (
                    <IconButton
                      icon={Pencil}
                      size="sm"
                      label={`Modifier la partie ${segmentIndex + 1}`}
                      onClick={() => startEditing(segmentIndex)}
                    />
                  )}
                  <IconButton
                    icon={Volume2}
                    size="sm"
                    label={`Écouter la partie ${segmentIndex + 1}`}
                    onClick={() => onPreview(segment)}
                  />
                </div>
              </div>

              {segmentIndex < segments.length - 1 && (
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={() => mergeWithNext(segmentIndex)}
                    aria-label={`Réunir les parties ${segmentIndex + 1} et ${segmentIndex + 2}`}
                    className="my-1 flex items-center gap-1.5 min-h-8 px-3 rounded-full border border-border-strong bg-surface text-sm text-muted hover:border-primary hover:text-primary transition-colors"
                  >
                    <Link2 className="size-4" aria-hidden="true" />
                    Réunir
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
