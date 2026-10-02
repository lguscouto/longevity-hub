import React from 'react';
import { Activity, CheckCircle2, Circle } from 'lucide-react';
import { EmptyState } from '../ui';
import { Supplement, CHRONO_PERIODS, getPeriodForTiming } from './types';

export interface RoutineTodayViewProps {
  selectedDate: string;
  supplements: Supplement[];
  takenIds: number[];
  completionPct: number;
  onToggleLog: (id: number) => void;
  onOpenAddModal: () => void;
}

export const RoutineTodayView: React.FC<RoutineTodayViewProps> = ({
  selectedDate,
  supplements,
  takenIds,
  completionPct,
  onToggleLog,
  onOpenAddModal,
}) => {
  return (
    <div className="space-y-6">
      {/* Card de Progresso Geral da Adesão */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Activity className="h-4 w-4 text-emerald-500" />
              Progresso de Doses para {selectedDate}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Clique na dose para marcar ou desmarcar a ingestão diária.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              {takenIds.length} de {supplements.length} doses registradas
            </span>
            <span className="text-xs font-black px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              {completionPct}%
            </span>
          </div>
        </div>

        {/* Barra de Progresso */}
        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
          <div
            className="bg-emerald-500 h-2.5 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${completionPct}%` }}
          />
        </div>
      </div>

      {/* Se não houver suplementos */}
      {supplements.length === 0 ? (
        <EmptyState
          title="Nenhum composto cadastrado"
          description="Cadastre seus suplementos, peptídeos e hormônios para gerenciar sua rotina diária."
          action={{
            label: 'Adicionar Composto',
            onClick: onOpenAddModal,
          }}
        />
      ) : (
        <div className="space-y-6">
          {CHRONO_PERIODS.map((period) => {
            const items = supplements.filter((s) => getPeriodForTiming(s.timing) === period.key);
            if (items.length === 0) return null;

            const takenCount = items.filter((s) => takenIds.includes(s.id)).length;
            const PeriodIcon = period.icon;

            return (
              <div key={period.key} className="space-y-3">
                {/* Cabeçalho do Período */}
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg border ${period.accentColor}`}>
                      <PeriodIcon className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                        {period.label}
                      </h4>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {period.description}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {takenCount} de {items.length} tomados
                  </span>
                </div>

                {/* Doses do Período */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {items.map((supp) => {
                    const isTaken = takenIds.includes(supp.id);
                    const isHormone = supp.category === 'Hormônio' || supp.category === 'Peptídeo';

                    return (
                      <div
                        key={supp.id}
                        onClick={() => onToggleLog(supp.id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onToggleLog(supp.id);
                          }
                        }}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 text-left ${
                          isTaken
                            ? 'bg-emerald-500/10 dark:bg-emerald-950/20 border-emerald-500/30 dark:border-emerald-500/40 text-slate-900 dark:text-white shadow-sm'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <button
                            type="button"
                            aria-label={`Marcar dose de ${supp.name}`}
                            className="shrink-0 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none rounded-full"
                          >
                            {isTaken ? (
                              <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                            ) : (
                              <Circle className="h-6 w-6 text-slate-400 dark:text-slate-600" />
                            )}
                          </button>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h5
                                className={`text-sm font-bold truncate ${
                                  isTaken
                                    ? 'line-through text-slate-500 dark:text-slate-400'
                                    : 'text-slate-900 dark:text-white'
                                }`}
                              >
                                {supp.name}
                              </h5>
                              <span
                                className={`text-[9px] uppercase font-extrabold px-1.5 py-0.5 rounded border ${
                                  isHormone
                                    ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30'
                                    : 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border-cyan-500/30'
                                }`}
                              >
                                {supp.category || 'Suplemento'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                              <span className="font-extrabold text-cyan-600 dark:text-cyan-400">
                                {supp.dosage}
                              </span>
                              <span>•</span>
                              <span>{supp.frequency}</span>
                            </div>
                            {supp.notes && (
                              <p className="text-xs text-slate-400 dark:text-slate-500 truncate mt-1">
                                {supp.notes}
                              </p>
                            )}
                          </div>
                        </div>

                        <span className="text-xs font-semibold text-slate-400 shrink-0">
                          {isTaken ? 'Tomado' : 'Pendente'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
