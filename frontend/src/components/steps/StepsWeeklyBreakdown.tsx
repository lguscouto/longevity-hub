import React from 'react';
import { Calendar, TrendingUp, TrendingDown, Minus, CheckCircle2, Clock } from 'lucide-react';
import {
  WeeklyStepSummary,
  WeekdayAverage,
  HourlyStepDistribution,
  formatStepNumber,
} from './types';

export interface StepsWeeklyBreakdownProps {
  weeklyStats: WeeklyStepSummary[];
  weekdayAverages: WeekdayAverage[];
  hourlyDistribution?: HourlyStepDistribution[];
  targetGoal?: number;
}

export const StepsWeeklyBreakdown: React.FC<StepsWeeklyBreakdownProps> = ({
  weeklyStats,
  weekdayAverages,
  hourlyDistribution = [],
  targetGoal = 8000,
}) => {
  const maxWeekdayAvg = Math.max(...weekdayAverages.map((d) => d.avg_steps), 1);
  const bestWeekday = [...weekdayAverages].sort((a, b) => b.avg_steps - a.avg_steps)[0];

  const hasHourlyData = hourlyDistribution.some((h) => h.avg_steps > 0);
  const maxHourSteps = Math.max(...hourlyDistribution.map((h) => h.avg_steps), 1);
  const peakHour = hasHourlyData
    ? [...hourlyDistribution].sort((a, b) => b.avg_steps - a.avg_steps)[0]
    : null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Coluna 1: Padrão por Dia da Semana (1/3) */}
        <div className="rounded-radius-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-2xs space-y-4">
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Calendar className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              Padrão por Dia da Semana
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Médias históricas consolidadas de Segunda a Domingo
            </p>
          </div>

          {bestWeekday && bestWeekday.avg_steps > 0 && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-radius-lg p-2.5 text-xs text-emerald-800 dark:text-emerald-300">
              Dia mais ativo:{' '}
              <strong className="font-semibold text-emerald-900 dark:text-emerald-200">
                {bestWeekday.day_name}
              </strong>{' '}
              com média de{' '}
              <strong className="font-mono">{formatStepNumber(bestWeekday.avg_steps)}</strong> passos.
            </div>
          )}

          <div className="space-y-2.5 pt-1">
            {weekdayAverages.map((day) => {
              const widthPct = Math.round((day.avg_steps / maxWeekdayAvg) * 100);
              const isMet = day.avg_steps >= targetGoal;
              const isBest = bestWeekday?.weekday === day.weekday && day.avg_steps > 0;

              return (
                <div key={day.weekday} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-medium">
                    <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                      <span className="font-bold w-7 text-left">{day.short_name}</span>
                      <span className="text-2xs text-slate-400">({day.days_count}d)</span>
                      {isBest && (
                        <span className="text-2xs font-bold text-amber-500 bg-amber-500/10 px-1 rounded-radius-sm">
                          Pico
                        </span>
                      )}
                    </span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {formatStepNumber(day.avg_steps)}{' '}
                      <span className="text-2xs font-normal text-slate-500">passos</span>
                    </span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-radius-full overflow-hidden">
                    <div
                      className={`h-full rounded-radius-full transition-all duration-300 ${
                        isMet ? 'bg-emerald-500' : 'bg-slate-400 dark:bg-slate-600'
                      }`}
                      style={{ width: `${Math.max(5, widthPct)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Coluna 2 e 3: Histórico Semanal Consolidado (2/3) */}
        <div className="lg:col-span-2 rounded-radius-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-2xs space-y-4">
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Calendar className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
              Médias Semanais Detalhadas
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Acompanhe a consistência semana a semana com comparativo de evolução (Δ%)
            </p>
          </div>

          <div className="overflow-x-auto max-h-80 border border-slate-200 dark:border-slate-800 rounded-radius-lg shadow-2xs">
            <table className="w-full text-xs text-left" aria-label="Histórico semanal de passos">
              <caption className="sr-only">Evolução dos passos por semana</caption>
              <thead className="bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-bold sticky top-0 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th scope="col" className="p-2.5">Semana</th>
                  <th scope="col" className="p-2.5">Total de Passos</th>
                  <th scope="col" className="p-2.5">Média Diária</th>
                  <th scope="col" className="p-2.5">Atingimento da Meta</th>
                  <th scope="col" className="p-2.5">Evolução (vs. anterior)</th>
                  <th scope="col" className="p-2.5">Pico da Semana</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {weeklyStats.slice(0, 16).map((week, idx) => {
                  const isPositive =
                    week.trend_vs_previous_pct != null && week.trend_vs_previous_pct > 0;
                  const isNegative =
                    week.trend_vs_previous_pct != null && week.trend_vs_previous_pct < 0;
                  const isCurrentPartialWeek =
                    idx === 0 && week.days_recorded === 1 && week.trend_vs_previous_pct == null;

                  return (
                    <tr
                      key={week.week_key}
                      className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors"
                    >
                      <td className="p-2.5 font-medium text-slate-900 dark:text-white">
                        <div className="font-bold">{week.week_label}</div>
                        <div className="text-2xs text-slate-500 font-mono">
                          {week.week_key} ({week.days_recorded}d)
                        </div>
                      </td>
                      <td className="p-2.5 font-mono font-bold text-slate-900 dark:text-white">
                        {formatStepNumber(week.total_steps)}
                      </td>
                      <td className="p-2.5 font-mono text-cyan-600 dark:text-cyan-400 font-semibold">
                        {formatStepNumber(week.avg_steps)}
                      </td>
                      <td className="p-2.5">
                        <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="h-3 w-3" />
                          {week.goal_met_days} de {week.days_recorded} ({week.goal_hit_pct}%)
                        </span>
                      </td>
                      <td className="p-2.5">
                        {week.trend_vs_previous_pct != null ? (
                          <span
                            className={`inline-flex items-center gap-0.5 font-bold ${
                              isPositive
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : isNegative
                                ? 'text-rose-600 dark:text-rose-400'
                                : 'text-slate-500'
                            }`}
                          >
                            {isPositive ? (
                              <TrendingUp className="h-3 w-3" />
                            ) : isNegative ? (
                              <TrendingDown className="h-3 w-3" />
                            ) : (
                              <Minus className="h-3 w-3" />
                            )}
                            {week.trend_vs_previous_pct > 0
                              ? `+${week.trend_vs_previous_pct}%`
                              : `${week.trend_vs_previous_pct}%`}
                          </span>
                        ) : isCurrentPartialWeek ? (
                          <span className="inline-flex items-center gap-1 text-2xs font-semibold text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded-radius-sm">
                            <Clock className="h-3 w-3" /> Em andamento
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="p-2.5 font-mono text-purple-600 dark:text-purple-400 font-semibold">
                        {formatStepNumber(week.max_steps)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Linha de Distribuição Horária Intradia (Extraído de stage do Zepp) */}
      {hasHourlyData && (
        <div className="rounded-radius-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-2xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-500" />
                Ritmo Circadiano de Passos (Distribuição Horária Zepp)
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Média de passos por faixa horária do dia extraída dos estágios intradia do relógio
              </p>
            </div>
            {peakHour && (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-radius-lg bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                Horário de Pico: <strong className="font-mono">{peakHour.label}</strong> (~
                {formatStepNumber(peakHour.avg_steps)} passos/h)
              </span>
            )}
          </div>

          <div className="h-28 flex items-end gap-1 pt-2 border-b border-slate-200 dark:border-slate-800">
            {hourlyDistribution.map((h) => {
              const pct = Math.max(4, Math.round((h.avg_steps / maxHourSteps) * 100));
              const isPeak = peakHour?.hour === h.hour;
              return (
                <div
                  key={h.hour}
                  className="flex-1 h-full flex flex-col justify-end items-center group"
                  title={`${h.label}: média de ${formatStepNumber(h.avg_steps)} passos`}
                >
                  <div
                    className={`w-full rounded-t-xs transition-all ${
                      isPeak
                        ? 'bg-amber-500'
                        : h.avg_steps > maxHourSteps * 0.5
                        ? 'bg-emerald-500/80'
                        : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                    style={{ height: `${pct}%` }}
                  />
                </div>
              );
            })}
          </div>
          <div className="flex justify-between text-2xs font-mono text-slate-400">
            <span>00h</span>
            <span>06h</span>
            <span>12h</span>
            <span>18h</span>
            <span>23h</span>
          </div>
        </div>
      )}
    </div>
  );
};
