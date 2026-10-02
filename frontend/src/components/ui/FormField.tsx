import React from 'react';

export interface FormFieldProps {
  id?: string;
  label?: string;
  helperText?: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}

export const FormField: React.FC<FormFieldProps> = ({
  id,
  label,
  helperText,
  error,
  required,
  className = '',
  children,
}) => {
  const errorId = id && error ? `${id}-error` : undefined;
  const helperId = id && helperText && !error ? `${id}-helper` : undefined;

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label
          htmlFor={id}
          className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
        >
          {label}
          {required && (
            <span className="text-rose-500 ml-0.5" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}

      {children}

      {error ? (
        <p id={errorId} role="alert" className="text-[11px] font-medium text-rose-600 dark:text-rose-400">
          {error}
        </p>
      ) : helperText ? (
        <p id={helperId} className="text-[11px] text-slate-500 dark:text-slate-400">
          {helperText}
        </p>
      ) : null}
    </div>
  );
};
