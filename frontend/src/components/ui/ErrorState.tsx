import React, { useState } from 'react';
import { AlertCircle, AlertTriangle, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from './Button';

export interface InlineErrorProps {
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

export const InlineError: React.FC<InlineErrorProps> = ({
  message,
  onRetry,
  retryLabel = 'Tentar novamente',
  className = '',
}) => {
  return (
    <div
      role="alert"
      className={`p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300 flex items-center justify-between gap-3 ${className}`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
        <span className="truncate">{message}</span>
      </div>

      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="font-semibold text-rose-800 dark:text-rose-200 hover:underline shrink-0 flex items-center gap-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-rose-500 rounded"
        >
          <RefreshCw className="h-3 w-3" />
          <span>{retryLabel}</span>
        </button>
      )}
    </div>
  );
};

export interface ErrorStateProps {
  title?: string;
  message: string;
  details?: string;
  onRetry?: () => void;
  actionLabel?: string;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Não foi possível carregar as informações',
  message,
  details,
  onRetry,
  actionLabel = 'Tentar novamente',
  className = '',
}) => {
  const [showDetails, setShowDetails] = useState<boolean>(false);

  return (
    <div
      role="alert"
      className={`p-8 text-center flex flex-col items-center justify-center rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/20 ${className}`}
    >
      <div className="h-12 w-12 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-3">
        <AlertTriangle className="h-6 w-6" />
      </div>

      <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight mb-1">
        {title}
      </h4>

      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-md leading-relaxed mb-4">
        {message}
      </p>

      {details && (
        <div className="w-full max-w-md mb-4 text-left">
          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 flex items-center gap-1 mb-1 focus-visible:outline-none"
          >
            {showDetails ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            <span>{showDetails ? 'Ocultar detalhes técnicos' : 'Ver detalhes técnicos'}</span>
          </button>
          {showDetails && (
            <pre className="p-2.5 rounded-xl bg-slate-900 text-slate-200 text-[11px] font-mono overflow-x-auto">
              {details}
            </pre>
          )}
        </div>
      )}

      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          leftIcon={RefreshCw}
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
