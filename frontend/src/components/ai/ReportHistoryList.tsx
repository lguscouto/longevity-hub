import React from 'react';
import { History, Calendar, Check } from 'lucide-react';
import { Button, EmptyState } from '../ui';
import { SavedReportItem, ActiveReportMeta, TimeWindow } from './types';

export interface ReportHistoryListProps {
  reports: SavedReportItem[];
  activeReportMeta: ActiveReportMeta | null;
  onSelectReport: (id: number) => void;
  onGoToAnalyze: () => void;
  timeWindowLabels: Record<TimeWindow, string>;
}

export const ReportHistoryList: React.FC<ReportHistoryListProps> = ({
  reports,
  activeReportMeta,
  onSelectReport,
  onGoToAnalyze,
  timeWindowLabels,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-cyan-500" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Histórico de Relatórios de Longevidade
          </h3>
        </div>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {reports.length} relatório(s) arquivado(s)
        </span>
      </div>

      {reports.length === 0 ? (
        <EmptyState
          title="Nenhum relatório salvo no histórico"
          description="Gere sua primeira síntese de dados na aba 'Analisar Tendências' para arquivá-la aqui."
          icon={History}
          action={{
            label: 'Ir para Analisar Tendências',
            onClick: onGoToAnalyze,
          }}
        />
      ) : (
        <div className="space-y-3">
          {reports.map((rep) => {
            const isCurrent = activeReportMeta?.id === rep.id;
            const dateFormatted = new Date(rep.created_at).toLocaleString([], {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });
            return (
              <div
                key={rep.id}
                className={`p-4 sm:p-5 rounded-radius-lg border transition text-left space-y-3 shadow-xs ${
                  isCurrent
                    ? 'bg-cyan-500/10 border-cyan-500/40 shadow-sm'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Calendar className="h-4 w-4 text-cyan-500 shrink-0" />
                    <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                      {dateFormatted}
                    </span>
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase ${
                        rep.time_window === 'today'
                          ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                          : rep.time_window === '7d'
                          ? 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30'
                          : 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30'
                      }`}
                    >
                      {timeWindowLabels[rep.time_window || '30d']}
                    </span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
                      {rep.model?.split('/')[1] || rep.model}
                    </span>
                  </div>

                  <div className="shrink-0">
                    {isCurrent ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-radius-md bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 text-xs font-bold border border-cyan-500/30">
                        <Check className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
                        <span>Ativo no Painel</span>
                      </span>
                    ) : (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => onSelectReport(rep.id)}
                        className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold"
                      >
                        Visualizar no Painel
                      </Button>
                    )}
                  </div>
                </div>

                {rep.summary && (
                  <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 italic leading-relaxed">
                    "{rep.summary}"
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
