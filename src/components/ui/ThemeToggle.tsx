import React from 'react';
import { useApp } from '../../context/AppContext';
import { Sun, Moon, Laptop } from 'lucide-react';

export const ThemeToggle: React.FC = () => {
  const { theme, setTheme } = useApp();

  return (
    <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
      <button
        onClick={() => setTheme('light')}
        className={`p-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
          theme === 'light'
            ? 'bg-white text-amber-600 shadow-xs'
            : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
        }`}
        title="Light Mode"
      >
        <Sun className="w-3.5 h-3.5" />
      </button>

      <button
        onClick={() => setTheme('dark')}
        className={`p-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
          theme === 'dark'
            ? 'bg-slate-800 text-purple-400 shadow-xs'
            : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
        }`}
        title="Dark Mode"
      >
        <Moon className="w-3.5 h-3.5" />
      </button>

      <button
        onClick={() => setTheme('system')}
        className={`p-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
          theme === 'system'
            ? 'bg-purple-600 text-white shadow-xs'
            : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
        }`}
        title="System Preference"
      >
        <Laptop className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
