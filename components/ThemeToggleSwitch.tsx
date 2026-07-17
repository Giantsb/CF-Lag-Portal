import React, { useEffect, useState } from 'react';
import { SunIcon, MoonIcon } from './Icons';

interface ThemeToggleSwitchProps {
  className?: string;
  showLabels?: boolean;
}

const ThemeToggleSwitch: React.FC<ThemeToggleSwitchProps> = ({ className = '', showLabels = true }) => {
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    const storedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = storedTheme || (prefersDark ? 'dark' : 'light');
    
    setTheme(initialTheme);
    document.documentElement.setAttribute('data-theme', initialTheme);

    const handleThemeChange = () => {
      const current = localStorage.getItem('theme') || 'dark';
      setTheme(current);
    };

    window.addEventListener('theme-change', handleThemeChange);
    return () => {
      window.removeEventListener('theme-change', handleThemeChange);
    };
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    window.dispatchEvent(new Event('theme-change'));
  };

  const isDark = theme === 'dark';

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {showLabels && (
        <span className="text-[10px] text-brand-textSecondary font-black uppercase tracking-widest">
          {isDark ? 'Dark Mode' : 'Light Mode'}
        </span>
      )}
      <button
        onClick={toggleTheme}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
          isDark ? 'bg-brand-accent' : 'bg-gray-300'
        }`}
        role="switch"
        aria-checked={isDark}
        title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      >
        <span className="sr-only">Toggle Theme</span>
        <span
          className={`pointer-events-none relative inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
            isDark ? 'translate-x-5' : 'translate-x-0'
          } flex items-center justify-center`}
        >
          {isDark ? (
            <MoonIcon className="w-3 h-3 text-brand-accent" />
          ) : (
            <SunIcon className="w-3 h-3 text-amber-500" />
          )}
        </span>
      </button>
    </div>
  );
};

export default ThemeToggleSwitch;
