import React from 'react';
import { Inbox } from 'lucide-react';
import { Button } from './Button';
import { AbsenceKind, describeAbsence } from '../../lib/dataSemantics';

export interface PipelineStep {
  step: number;
  label: string;
  done?: boolean;
  active?: boolean;
}

export interface EmptyStateProps {
  title: string;
  description?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  absenceKind?: AbsenceKind;
  source?: string;
  lastSync?: string;
  reason?: string;
  pipelineSteps?: PipelineStep[];
  action?: {
    label: string;
    onClick: () => void;
    icon?: React.ComponentType<{ className?: string }>;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon: Icon = Inbox,
  absenceKind,
  source,
  lastSync,
  reason,
  pipelineSteps,
  action,
  secondaryAction,
  className = '',
}) => {
  const ActionIcon = action?.icon;
  const absenceMeta = absenceKind ? describeAbsence(absenceKind) : null;

  return (
    <div
      role="status"
      className={`p-6 sm:p-10 text-center flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 ${className}`}
    >
      <div className="h-12 w-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center mb-3 shadow-2xs">
        <Icon className="h-6 w-6" />
      </div>

      {absenceMeta && (
        <div className="mb-2">
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${absenceMeta.badgeClass}`}
            title={absenceMeta.description}
          >
            {absenceMeta.label}
          </span>
        </div>
      )}

      <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight mb-1">
        {title}
      </h4>

      {description && (
        <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md leading-relaxed mb-3">
          {description}
        </div>
      )}

      {(source || lastSync || reason) && (
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-xs text-slate-500 dark:text-slate-400 mb-4 py-2 px-3.5 rounded-radius-md bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800/80 max-w-lg">
          {source && <span><strong className="text-slate-700 dark:text-slate-300">Fonte:</strong> {source}</span>}
          {lastSync && <span><strong className="text-slate-700 dark:text-slate-300">Última sinc:</strong> {lastSync}</span>}
          {reason && <span><strong className="text-slate-700 dark:text-slate-300">Motivo:</strong> {reason}</span>}
        </div>
      )}

      {pipelineSteps && pipelineSteps.length > 0 && (
        <div className="w-full max-w-md mb-4 p-3.5 rounded-radius-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-left shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-2.5">
            Fluxo Inicial Recomendado
          </span>
          <ol className="space-y-2">
            {pipelineSteps.map((step) => (
              <li key={step.step} className="flex items-center gap-2.5 text-xs">
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    step.done
                      ? 'bg-emerald-500 text-white'
                      : step.active
                        ? 'bg-cyan-500 text-slate-950 font-bold ring-2 ring-cyan-500/30'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {step.step}
                </span>
                <span
                  className={
                    step.active
                      ? 'font-bold text-slate-900 dark:text-white'
                      : 'text-slate-600 dark:text-slate-400'
                  }
                >
                  {step.label}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {(action || secondaryAction) && (
        <div className="flex flex-wrap items-center justify-center gap-2.5 mt-1">
          {action && (
            <Button
              variant="primary"
              size="sm"
              onClick={action.onClick}
              leftIcon={ActionIcon}
            >
              {action.label}
            </Button>
          )}

          {secondaryAction && (
            <Button
              variant="outline"
              size="sm"
              onClick={secondaryAction.onClick}
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
