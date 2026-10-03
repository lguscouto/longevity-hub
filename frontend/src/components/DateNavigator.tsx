import React from 'react';
import { Calendar, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { TimeRangeControl, TimeRangeOption } from './ui';

const DAYS_RANGE_OPTIONS: TimeRangeOption<number>[] = [
  { value: 7, label: 'Últimos 7 dias', shortLabel: '7 dias', ariaLabel: 'Últimos 7 dias' },
  { value: 30, label: 'Últimos 30 dias', shortLabel: '30 dias', ariaLabel: 'Últimos 30 dias' },
  { value: 90, label: 'Últimos 90 dias', shortLabel: '90 dias', ariaLabel: 'Últimos 90 dias' },
];

interface DateNavigatorProps {
  selectedDate: string; // ISO format 'YYYY-MM-DD'
  onDateChange: (dateStr: string) => void;
  daysRange: number;
  onDaysRangeChange: (range: number) => void;
}

export const DateNavigator: React.FC<DateNavigatorProps> = ({
  selectedDate,
  onDateChange,
  daysRange,
  onDaysRangeChange
}) => {
  // Converte string 'YYYY-MM-DD' para objeto Date local
  const getCurrentDateObj = () => {
    if (!selectedDate) return new Date();
    const parts = selectedDate.split('-');
    if (parts.length === 3) {
      return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    }
    return new Date();
  };

  const handlePrevDay = () => {
    const d = getCurrentDateObj();
    d.setDate(d.getDate() - 1);
    const iso = d.toISOString().split('T')[0];
    onDateChange(iso);
  };

  const handleNextDay = () => {
    const d = getCurrentDateObj();
    d.setDate(d.getDate() + 1);
    const iso = d.toISOString().split('T')[0];
    onDateChange(iso);
  };

  const handleResetToday = () => {
    const today = new Date().toISOString().split('T')[0];
    onDateChange(today);
  };

  const formattedDateStr = getCurrentDateObj().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return (
    <div className="surface-card border border-slate-200 dark:border-slate-800 rounded-radius-xl p-2.5 sm:p-4 flex flex-col lg:flex-row items-center justify-between gap-3 sm:gap-4 shadow-sm max-w-full min-w-0">
      {/* Esquerda: Seletor de Data & Navegação Dia-a-Dia */}
      <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-3 w-full lg:w-auto justify-between lg:justify-start">
        <div className="flex items-center gap-0.5 sm:gap-1 bg-slate-100/90 dark:bg-slate-950 p-1 sm:p-1.5 rounded-radius-xl border border-slate-200 dark:border-slate-800 min-w-0">
          <button
            onClick={handlePrevDay}
            className="p-1.5 sm:p-2 rounded-radius-md hover:bg-slate-200/80 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition shrink-0 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
            title="Dia Anterior"
            aria-label="Dia Anterior"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>

          <div className="flex items-center gap-1.5 sm:gap-2 px-1.5 sm:px-3 min-w-0">
            <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden="true" />
            <input
              type="date"
              value={selectedDate}
              onChange={e => onDateChange(e.target.value)}
              className="bg-transparent text-slate-900 dark:text-white font-bold text-xs rounded-radius-sm px-0.5 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1 dark:focus-visible:ring-offset-slate-950 focus-visible:outline-none cursor-pointer max-w-[110px] sm:max-w-none"
            />
          </div>

          <button
            onClick={handleNextDay}
            className="p-1.5 sm:p-2 rounded-radius-md hover:bg-slate-200/80 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition shrink-0 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
            title="Dia Seguinte"
            aria-label="Dia Seguinte"
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <button
          onClick={handleResetToday}
          className="flex items-center gap-1 px-2 sm:px-3 py-1.5 sm:py-2 rounded-radius-md bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold border border-slate-200 dark:border-slate-700 shadow-sm transition shrink-0 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
          title="Ir para o Dia de Hoje"
        >
          <RotateCcw className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" aria-hidden="true" />
          <span>Hoje</span>
        </button>
      </div>

      {/* Centro: Exibição da Data por Extenso */}
      <div className="text-center lg:text-left">
        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 capitalize">
          {formattedDateStr}
        </span>
      </div>

      {/* Direita: Intervalo de Gráficos (7, 30, 90 dias) */}
      <div className="w-full sm:w-auto flex justify-center lg:justify-end overflow-x-auto no-scrollbar max-w-full">
        <TimeRangeControl<number>
          value={daysRange}
          onChange={onDaysRangeChange}
          options={DAYS_RANGE_OPTIONS}
          label="Período"
        />
      </div>
    </div>
  );
};
