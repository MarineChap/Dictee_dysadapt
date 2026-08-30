import { Link2, Volume2 } from 'lucide-react';
import { countWords } from '@/lib/segment';

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
 * ever perfect in French, so the teacher gets two gestures and nothing else:
 * tap a word to cut before it, tap the link between two parts to glue them.
 */
export default function SegmentEditor({
  segments,
  onChange,
  onPreview,
  speakingIndex = null,
}: SegmentEditorProps) {
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
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
        Touchez un <span className="font-bold">mot</span> pour couper juste avant, ou le{' '}
        <span className="font-bold">trait</span> entre deux parties pour les réunir.
      </p>

      <ol className="space-y-1" data-testid="segment-list">
        {segments.map((segment, segmentIndex) => {
          const words = segment.split(' ');
          const isSpeaking = speakingIndex === segmentIndex;

          return (
            <li key={`${segmentIndex}-${segment}`}>
              <div
                className={`flex items-start gap-3 rounded-2xl border p-3 transition-all ${
                  isSpeaking
                    ? 'border-primary bg-primary-muted'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                }`}
              >
                <span className="mt-1.5 w-7 h-7 flex-shrink-0 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs font-black flex items-center justify-center">
                  {segmentIndex + 1}
                </span>

                <div className="flex-1 min-w-0 flex flex-wrap items-center gap-x-0.5 gap-y-1 reading-text">
                  {words.map((word, wordIndex) => (
                    <button
                      key={`${wordIndex}-${word}`}
                      type="button"
                      disabled={wordIndex === 0}
                      onClick={() => splitAt(segmentIndex, wordIndex)}
                      title={wordIndex === 0 ? undefined : `Couper avant « ${word} »`}
                      className={`px-1 rounded-md transition-colors ${
                        wordIndex === 0
                          ? 'cursor-default text-slate-900 dark:text-slate-100'
                          : 'text-slate-900 dark:text-slate-100 hover:bg-primary-muted hover:text-primary'
                      }`}
                    >
                      {word}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  <span className="hidden sm:inline text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                    {countWords(segment)} mot{countWords(segment) > 1 ? 's' : ''}
                  </span>
                  <button
                    type="button"
                    onClick={() => onPreview(segment)}
                    aria-label={`Écouter la partie ${segmentIndex + 1}`}
                    className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-primary transition-colors"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {segmentIndex < segments.length - 1 && (
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={() => mergeWithNext(segmentIndex)}
                    aria-label={`Réunir les parties ${segmentIndex + 1} et ${segmentIndex + 2}`}
                    className="group flex items-center gap-1.5 px-3 py-1 text-slate-300 dark:text-slate-600 hover:text-primary transition-colors"
                  >
                    <span className="h-4 w-px bg-current" />
                    <Link2 className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity" />
                    <span className="h-4 w-px bg-current" />
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
