'use client';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from './ThemeProvider';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      onClick={toggleTheme}
      className="glow-btn flex items-center justify-center w-9 h-9 rounded-xl transition-colors"
      style={{ border: '1px solid var(--border)', background: 'var(--card2)' }}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {theme === 'dark' ? (
        <Sun size={16} style={{ color: 'var(--text-secondary)' }} />
      ) : (
        <Moon size={16} style={{ color: 'var(--text-secondary)' }} />
      )}
    </button>
  );
}
