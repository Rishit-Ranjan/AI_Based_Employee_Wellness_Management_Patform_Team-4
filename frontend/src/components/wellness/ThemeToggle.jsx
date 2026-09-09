import { useState, useEffect } from 'react';
import { Lightbulb } from 'lucide-react';

export default function ThemeToggle({ className = '' }) {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('wellness_theme');
      if (savedTheme === 'dark') return true;
      if (savedTheme === 'light') return false;
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    if (isDark) {
      root.classList.add('dark');
      body.classList.add('dark');
      localStorage.setItem('wellness_theme', 'dark');
    } else {
      root.classList.remove('dark');
      body.classList.remove('dark');
      localStorage.setItem('wellness_theme', 'light');
    }
  }, [isDark]);

  const toggleTheme = (e) => {
    e.stopPropagation();
    setIsDark(prev => !prev);
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={`relative inline-flex items-center justify-center p-2.5 rounded-xl text-slate-500 hover:text-slate-900 dark:text-(--color-text-muted) dark:hover:text-white bg-(--color-bg-subtle) dark:bg-(--color-bg-subtle-dark) border border-white/70 dark:border-white/70 transition-all duration-300 hover:scale-105 active:scale-95 shadow-sm cursor-pointer ${className}`}
    >
            <Lightbulb
          className={`w-4 h-4 transition-all duration-300 ${
            isDark ? 'text-(--color-text-muted)' : 'text-amber-400'
          }`}
          fill={isDark ? 'none' : 'currentColor'}
        />
    </button>
  );
}
