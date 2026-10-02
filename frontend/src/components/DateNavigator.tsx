import React from 'react';
import { Calendar, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { TimeRangeControl, TimeRangeOption } from './ui';

const DAYS_RANGE_OPTIONS: TimeRangeOption<number>[] = [
  { value: 7, label: '7 dias', shortLabel: '7d', ariaLabel: 'Últimos 7 dias' },
  { value: 30, label: '30 dias', shortLabel: '30d', ariaLabel: 'Últimos 30 dias' },
  { value: 90, label: '90 dias', shortLabel: '90d', ariaLabel: 'Últimos 90 dias' },
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
    <div className="glass-card border border-slate-200 dark:border-slate-800 rounded-3xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
      {/* Esquerda: Seletor de Data & Navegação Dia-a-Dia */}
      <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
        <div className="flex items-center gap-1 bg-slate-100/90 dark:bg-slate-950 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800">
          <button
            onClick={handlePrevDay}
            className="p-2 rounded-xl hover:bg-slate-200/80 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition"
            title="Dia Anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <div className="flex items-center gap-2 px-3">
            <Calendar className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={e => onDateChange(e.target.value)}
              className="bg-transparent text-slate-900 dark:text-white font-bold text-xs focus:outline-none cursor-pointer"
            />
          </div>

          <button
            onClick={handleNextDay}
            className="p-2 rounded-xl hover:bg-slate-200/80 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition"
            title="Dia Seguinte"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <button
          onClick={handleResetToday}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold border border-slate-200 dark:border-slate-700 shadow-sm transition"
          title="Ir para o Dia de Hoje"
        >
          <RotateCcw className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" /> Hoje
        </button>
      </div>

      {/* Centro: Exibição da Data por Extenso */}
      <div className="text-center md:text-left">
        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 capitalize">
          {formattedDateStr}
        </span>
      </div>

      {/* Direita: Intervalo de Gráficos (7, 30, 90 dias) */}
      <TimeRangeControl<number>
        value={daysRange}
        onChange={onDaysRangeChange}
        options={DAYS_RANGE_OPTIONS}
        label="Período"
      />
    </div>
  );
};
