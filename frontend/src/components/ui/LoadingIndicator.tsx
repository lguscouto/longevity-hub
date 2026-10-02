import React from 'react';
import { RefreshCw } from 'lucide-react';

export interface LoadingInlineProps {
  message?: string;
  size?: 'sm' | 'md';
  className?: string;
}

export const LoadingInline: React.FC<LoadingInlineProps> = ({
  message = 'Carregando...',
  size = 'md',
  className = '',
}) => {
  const iconSize = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';
  const textSize = size === 'sm' ? 'text-xs' : 'text-xs sm:text-sm';

  return (
    <div
      role="status"
      aria-live="polite"
      className={`inline-flex items-center gap-2 text-slate-500 dark:text-slate-400 font-medium ${textSize} ${className}`}
    >
      <RefreshCw className={`${iconSize} animate-spin text-emerald-500 shrink-0`} />
      <span>{message}</span>
    </div>
  );
};

export interface LoadingPanelProps {
  message?: string;
  skeletonRows?: number;
  className?: string;
}

export const LoadingPanel: React.FC<LoadingPanelProps> = ({
  message = 'Carregando dados...',
  skeletonRows = 3,
  className = '',
}) => {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/40 space-y-4 ${className}`}
    >
      <div className="flex items-center gap-3">
        <RefreshCw className="h-5 w-5 animate-spin text-emerald-500 shrink-0" />
        <span className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">
          {message}
        </span>
      </div>

      <div className="space-y-2.5 pt-2">
        {Array.from({ length: skeletonRows }).map((_, i) => (
          <div
            key={i}
            className="h-9 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse"
            style={{ opacity: 1 - i * 0.2 }}
          />
        ))}
      </div>
    </div>
  );
};
