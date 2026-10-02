import React, { forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean | string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className = '', error, children, id, ...props }, ref) => {
    const hasError = Boolean(error);
    const errorId = typeof error === 'string' && id ? `${id}-error` : undefined;

    return (
      <div className="relative flex items-center w-full">
        <select
          ref={ref}
          id={id}
          aria-invalid={hasError ? 'true' : undefined}
          aria-describedby={errorId}
          className={`w-full min-h-[42px] px-3 py-2 pr-9 rounded-xl text-xs sm:text-sm font-medium transition-all appearance-none cursor-pointer
            bg-white dark:bg-slate-900 
            text-slate-900 dark:text-white 
            disabled:opacity-60 disabled:cursor-not-allowed
            ${
              hasError
                ? 'border-2 border-rose-500 dark:border-rose-500 focus-visible:ring-2 focus-visible:ring-rose-500/20 focus-visible:outline-none'
                : 'border border-slate-200 dark:border-slate-800 focus:border-emerald-500 dark:focus:border-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-500/20 focus-visible:outline-none'
            }
            ${className}`}
          {...props}
        >
          {children}
        </select>
        <ChevronDown className="absolute right-3 h-4 w-4 pointer-events-none text-slate-400 dark:text-slate-500" />
      </div>
    );
  }
);

Select.displayName = 'Select';
