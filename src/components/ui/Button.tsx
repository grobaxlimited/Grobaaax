import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'amber' | 'emerald' | 'cyan';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-bold transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:pointer-events-none rounded-xl tracking-tight select-none cursor-pointer';

  const variants = {
    primary:
      'bg-blue-900 hover:bg-blue-800 active:bg-blue-950 text-white font-black shadow-md shadow-blue-950/30 border border-blue-700/50',
    secondary:
      'bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-700 shadow-xs',
    outline:
      'bg-transparent hover:bg-blue-50 dark:hover:bg-blue-950/40 text-blue-900 dark:text-blue-200 border border-blue-900/30 dark:border-blue-700/40',
    ghost:
      'bg-transparent hover:bg-blue-50/60 dark:hover:bg-blue-950/40 text-slate-700 dark:text-slate-300',
    danger:
      'bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/20 border border-rose-500/40 font-black',
    amber:
      'bg-blue-900 hover:bg-blue-800 active:bg-blue-950 text-white font-black shadow-md shadow-blue-950/30 border border-blue-700/50',
    emerald:
      'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 border border-emerald-500/40 font-black',
    cyan:
      'bg-cyan-600 hover:bg-cyan-500 text-white shadow-md shadow-cyan-600/20 border border-cyan-500/40 font-black',
  };

  const sizes = {
    sm: 'text-xs px-3 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2 gap-2',
    lg: 'text-base px-5 py-2.5 gap-2.5',
    icon: 'p-2 w-9 h-9',
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
      ) : (
        leftIcon && <span className="shrink-0">{leftIcon}</span>
      )}
      {children}
      {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
    </button>
  );
};
