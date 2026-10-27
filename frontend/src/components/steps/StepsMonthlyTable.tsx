import React from 'react';
import { BarChart2, Trophy, TrendingUp, TrendingDown, Minus, CheckCircle2 } from 'lucide-react';
import { MonthlyStepSummary, formatStepNumber, formatDateBR } from './types';

export interface StepsMonthlyTableProps {
  monthlyStats: MonthlyStepSummary[];
}

export const StepsMonthlyTable: React.FC<StepsMonthlyTableProps> = ({ monthlyStats }) => {
  return (
    <div className="rounded-radius-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-2xs space-y-4">
      <div>
        <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <BarChart2 className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          Consolidado e Médias Mensais
        </h4>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Histórico mensal completo de passos, distâncias, recordes e adesão às metas
        </p>
      </div>

      <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-radius-lg shadow-2xs">
        <table className="w-full text-xs text-left" aria-label="Médias e totais mensais de passos">
          <caption className="sr-only">Histórico mensal de atividade e passos</caption>
          <thead className="bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-bold sticky top-0 border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th scope="col" className="p-3">Mês / Ano</th>
              <th scope="col" className="p-3">Média Diária</th>
              <th scope="col" className="p-3">Total de Passos</th>
              <th scope="col" className="p-3">Melhor Dia (Pico)</th>
              <th scope="col" className="p-3">Dias na Meta</th>
              <th scope="col" className="p-3">Distância Total</th>
              <th scope="col" className="p-3">Calorias</th>
              <th scope="col" className="p-3">Evolução Mensal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {monthlyStats.map((m) => {
              const isPositive = m.trend_vs_previous_month_pct != null && m.trend_vs_previous_month_pct > 0;
              const isNegative = m.trend_vs_previous_month_pct != null && m.trend_vs_previous_month_pct < 0;

              return (
                <tr key={m.month} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                  <td className="p-3 font-semibold text-slate-900 dark:text-white">
                    <div className="text-sm">{m.month_label}</div>
                    <div className="text-2xs text-slate-500 font-mono">
                      {m.days_recorded} dias registrados
                    </div>
                  </td>
                  <td className="p-3 font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400">
                    {formatStepNumber(m.avg_steps)}{' '}
                    <span className="text-2xs font-normal text-slate-500">passos/dia</span>
                  </td>
                  <td className="p-3 font-mono font-semibold text-slate-900 dark:text-white">
                    {formatStepNumber(m.total_steps)}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-1 font-mono font-semibold text-purple-600 dark:text-purple-400">
                      <Trophy className="h-3 w-3 text-amber-500" />
                      {formatStepNumber(m.max_steps)}
                    </div>
                    {m.max_steps_date && (
                      <div className="text-2xs text-slate-400">
                        {formatDateBR(m.max_steps_date)}
                      </div>
                    )}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {m.goal_hit_days} de {m.days_recorded} ({m.goal_hit_pct}%)
                    </div>
                    <div className="h-1.5 w-24 bg-slate-100 dark:bg-slate-800 rounded-radius-full mt-1 overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-radius-full"
                        style={{ width: `${Math.min(100, m.goal_hit_pct)}%` }}
                      />
                    </div>
                  </td>
                  <td className="p-3 font-mono text-slate-700 dark:text-slate-300">
                    {m.total_distance_km} km
                  </td>
                  <td className="p-3 font-mono text-amber-600 dark:text-amber-400">
                    {formatStepNumber(m.total_calories)} kcal
                  </td>
                  <td className="p-3">
                    {m.trend_vs_previous_month_pct != null ? (
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
                        {m.trend_vs_previous_month_pct > 0
                          ? `+${m.trend_vs_previous_month_pct}%`
                          : `${m.trend_vs_previous_month_pct}%`}
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
