import React from 'react';
import { Filter, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { MonthlySleepSummary, formatMinutesToText } from './types';
import { Select, Button } from '../ui';

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
        <div className="w-full sm:w-auto min-w-[240px]">
          <Select
            aria-label="Selecionar Mês"
            value={selectedMonth}
            onChange={(e) => onSelectMonth(e.target.value)}
          >
            <option value="all">Todos os Meses ({totalRecordsCount} noites consolidadas)</option>
            {monthlySummaries.map((m) => (
              <option key={m.monthKey} value={m.monthKey}>
                {m.label} ({m.count} noites • média {formatMinutesToText(m.avgTotal)})
              </option>
            ))}
          </Select>
        </div>

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
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onSelectMonth('all')}
            className="text-xs text-cyan-600 dark:text-cyan-400 hover:underline font-semibold"
          >
            Limpar filtro
          </Button>
        )}
        {monthlySummaries.length > 0 && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onToggleMonthlyComparison}
            leftIcon={Calendar}
            rightIcon={showMonthlyComparison ? ChevronUp : ChevronDown}
          >
            {showMonthlyComparison ? 'Ocultar Quadro Mensal' : 'Ver Quadro Mensal'}
          </Button>
        )}
      </div>
    </div>
  );
};
