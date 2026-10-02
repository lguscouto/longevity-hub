import React from 'react';
import { LucideIcon, RefreshCw } from 'lucide-react';
import { ButtonVariant } from './Button';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon;
  'aria-label': string;
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white shadow-xs border border-emerald-600/30',
  secondary:
    'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 active:bg-slate-300 dark:active:bg-slate-600 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-xs',
  outline:
    'bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800/60 active:bg-slate-200 dark:active:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700',
  ghost:
    'bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800/80 active:bg-slate-200 dark:active:bg-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100',
  destructive:
    'bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white shadow-xs border border-rose-600/30',
};

const sizeClasses = {
  sm: 'h-8 w-8 min-h-[32px] min-w-[32px] rounded-lg p-1.5',
  md: 'h-10 w-10 min-h-[40px] min-w-[40px] rounded-xl p-2.5',
  lg: 'h-12 w-12 min-h-[48px] min-w-[48px] rounded-2xl p-3',
};

const iconSizes = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
};

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      icon: Icon,
      'aria-label': ariaLabel,
      variant = 'ghost',
      size = 'md',
      loading = false,
      disabled,
      className = '',
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        type="button"
        aria-label={ariaLabel}
        title={props.title || ariaLabel}
        disabled={isDisabled}
        className={`inline-flex items-center justify-center transition-colors select-none shrink-0 ${
          variantClasses[variant]
        } ${sizeClasses[size]} ${
          isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        } focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950 ${className}`}
        {...props}
      >
        {loading ? (
          <RefreshCw className={`${iconSizes[size]} animate-spin`} aria-hidden="true" />
        ) : (
          <Icon className={iconSizes[size]} aria-hidden="true" />
        )}
      </button>
    );
  }
);

IconButton.displayName = 'IconButton';
