import React from 'react';

export type StatusVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral';

export interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: StatusVariant;
  size?: 'sm' | 'md';
  dot?: boolean;
  children: React.ReactNode;
}

const variantStyles: Record<StatusVariant, { badge: string; dot: string }> = {
  success: {
    badge: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25',
    dot: 'bg-emerald-500',
  },
  warning: {
    badge: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/25',
    dot: 'bg-amber-500',
  },
  error: {
    badge: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/25',
    dot: 'bg-rose-500',
  },
  info: {
    badge: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/25',
    dot: 'bg-cyan-500',
  },
  neutral: {
    badge: 'bg-slate-100 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700',
    dot: 'bg-slate-400',
  },
};

const sizeStyles = {
  sm: 'text-xs px-2.5 py-0.5 rounded-full',
  md: 'text-xs sm:text-sm px-3 py-1 rounded-full font-semibold',
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  variant = 'neutral',
  size = 'sm',
  dot = false,
  children,
  className = '',
  ...props
}) => {
  const styles = variantStyles[variant];

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-semibold border select-none ${styles.badge} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${styles.dot} shrink-0`} aria-hidden="true" />}
      <span>{children}</span>
    </span>
  );
};
