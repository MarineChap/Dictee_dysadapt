import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { IconButton } from '@/components/ui';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return (
    <IconButton
      icon={theme === 'dark' ? Sun : Moon}
      label={theme === 'dark' ? 'Passer en thème clair' : 'Passer en thème sombre'}
      onClick={toggleTheme}
    />
  );
}
