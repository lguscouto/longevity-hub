import React, { useState, useMemo } from 'react';
import { Moon, Sun, Wind } from 'lucide-react';
import { TimeRangeControl, EmptyState } from '../ui';
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

  // Active tooltip data: hovered item, or fallback to latest record
  const activeTooltipData = useMemo<DailyMetric | null>(() => {
    if (hoveredMetric) return hoveredMetric;
    if (chartData.length > 0) return chartData[chartData.length - 1];
    return null;
  }, [hoveredMetric, chartData]);

  // Dynamic max value in minutes for Y-axis scaling (default max 10h = 600m, auto-expands if longer)
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
    <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-lg relative bg-slate-900/90 text-white">
      {/* Chart Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Moon className="h-5 w-5 text-indigo-400" />
            <h3 className="text-lg font-bold text-white tracking-tight">Distribuição de Fases do Sono</h3>
          </div>
          <p className="text-xs text-slate-400 font-medium">
            Horas e minutos em Sono Profundo, REM, Leve e Acordado ({
              selectedMonth !== 'all'
                ? `${monthlySummaries.find((m) => m.monthKey === selectedMonth)?.label || selectedMonth} (${chartData.length} noites)`
                : chartRange === 'last20' ? 'Últimos 20 Registros' : chartRange === '30d' ? '30d' : chartRange === '60d' ? '60d' : 'Todo o Período'
            })
          </p>
        </div>

        {/* Range Selector Controls */}
        {selectedMonth === 'all' ? (
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar max-w-full">
            <TimeRangeControl<SleepChartRange>
              value={chartRange}
              onChange={onChartRangeChange}
              options={SLEEP_CHART_RANGE_OPTIONS}
              activeColor="indigo"
              size="sm"
            />
            <div className="ml-2 pl-2 border-l border-slate-800 hidden lg:block">
              <span className="px-2.5 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs">
                Monitoramento
              </span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-semibold">
              Mês: {monthlySummaries.find((m) => m.monthKey === selectedMonth)?.shortLabel || selectedMonth}
            </span>
            <button
              type="button"
              onClick={onClearMonthFilter}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
            >
              Ver todo período
            </button>
          </div>
        )}
      </div>

      {/* Interactive Stacked Chart Component */}
      {chartData.length === 0 ? (
        <div className="py-12">
          <EmptyState
            title="Sem registros de sono no período"
            description="Nenhum registro de sono disponível para o período selecionado."
            icon={Moon}
          />
        </div>
      ) : (
        <div className="relative pt-4 pb-2">
          {/* FLOATING HOVER TOOLTIP */}
          {activeTooltipData && (
            <div className="hidden sm:block absolute top-4 right-8 z-20 bg-slate-950/95 backdrop-blur-md border border-slate-700/80 rounded-2xl p-4 shadow-dialog min-w-[220px] transition-all">
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
                      <span className="flex items-center gap-1"><Moon className="h-3 w-3" /> Dormiu:</span>
                      <span className="font-mono font-semibold">
                        {formatDateTimeDetails(activeTooltipData.sleep_start).time} ({formatDateTimeDetails(activeTooltipData.sleep_start).date})
                      </span>
                    </div>
                  )}
                  {activeTooltipData.sleep_end && (
                    <div className="flex items-center justify-between text-amber-300">
                      <span className="flex items-center gap-1"><Sun className="h-3 w-3" /> Acordou:</span>
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
                  <span className="flex items-center gap-1"><Wind className="h-3 w-3" /> Freq. Resp.:</span>
                  <span className="font-mono">{activeTooltipData.respiratory_rate_rpm.toFixed(1)} rpm</span>
                </div>
              )}
            </div>
          )}

          {/* Y-Axis Grid Lines & Chart Area */}
          <div className="relative h-64 flex flex-col justify-between pl-12 pr-4 border-b border-slate-800">
            {/* Grid Lines */}
            {[1, 0.75, 0.5, 0.25, 0].map(ratio => {
              const totalMins = maxMinutesInChart * ratio;
              const hhmm = formatMinutesToHHMM(totalMins);
              return (
                <div key={ratio} className="relative w-full border-b border-slate-800/60 flex items-center">
                  <span className="absolute -left-12 text-[10px] text-slate-500 font-mono">
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
                    onMouseEnter={() => setHoveredMetric(m)}
                    className="flex-1 flex flex-col justify-end h-full items-center cursor-pointer group relative"
                  >
                    {/* Stacked Segments */}
                    <div
                      className={`w-full max-w-[28px] rounded-t-sm overflow-hidden flex flex-col justify-end transition-all ${
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
          <div className="pl-12 pr-4 pt-3 flex justify-between gap-1 text-[10px] text-slate-400 overflow-x-auto">
            {chartData.map((m, idx) => {
              // Show date label every N items depending on subset size
              const step = chartData.length > 30 ? 5 : chartData.length > 15 ? 3 : 1;
              const showLabel = idx === 0 || idx === chartData.length - 1 || idx % step === 0;
              return (
                <div
                  key={m.date_ref || idx}
                  className={`flex-1 text-center font-mono transition-colors cursor-pointer ${
                    activeTooltipData?.date_ref === m.date_ref ? 'text-cyan-400 font-bold' : ''
                  }`}
                  onClick={() => setHoveredMetric(m)}
                >
                  {showLabel ? m.date_ref : ''}
                </div>
              );
            })}
          </div>

          {/* Chart Bottom Legend */}
          <div className="flex items-center justify-center gap-6 mt-6 pt-4 border-t border-slate-800 text-xs font-semibold">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-amber-500 inline-block" />
              <span className="text-amber-400">Acordado</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-slate-500 inline-block" />
              <span className="text-slate-300">Leve</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-purple-600 inline-block" />
              <span className="text-purple-400">Profundo</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-cyan-500 inline-block" />
              <span className="text-cyan-400">REM</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
