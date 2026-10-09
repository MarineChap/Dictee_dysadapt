import { Facebook, Github, Instagram, Linkedin, WifiOff } from 'lucide-react';
import DictadaptLogo from './DictadaptLogo';

/** Project source and DysAdapt's social accounts — the same set as dysadapt.com. */
const LINKS = [
  {
    label: 'Code source sur GitHub',
    href: 'https://github.com/MarineChap/Dictee_dysadapt',
    Icon: Github,
  },
  { label: 'DysAdapt sur Facebook', href: 'https://www.facebook.com/dysadapt', Icon: Facebook },
  { label: 'DysAdapt sur Instagram', href: 'https://www.instagram.com/dysadapt', Icon: Instagram },
  {
    label: 'DysAdapt sur LinkedIn',
    href: 'https://www.linkedin.com/company/dysadapt',
    Icon: Linkedin,
  },
];

export default function Footer() {
  return (
    <footer className="border-t border-border bg-surface mt-auto">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <DictadaptLogo markSize={24} />
          <span className="w-px h-5 bg-border" aria-hidden="true" />
          <p className="text-sm text-muted">
            un outil libre de <span className="font-bold text-foreground">dysadapt</span>
          </p>
        </div>

        <p className="flex items-center gap-2 text-sm text-muted">
          <WifiOff className="size-4" aria-hidden="true" />
          Marche hors ligne · compte facultatif
        </p>

        <nav className="flex items-center gap-1" aria-label="Liens externes">
          {LINKS.map(({ label, href, Icon }) => (
            <a
              key={href}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={label}
              title={label}
              className="size-9 inline-flex items-center justify-center rounded-md text-muted hover:text-primary hover:bg-primary-muted transition-colors"
            >
              <Icon className="size-4" aria-hidden="true" />
            </a>
          ))}
        </nav>
      </div>
    </footer>
  );
}
