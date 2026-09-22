import React from 'react';

interface NotificationBadgeProps {
  count: number;
  className?: string;
  max?: number;
  variant?: 'badge' | 'dot';
  size?: 'xs' | 'sm' | 'md';
}

export const NotificationBadge: React.FC<NotificationBadgeProps> = ({
  count,
  className = '',
  max = 99,
  variant = 'badge',
  size = 'sm',
}) => {
  if (count <= 0) return null;

  if (variant === 'dot') {
    return (
      <span
        aria-label="New notifications"
        className={`inline-block w-2 h-2 rounded-full bg-rose-600 dark:bg-rose-500 ring-2 ring-white dark:ring-slate-950 animate-pulse ${className}`}
      />
    );
  }

  const displayCount = count > max ? `${max}+` : count;

  const sizeClasses =
    size === 'xs'
      ? 'min-w-[14px] h-3.5 text-[8px] px-1'
      : size === 'md'
      ? 'min-w-[20px] h-5 text-[11px] px-1.5'
      : 'min-w-[16px] h-4 text-[9px] px-1';

  return (
    <span
      className={`inline-flex items-center justify-center font-black rounded-full bg-rose-600 dark:bg-rose-500 text-white shadow-xs border border-white dark:border-slate-950 animate-in zoom-in-75 duration-150 leading-none shrink-0 select-none ${sizeClasses} ${className}`}
    >
      {displayCount}
    </span>
  );
};

