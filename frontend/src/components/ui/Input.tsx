import React, { forwardRef } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean | string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', error, leftIcon, rightIcon, id, ...props }, ref) => {
    const hasError = Boolean(error);
    const errorId = typeof error === 'string' && id ? `${id}-error` : undefined;

    return (
      <div className="relative flex items-center w-full">
        {leftIcon && (
          <div className="absolute left-3 pointer-events-none text-slate-400 dark:text-slate-500">
            {leftIcon}
          </div>
        )}
        <input
          ref={ref}
          id={id}
          aria-invalid={hasError ? 'true' : undefined}
          aria-describedby={errorId}
          className={`w-full min-h-[42px] px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all
            bg-white dark:bg-slate-900 
            text-slate-900 dark:text-white 
            placeholder:text-slate-400 dark:placeholder:text-slate-500
            disabled:opacity-60 disabled:cursor-not-allowed
            ${leftIcon ? 'pl-9' : ''}
            ${rightIcon ? 'pr-9' : ''}
            ${
              hasError
                ? 'border-2 border-rose-500 dark:border-rose-500 focus-visible:ring-2 focus-visible:ring-rose-500/20 focus-visible:outline-none'
                : 'border border-slate-200 dark:border-slate-800 focus:border-emerald-500 dark:focus:border-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-500/20 focus-visible:outline-none'
            }
            ${className}`}
          {...props}
        />
        {rightIcon && (
          <div className="absolute right-3 pointer-events-none text-slate-400 dark:text-slate-500">
            {rightIcon}
          </div>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
