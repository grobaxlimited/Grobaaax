import React from 'react';

interface CardProps {
  id?: string;
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
  hoverEffect?: boolean;
  onClick?: (e?: any) => void;
}

export const Card: React.FC<CardProps> = ({
  id,
  children,
  className = '',
  glow = false,
  hoverEffect = false,
  onClick,
}) => {
  return (
    <div
      id={id}
      onClick={onClick}
      className={`relative rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/90 text-slate-900 dark:text-slate-100 shadow-sm transition-all duration-200 ${
        glow ? 'border-purple-500/40 shadow-md shadow-purple-500/5' : ''
      } ${
        hoverEffect
          ? 'hover:border-purple-500/50 dark:hover:border-purple-500/50 hover:shadow-md cursor-pointer hover:-translate-y-0.5'
          : ''
      } ${className}`}
    >
      {children}
    </div>
  );
};

