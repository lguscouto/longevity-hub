import React, { useState, useMemo } from 'react';
import { Moon, Sun, Wind, BarChart2, Table } from 'lucide-react';
import { TimeRangeControl, EmptyState, Button } from '../ui';
import {
  DailyMetric,
  MonthlySleepSummary,
  SleepChartRange,
  SLEEP_CHART_RANGE_OPTIONS,
  formatMinutesToHHMM,
  formatDateTimeDetails,
  calculateNightEfficiency,
  getEfficiencyBadge,
} from './types';

export interface SleepStagesChartProps {
  chartData: DailyMetric[];
  chartRange: SleepChartRange;
  onChartRangeChange: (range: SleepChartRange) => void;
  selectedMonth: string;
  monthlySummaries: MonthlySleepSummary[];
  onClearMonthFilter: () => void;
}

export const SleepStagesChart: React.FC<SleepStagesChartProps> = ({
  chartData,
  chartRange,
  onChartRangeChange,
  selectedMonth,
  monthlySummaries,
  onClearMonthFilter,
}) => {
  const [hoveredMetric, setHoveredMetric] = useState<DailyMetric | null>(null);
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');

  // Active tooltip data: hovered item, or fallback to latest record
  const activeTooltipData = useMemo<DailyMetric | null>(() => {
    if (hoveredMetric) return hoveredMetric;
    if (chartData.length > 0) return chartData[chartData.length - 1];
    return null;
  }, [hoveredMetric, chartData]);

  // Resumo condensado das métricas de sono do período (U22-P1-64 / U22-P1-65)
  const avgMetrics = useMemo(() => {
    if (chartData.length === 0) {
      return { total: 0, efficiency: 0, deep: 0, rem: 0, light: 0, awake: 0, deepPct: 0, remPct: 0 };
    }
    const count = chartData.length;
    const totalMins = chartData.reduce((acc, m) => acc + (m.sleep_minutes || 0), 0);
    const deepMins = chartData.reduce((acc, m) => acc + (m.sleep_deep_min || 0), 0);
    const remMins = chartData.reduce((acc, m) => acc + (m.sleep_rem_min || 0), 0);
    const lightMins = chartData.reduce((acc, m) => acc + (m.sleep_light_min || 0), 0);
    const awakeMins = chartData.reduce((acc, m) => acc + (m.sleep_awake_min || 0), 0);

    const avgTotal = Math.round(totalMins / count);
    const avgDeep = Math.round(deepMins / count);
    const avgRem = Math.round(remMins / count);
    const avgLight = Math.round(lightMins / count);
    const avgAwake = Math.round(awakeMins / count);

    const validEfficiencies = chartData
      .map((m) => calculateNightEfficiency(m.sleep_minutes, m.sleep_awake_min))
      .filter((v): v is number => v != null);

    const avgEff =
      validEfficiencies.length > 0
        ? Math.round(validEfficiencies.reduce((a, b) => a + b, 0) / validEfficiencies.length)
        : 0;

    const deepPct = avgTotal > 0 ? Math.round((avgDeep / avgTotal) * 100) : 0;
    const remPct = avgTotal > 0 ? Math.round((avgRem / avgTotal) * 100) : 0;

    return {
      total: avgTotal,
      efficiency: avgEff,
      deep: avgDeep,
      rem: avgRem,
      light: avgLight,
      awake: avgAwake,
      deepPct,
      remPct,
    };
  }, [chartData]);

  // Dynamic max value in minutes for Y-axis scaling
  const maxMinutesInChart = useMemo(() => {
    if (chartData.length === 0) return 600;
    let maxFound = 0;
    chartData.forEach((m) => {
      const sum = (m.sleep_deep_min || 0) + (m.sleep_rem_min || 0) + (m.sleep_light_min || 0) + (m.sleep_awake_min || 0);
      const total = m.sleep_minutes && m.sleep_minutes > sum ? m.sleep_minutes : sum;
      if (total > maxFound) maxFound = total;
    });
    return Math.max(600, Math.ceil((maxFound + 30) / 150) * 150); // ceil to multiples of 2.5h (150m)
  }, [chartData]);

  return (
    <div className="glass-panel p-6 rounded-radius-xl border border-slate-200 dark:border-slate-800 shadow-xs relative text-slate-900 dark:text-white">
      {/* Chart Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Moon className="h-5 w-5 text-indigo-500 dark:text-indigo-400" aria-hidden="true" />
            <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">Distribuição de Fases do Sono</h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Horas e minutos em Sono Profundo, REM, Leve e Acordado ({
              selectedMonth !== 'all'
                ? `${monthlySummaries.find((m) => m.monthKey === selectedMonth)?.label || selectedMonth} (${chartData.length} noites)`
                : chartRange === 'last20' ? 'Últimos 20 Registros' : chartRange === '30d' ? '30d' : chartRange === '60d' ? '60d' : 'Todo o Período'
            })
          </p>
        </div>

        {/* View Mode Toggle & Range Selector Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Seletor Gráfico vs Tabela Acessível (U22-P1-35 / U22-P1-64) */}
          <div
            role="group"
            aria-label="Modo de visualização dos estágios de sono"
            className="flex items-center bg-slate-100 dark:bg-slate-900 p-0.5 rounded-radius-lg border border-slate-200 dark:border-slate-800 text-xs"
          >
            <Button
              type="button"
              variant={viewMode === 'chart' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('chart')}
              aria-pressed={viewMode === 'chart'}
              leftIcon={BarChart2}
              className="text-xs min-h-0 h-auto py-1 px-2.5 font-bold"
            >
              Gráfico
            </Button>
            <Button
              type="button"
              variant={viewMode === 'table' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('table')}
              aria-pressed={viewMode === 'table'}
              leftIcon={Table}
              className="text-xs min-h-0 h-auto py-1 px-2.5 font-bold"
            >
              Tabela
            </Button>
          </div>

          {selectedMonth === 'all' ? (
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar max-w-full">
              <TimeRangeControl<SleepChartRange>
                value={chartRange}
                onChange={onChartRangeChange}
                options={SLEEP_CHART_RANGE_OPTIONS}
                activeColor="indigo"
                size="sm"
              />
              <div className="ml-2 pl-2 border-l border-slate-200 dark:border-slate-800 hidden lg:block">
                <span className="px-2.5 py-1 rounded-radius-md bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 border border-indigo-500/20 dark:border-indigo-500/30 text-xs font-semibold">
                  Monitoramento
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="px-3 py-1.5 rounded-radius-lg bg-cyan-500/10 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-300 border border-cyan-500/20 dark:border-cyan-500/30 text-xs font-semibold">
                Mês: {monthlySummaries.find((m) => m.monthKey === selectedMonth)?.shortLabel || selectedMonth}
              </span>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={onClearMonthFilter}
                className="text-xs font-medium min-h-0 h-auto py-1 px-2.5"
              >
                Ver todo período
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Resumo Textual das Métricas do Período (U22-P1-64 / U22-P1-65) */}
      {chartData.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4 p-3 rounded-radius-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80 text-xs">
          <div>
            <span className="text-slate-500 dark:text-slate-400 block font-medium">Duração Média</span>
            <span className="text-sm font-bold text-slate-900 dark:text-white">
              {formatMinutesToHHMM(avgMetrics.total)}
            </span>
          </div>
          <div>
            <span className="text-slate-500 dark:text-slate-400 block font-medium">Eficiência Média</span>
            <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
              {avgMetrics.efficiency}%
            </span>
          </div>
          <div>
            <span className="text-slate-500 dark:text-slate-400 block font-medium">Sono Profundo Médio</span>
            <span className="text-sm font-bold text-purple-600 dark:text-purple-400">
              {formatMinutesToHHMM(avgMetrics.deep)}{' '}
              <span className="text-xs font-normal opacity-80">({avgMetrics.deepPct}%)</span>
            </span>
          </div>
          <div>
            <span className="text-slate-500 dark:text-slate-400 block font-medium">Sono REM Médio</span>
            <span className="text-sm font-bold text-cyan-600 dark:text-cyan-400">
              {formatMinutesToHHMM(avgMetrics.rem)}{' '}
              <span className="text-xs font-normal opacity-80">({avgMetrics.remPct}%)</span>
            </span>
          </div>
        </div>
      )}

      {/* Interactive Stacked Chart Component or Accessible Table */}
      {chartData.length === 0 ? (
        <div className="py-12">
          <EmptyState
            title="Sem registros de sono no período"
            description="Nenhum registro de sono disponível para o período selecionado."
            icon={Moon}
          />
        </div>
      ) : viewMode === 'table' ? (
        /* Alternativa Textual em Tabela Acessível (U22-P1-35 / U22-P1-64 / U22-P1-65) */
        <div className="overflow-x-auto max-h-80 border border-slate-200 dark:border-slate-800 rounded-radius-lg shadow-2xs">
          <table className="w-full text-xs text-left" aria-label="Tabela detalhada de estágios do sono">
            <caption className="sr-only">Detalhamento dos estágios e métricas de sono por noite</caption>
            <thead className="bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-bold sticky top-0 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th scope="col" className="p-2.5">Data</th>
                <th scope="col" className="p-2.5">Duração Total</th>
                <th scope="col" className="p-2.5">Eficiência</th>
                <th scope="col" className="p-2.5">Profundo</th>
                <th scope="col" className="p-2.5">REM</th>
                <th scope="col" className="p-2.5">Leve</th>
                <th scope="col" className="p-2.5">Acordado</th>
                <th scope="col" className="p-2.5">Freq. Resp.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {chartData.map((m) => {
                const eff = calculateNightEfficiency(m.sleep_minutes, m.sleep_awake_min);
                const badge = getEfficiencyBadge(eff, m.sleep_minutes);
                return (
                  <tr key={m.date_ref} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                    <td className="p-2.5 font-mono font-medium">{m.date_ref}</td>
                    <td className="p-2.5 font-bold text-slate-900 dark:text-white">
                      {formatMinutesToHHMM(m.sleep_minutes)}
                    </td>
                    <td className="p-2.5">
                      <span className={`font-semibold ${badge?.textClass || 'text-slate-700 dark:text-slate-300'}`}>
                        {badge?.pct != null ? `${badge.pct}%` : '—'}
                      </span>
                    </td>
                    <td className="p-2.5 text-purple-600 dark:text-purple-400 font-semibold">
                      {formatMinutesToHHMM(m.sleep_deep_min)}
                    </td>
                    <td className="p-2.5 text-cyan-600 dark:text-cyan-400 font-semibold">
                      {formatMinutesToHHMM(m.sleep_rem_min)}
                    </td>
                    <td className="p-2.5 text-slate-600 dark:text-slate-400">
                      {formatMinutesToHHMM(m.sleep_light_min)}
                    </td>
                    <td className="p-2.5 text-amber-600 dark:text-amber-400">
                      {formatMinutesToHHMM(m.sleep_awake_min)}
                    </td>
                    <td className="p-2.5 font-mono text-slate-500 dark:text-slate-400">
                      {m.respiratory_rate_rpm != null ? `${m.respiratory_rate_rpm.toFixed(1)} rpm` : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="relative pt-4 pb-2">
          {/* FLOATING HOVER / FOCUS TOOLTIP com aria-live (U22-P1-64) */}
          {activeTooltipData && (
            <div
              role="region"
              aria-live="polite"
              aria-label={`Detalhes do sono de ${activeTooltipData.date_ref}`}
              className="hidden sm:block absolute top-4 right-8 z-20 bg-slate-950 border border-slate-700/80 rounded-radius-xl p-4 shadow-dialog min-w-[220px] transition-all"
            >
              <div className="text-sm font-bold text-white mb-2 border-b border-slate-800 pb-1.5 flex items-center justify-between">
                <span>{activeTooltipData.date_ref}</span>
                <span className="text-xs text-slate-400 font-normal">
                  Total: {formatMinutesToHHMM(activeTooltipData.sleep_minutes)}
                </span>
              </div>

              {/* Horários de Início e Término */}
              {(activeTooltipData.sleep_start || activeTooltipData.sleep_end) && (
                <div className="mb-2 pb-2 border-b border-slate-800/80 space-y-1 text-xs">
                  {activeTooltipData.sleep_start && (
                    <div className="flex items-center justify-between text-indigo-300">
                      <span className="flex items-center gap-1">
                        <Moon className="h-3 w-3" aria-hidden="true" /> Dormiu:
                      </span>
                      <span className="font-mono font-semibold">
                        {formatDateTimeDetails(activeTooltipData.sleep_start).time} ({formatDateTimeDetails(activeTooltipData.sleep_start).date})
                      </span>
                    </div>
                  )}
                  {activeTooltipData.sleep_end && (
                    <div className="flex items-center justify-between text-amber-300">
                      <span className="flex items-center gap-1">
                        <Sun className="h-3 w-3" aria-hidden="true" /> Acordou:
                      </span>
                      <span className="font-mono font-semibold">
                        {formatDateTimeDetails(activeTooltipData.sleep_end).time} ({formatDateTimeDetails(activeTooltipData.sleep_end).date})
                      </span>
                    </div>
                  )}
                  {calculateNightEfficiency(activeTooltipData.sleep_minutes, activeTooltipData.sleep_awake_min) != null && (() => {
                    const eff = calculateNightEfficiency(activeTooltipData.sleep_minutes, activeTooltipData.sleep_awake_min);
                    const badge = getEfficiencyBadge(eff, activeTooltipData.sleep_minutes);
                    return (
                      <div className="flex items-center justify-between font-semibold pt-0.5">
                        <span className="text-slate-300">Eficiência:</span>
                        <span className={badge?.textClass || 'text-emerald-400'}>
                          {badge?.pct}% {badge?.tag ? `(${badge.tag})` : ''}
                        </span>
                      </div>
                    );
                  })()}
                </div>
              )}

              <div className="space-y-1.5 text-xs font-semibold">
                <div className="flex items-center justify-between text-purple-400">
                  <span>Profundo:</span>
                  <span>{formatMinutesToHHMM(activeTooltipData.sleep_deep_min)}</span>
                </div>
                <div className="flex items-center justify-between text-cyan-400">
                  <span>REM:</span>
                  <span>{formatMinutesToHHMM(activeTooltipData.sleep_rem_min)}</span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span>Leve:</span>
                  <span>{formatMinutesToHHMM(activeTooltipData.sleep_light_min)}</span>
                </div>
                <div className="flex items-center justify-between text-amber-400">
                  <span>Acordado:</span>
                  <span>{formatMinutesToHHMM(activeTooltipData.sleep_awake_min)}</span>
                </div>
              </div>

              {activeTooltipData.respiratory_rate_rpm != null && (
                <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-cyan-400 font-semibold">
                  <span className="flex items-center gap-1">
                    <Wind className="h-3 w-3" aria-hidden="true" /> Freq. Resp.:
                  </span>
                  <span className="font-mono">{activeTooltipData.respiratory_rate_rpm.toFixed(1)} rpm</span>
                </div>
              )}
            </div>
          )}

          {/* Y-Axis Grid Lines & Chart Area */}
          <div className="relative h-64 flex flex-col justify-between pl-12 pr-4 border-b border-slate-200 dark:border-slate-800">
            {/* Grid Lines */}
            {[1, 0.75, 0.5, 0.25, 0].map((ratio) => {
              const totalMins = maxMinutesInChart * ratio;
              const hhmm = formatMinutesToHHMM(totalMins);
              return (
                <div key={ratio} className="relative w-full border-b border-slate-200/60 dark:border-slate-800/60 flex items-center">
                  <span className="absolute -left-12 text-xs text-slate-400 dark:text-slate-500 font-mono">
                    {hhmm}
                  </span>
                </div>
              );
            })}

            {/* Bars Container */}
            <div className="absolute inset-0 pl-12 pr-4 flex items-end justify-between gap-1 sm:gap-2">
              {chartData.map((m, idx) => {
                const deep = m.sleep_deep_min || 0;
                const rem = m.sleep_rem_min || 0;
                const light = m.sleep_light_min || 0;
                const awake = m.sleep_awake_min || 0;
                const sum = deep + rem + light + awake;
                const totalMins = Math.max(sum, m.sleep_minutes || 0);

                const awakePct = (awake / maxMinutesInChart) * 100;
                const lightPct = (light / maxMinutesInChart) * 100;
                const remPct = (rem / maxMinutesInChart) * 100;
                const deepPct = (deep / maxMinutesInChart) * 100;

                const isSelected = activeTooltipData?.date_ref === m.date_ref;

                return (
                  <div
                    key={m.date_ref || idx}
                    tabIndex={0}
                    role="button"
                    aria-label={`Estágios do sono em ${m.date_ref}: Total ${formatMinutesToHHMM(totalMins)}, Profundo ${formatMinutesToHHMM(deep)}, REM ${formatMinutesToHHMM(rem)}, Leve ${formatMinutesToHHMM(light)}, Acordado ${formatMinutesToHHMM(awake)}`}
                    onMouseEnter={() => setHoveredMetric(m)}
                    onFocus={() => setHoveredMetric(m)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setHoveredMetric(m);
                      }
                    }}
                    className="flex-1 flex flex-col justify-end h-full items-center cursor-pointer group relative focus-visible:outline-none"
                  >
                    {/* Stacked Segments */}
                    <div
                      className={`w-full max-w-[28px] rounded-t-radius-sm overflow-hidden flex flex-col justify-end transition-all ${
                        isSelected ? 'ring-2 ring-cyan-400 brightness-110 scale-105 z-10' : 'group-hover:brightness-110'
                      }`}
                      style={{ height: `${(totalMins / maxMinutesInChart) * 100}%` }}
                    >
                      {/* Top: Awake (Orange) */}
                      {awakePct > 0 && (
                        <div
                          style={{ height: `${(awake / totalMins) * 100}%` }}
                          className="bg-amber-500 transition-all"
                          title={`Acordado: ${formatMinutesToHHMM(awake)}`}
                        />
                      )}
                      {/* Mid-High: Light (Slate/Gray) */}
                      {lightPct > 0 && (
                        <div
                          style={{ height: `${(light / totalMins) * 100}%` }}
                          className="bg-slate-500 transition-all"
                          title={`Leve: ${formatMinutesToHHMM(light)}`}
                        />
                      )}
                      {/* Mid-Low: REM (Cyan) */}
                      {remPct > 0 && (
                        <div
                          style={{ height: `${(rem / totalMins) * 100}%` }}
                          className="bg-cyan-500 transition-all"
                          title={`REM: ${formatMinutesToHHMM(rem)}`}
                        />
                      )}
                      {/* Bottom: Deep (Purple/Violet) */}
                      {deepPct > 0 && (
                        <div
                          style={{ height: `${(deep / totalMins) * 100}%` }}
                          className="bg-purple-600 transition-all"
                          title={`Profundo: ${formatMinutesToHHMM(deep)}`}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* X-Axis Date Labels */}
          <div className="pl-12 pr-4 pt-3 flex justify-between gap-1 text-xs text-slate-500 dark:text-slate-400 overflow-x-auto">
            {chartData.map((m, idx) => {
              const step = chartData.length > 30 ? 5 : chartData.length > 15 ? 3 : 1;
              const showLabel = idx === 0 || idx === chartData.length - 1 || idx % step === 0;
              return (
                /* ds-exception: DSX-014 */
                <button
                  type="button"
                  key={m.date_ref || idx}
                  aria-label={`Visualizar sono de ${m.date_ref}`}
                  tabIndex={showLabel ? 0 : -1}
                  className={`flex-1 text-center font-mono transition-colors cursor-pointer rounded-radius-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-500 ${
                    activeTooltipData?.date_ref === m.date_ref ? 'text-cyan-600 dark:text-cyan-400 font-bold' : ''
                  }`}
                  onClick={() => setHoveredMetric(m)}
                >
                  {showLabel ? m.date_ref : ''}
                </button>
              );
            })}
          </div>

          {/* Chart Bottom Legend */}
          <div className="flex items-center justify-center gap-6 mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 text-xs font-semibold">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-radius-sm bg-amber-500 inline-block" />
              <span className="text-amber-600 dark:text-amber-400">Acordado</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-radius-sm bg-slate-500 inline-block" />
              <span className="text-slate-600 dark:text-slate-300">Leve</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-radius-sm bg-purple-600 inline-block" />
              <span className="text-purple-600 dark:text-purple-400">Profundo</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-radius-sm bg-cyan-500 inline-block" />
              <span className="text-cyan-600 dark:text-cyan-400">REM</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
