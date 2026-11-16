import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../context/theme.js';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const nextLabel = theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="grid size-10 place-items-center rounded-xl border border-border bg-surface text-muted transition hover:text-text"
      aria-label={nextLabel}
      title={nextLabel}
    >
      {theme === 'dark' ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}
    </button>
  );
}
