import React from 'react';
import { LucideIcon, RefreshCw } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: LucideIcon;
  rightIcon?: LucideIcon;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold shadow-xs border border-emerald-600/30 dark:border-emerald-500/30',
  secondary:
    'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 active:bg-slate-300 dark:active:bg-slate-600 text-slate-800 dark:text-slate-100 font-semibold border border-slate-200 dark:border-slate-700 shadow-xs',
  outline:
    'bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800/60 active:bg-slate-200 dark:active:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold border border-slate-200 dark:border-slate-700',
  ghost:
    'bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800/80 active:bg-slate-200 dark:active:bg-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 font-medium',
  destructive:
    'bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white font-bold shadow-xs border border-rose-600/30',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs min-h-[36px] rounded-xl gap-1.5',
  md: 'px-4 py-2 text-xs sm:text-sm min-h-[40px] rounded-xl gap-2',
  lg: 'px-5 py-2.5 text-sm sm:text-base min-h-[48px] rounded-2xl gap-2.5',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'secondary',
      size = 'md',
      loading = false,
      leftIcon: LeftIcon,
      rightIcon: RightIcon,
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
        disabled={isDisabled}
        className={`inline-flex items-center justify-center transition-colors select-none shrink-0 ${
          variantClasses[variant]
        } ${sizeClasses[size]} ${
          isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        } focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950 ${className}`}
        {...props}
      >
        {loading ? (
          <RefreshCw className="h-4 w-4 animate-spin shrink-0" aria-hidden="true" />
        ) : (
          LeftIcon && <LeftIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
        )}
        <span>{children}</span>
        {!loading && RightIcon && <RightIcon className="h-4 w-4 shrink-0" aria-hidden="true" />}
      </button>
    );
  }
);

Button.displayName = 'Button';
