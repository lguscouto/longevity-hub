import React from 'react';
import { Filter, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { MonthlySleepSummary, formatMinutesToText } from './types';

export interface SleepFiltersProps {
  selectedMonth: string;
  onSelectMonth: (month: string) => void;
  totalRecordsCount: number;
  monthlySummaries: MonthlySleepSummary[];
  showMonthlyComparison: boolean;
  onToggleMonthlyComparison: () => void;
}

export const SleepFilters: React.FC<SleepFiltersProps> = ({
  selectedMonth,
  onSelectMonth,
  totalRecordsCount,
  monthlySummaries,
  showMonthlyComparison,
  onToggleMonthlyComparison,
}) => {
  return (
    <div className="glass-panel p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-semibold text-xs uppercase tracking-wider">
          <Filter className="h-4 w-4 text-cyan-500" />
          <span>Filtrar por Mês:</span>
        </div>

        {/* Month Dropdown Select */}
        <select
          aria-label="Selecionar Mês"
          value={selectedMonth}
          onChange={(e) => onSelectMonth(e.target.value)}
          className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:border-cyan-500 focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:outline-none transition-colors shadow-2xs"
        >
          <option value="all">Todos os Meses ({totalRecordsCount} noites consolidadas)</option>
          {monthlySummaries.map((m) => (
            <option key={m.monthKey} value={m.monthKey}>
              {m.label} ({m.count} noites • média {formatMinutesToText(m.avgTotal)})
            </option>
          ))}
        </select>

        {/* Quick Pills for Recent Months */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          <button
            type="button"
            onClick={() => onSelectMonth('all')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all shrink-0 ${
              selectedMonth === 'all'
                ? 'bg-cyan-500 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Todos
          </button>
          {monthlySummaries.map((m) => {
            const isSelected = selectedMonth === m.monthKey;
            return (
              <button
                key={m.monthKey}
                type="button"
                onClick={() => onSelectMonth(m.monthKey)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                  isSelected
                    ? 'bg-cyan-500 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {m.shortLabel} ({m.count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Filter Info & Reset Button / Toggle Monthly Table */}
      <div className="flex items-center gap-2 shrink-0">
        {selectedMonth !== 'all' && (
          <button
            type="button"
            onClick={() => onSelectMonth('all')}
            className="text-xs text-cyan-600 dark:text-cyan-400 hover:underline font-semibold flex items-center gap-1 mr-2"
          >
            Limpar filtro
          </button>
        )}
        {monthlySummaries.length > 0 && (
          <button
            type="button"
            onClick={onToggleMonthlyComparison}
            className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs font-semibold transition-all inline-flex items-center gap-1.5"
          >
            <Calendar className="h-3.5 w-3.5 text-cyan-500" />
            <span>{showMonthlyComparison ? 'Ocultar Quadro Mensal' : 'Ver Quadro Mensal'}</span>
            {showMonthlyComparison ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        )}
      </div>
    </div>
  );
};
