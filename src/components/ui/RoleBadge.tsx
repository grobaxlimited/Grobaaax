import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { UserRole } from '../../types';
import { GraduationCap, ShieldCheck, Award, ChevronDown, Check } from 'lucide-react';

export const RoleBadge: React.FC = () => {
  const { role, setRole } = useApp();
  const [isOpen, setIsOpen] = useState(false);

  const roleConfig = {
    student: {
      label: 'Student Contender',
      icon: GraduationCap,
      color: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
      badgeBg: 'bg-cyan-500',
    },
    representative: {
      label: 'Institutional Rep',
      icon: Award,
      color: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
      badgeBg: 'bg-indigo-500',
    },
    admin: {
      label: 'Admin Overseer',
      icon: ShieldCheck,
      color: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
      badgeBg: 'bg-rose-500',
    },
  };

  const current = roleConfig[role];
  const IconComponent = current.icon;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${current.color} hover:bg-slate-800/50 transition-all cursor-pointer`}
        title="Click to change preview role"
      >
        <IconComponent className="w-3.5 h-3.5" />
        <span>{current.label}</span>
        <ChevronDown className="w-3 h-3 opacity-60 ml-0.5" />
      </button>

      {/* Role Switcher Dropdown */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl z-50 p-1.5 space-y-1">
            <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Switch Account Role
            </div>

            {(['student', 'representative', 'admin'] as UserRole[]).map(r => {
              const cfg = roleConfig[r];
              const Icon = cfg.icon;
              const isSelected = role === r;

              return (
                <button
                  key={r}
                  onClick={() => {
                    setRole(r);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4" />
                    <span className="capitalize">{r} Portal</span>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-emerald-500" />}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};
