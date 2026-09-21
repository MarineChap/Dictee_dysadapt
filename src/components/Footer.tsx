import { Facebook, Github, Instagram, Linkedin, WifiOff } from 'lucide-react';
import DictadaptLogo from './DictadaptLogo';

/** Project source and DysAdapt's social accounts — the same set as dysadapt.com. */
const LINKS = [
  { label: 'Code source sur GitHub', href: 'https://github.com/MarineChap/Dictee_dysadapt', Icon: Github },
  { label: 'DysAdapt sur Facebook', href: 'https://www.facebook.com/dysadapt', Icon: Facebook },
  { label: 'DysAdapt sur Instagram', href: 'https://www.instagram.com/dysadapt', Icon: Instagram },
  { label: 'DysAdapt sur LinkedIn', href: 'https://www.linkedin.com/company/dysadapt', Icon: Linkedin },
];

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

        <nav className="flex items-center gap-1" aria-label="Liens externes">
          {LINKS.map(({ label, href, Icon }) => (
            <a
              key={href}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={label}
              className="p-2 rounded-xl text-slate-400 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <Icon className="w-4 h-4" />
            </a>
          ))}
        </nav>

        <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
          <WifiOff className="w-3.5 h-3.5" />
          Hors ligne · sans compte
        </p>
      </div>
    </footer>
  );
}
