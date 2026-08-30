import { WifiOff } from 'lucide-react';
import DictadaptLogo from './DictadaptLogo';

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 dark:border-slate-800 mt-auto">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <DictadaptLogo markSize={24} showWordmark={false} />
          <p className="text-xs text-slate-500 dark:text-slate-400">
            <span className="font-bold text-slate-700 dark:text-slate-200">Dictadapt</span> — outil
            libre de l&apos;environnement <span className="font-bold">dysadapt</span>
          </p>
        </div>
        <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
          <WifiOff className="w-3.5 h-3.5" />
          Hors ligne · sans compte
        </p>
      </div>
    </footer>
  );
}
