import React, { forwardRef } from 'react';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean | string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className = '', error, id, ...props }, ref) => {
    const hasError = Boolean(error);
    const errorId = typeof error === 'string' && id ? `${id}-error` : undefined;

    return (
      <textarea
        ref={ref}
        id={id}
        aria-invalid={hasError ? 'true' : undefined}
        aria-describedby={errorId}
        className={`w-full p-3 rounded-xl text-xs sm:text-sm font-medium transition-all resize-y min-h-[80px]
          bg-white dark:bg-slate-900 
          text-slate-900 dark:text-white 
          placeholder:text-slate-400 dark:placeholder:text-slate-500
          disabled:opacity-60 disabled:cursor-not-allowed
          ${
            hasError
              ? 'border-2 border-rose-500 dark:border-rose-500 focus-visible:ring-2 focus-visible:ring-rose-500/20 focus-visible:outline-none'
              : 'border border-slate-200 dark:border-slate-800 focus:border-emerald-500 dark:focus:border-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-500/20 focus-visible:outline-none'
          }
          ${className}`}
        {...props}
      />
    );
  }
);

Textarea.displayName = 'Textarea';
