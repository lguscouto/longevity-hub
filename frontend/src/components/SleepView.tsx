import React, { useState, useEffect, useMemo } from 'react';
import { Moon, RefreshCw } from 'lucide-react';
import { requestJson } from '../lib/api';
import {
  DailyMetric,
  MonthlySleepSummary,
  SleepChartRange,
  formatMonthLabel,
  formatShortMonthLabel,
  calculateCircularAverageTime,
  calculateSleepRegularity,
  SleepFilters,
  SleepSummaryCards,
  SleepStagesChart,
  SleepMonthlyTable,
} from './sleep';

// Re-export types and helpers for external consumer and test compatibility
export * from './sleep';

export const SleepView: React.FC = () => {
  const [metrics, setMetrics] = useState<DailyMetric[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Month filter selector: 'all' | 'YYYY-MM'
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [showMonthlyComparison, setShowMonthlyComparison] = useState<boolean>(true);

  // Chart range selector: 'last20' | '30d' | '60d' | 'all'
  const [chartRange, setChartRange] = useState<SleepChartRange>('last20');

  const fetchSleepData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await requestJson<DailyMetric[]>('/api/metrics?days=3650').catch(() =>
        requestJson<DailyMetric[]>('/api/metrics')
      );
      setMetrics(data || []);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar registros de sono');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSleepData();
  }, []);

  // Filter metrics that have any sleep duration
  const sleepRecords = useMemo(() => {
    return metrics.filter(
      (m) => (m.sleep_minutes && m.sleep_minutes > 0) || (m.sleep_deep_min && m.sleep_deep_min > 0)
    );
  }, [metrics]);

  // Group sleep records by month (YYYY-MM) and calculate consolidated statistics
  const monthlySummaries = useMemo<MonthlySleepSummary[]>(() => {
    if (sleepRecords.length === 0) return [];
    const groups: Record<string, DailyMetric[]> = {};

    sleepRecords.forEach((m) => {
      if (!m.date_ref || m.date_ref.length < 7) return;
      const ym = m.date_ref.slice(0, 7);
      if (!groups[ym]) groups[ym] = [];
      groups[ym].push(m);
    });

    const sortedKeys = Object.keys(groups).sort((a, b) => b.localeCompare(a));
    return sortedKeys.map((ym) => {
      const records = groups[ym];
      const count = records.length;
      const totalMins = records.reduce((acc, m) => acc + (m.sleep_minutes || 0), 0);
      const deepMins = records.reduce((acc, m) => acc + (m.sleep_deep_min || 0), 0);
      const remMins = records.reduce((acc, m) => acc + (m.sleep_rem_min || 0), 0);
      const lightMins = records.reduce((acc, m) => acc + (m.sleep_light_min || 0), 0);
      const awakeMins = records.reduce((acc, m) => acc + (m.sleep_awake_min || 0), 0);

      const hrvList = records.map((m) => m.hrv_ms).filter((v): v is number => v != null && !isNaN(v));
      const rhrList = records.map((m) => m.rhr_bpm).filter((v): v is number => v != null && !isNaN(v));

      const avgTotal = Math.round(totalMins / count);
      const avgDeep = Math.round(deepMins / count);
      const avgRem = Math.round(remMins / count);
      const avgLight = Math.round(lightMins / count);
      const avgAwake = Math.round(awakeMins / count);

      const avgHrv =
        hrvList.length > 0 ? Number((hrvList.reduce((a, b) => a + b, 0) / hrvList.length).toFixed(1)) : null;
      const avgRhr =
        rhrList.length > 0 ? Number((rhrList.reduce((a, b) => a + b, 0) / rhrList.length).toFixed(1)) : null;

      const respList = records
        .map((m) => m.respiratory_rate_rpm)
        .filter((v): v is number => v != null && !isNaN(v));
      const avgRespRate =
        respList.length > 0
          ? Number((respList.reduce((a, b) => a + b, 0) / respList.length).toFixed(1))
          : null;

      const avgBedtime = calculateCircularAverageTime(records.map((m) => m.sleep_start));
      const avgWakeTime = calculateCircularAverageTime(records.map((m) => m.sleep_end));

      const timeInBed = avgTotal + avgAwake;
      const efficiencyPct = timeInBed > 0 ? Math.round((avgTotal / timeInBed) * 100) : 0;

      return {
        monthKey: ym,
        label: formatMonthLabel(ym),
        shortLabel: formatShortMonthLabel(ym),
        count,
        avgTotal,
        avgDeep,
        avgRem,
        avgLight,
        avgAwake,
        avgHrv,
        avgRhr,
        avgRespRate,
        avgBedtime,
        avgWakeTime,
        deepPct: avgTotal > 0 ? Math.round((avgDeep / avgTotal) * 100) : 0,
        remPct: avgTotal > 0 ? Math.round((avgRem / avgTotal) * 100) : 0,
        lightPct: avgTotal > 0 ? Math.round((avgLight / avgTotal) * 100) : 0,
        awakePct: avgTotal > 0 ? Math.round((avgAwake / avgTotal) * 100) : 0,
        efficiencyPct,
      };
    });
  }, [sleepRecords]);

  // Active records based on selectedMonth filter
  const activeRecords = useMemo(() => {
    if (selectedMonth === 'all') return sleepRecords;
    return sleepRecords.filter((m) => m.date_ref && m.date_ref.startsWith(selectedMonth));
  }, [sleepRecords, selectedMonth]);

  // Consolidated statistics for the active scope (selected month or all)
  const stats = useMemo(() => {
    if (activeRecords.length === 0) {
      return {
        count: 0,
        avgTotal: 0,
        avgDeep: 0,
        avgRem: 0,
        avgLight: 0,
        avgAwake: 0,
        avgHrv: null,
        avgRhr: null,
        avgRespRate: null,
        avgBedtime: null,
        avgWakeTime: null,
        efficiencyPct: 0,
        regularity: {
          score: 100,
          label: 'Sem Dados',
          badgeClass: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
          stdBedtimeMin: 0,
        },
      };
    }

    const count = activeRecords.length;
    const totalMins = activeRecords.reduce((acc, m) => acc + (m.sleep_minutes || 0), 0);
    const deepMins = activeRecords.reduce((acc, m) => acc + (m.sleep_deep_min || 0), 0);
    const remMins = activeRecords.reduce((acc, m) => acc + (m.sleep_rem_min || 0), 0);
    const lightMins = activeRecords.reduce((acc, m) => acc + (m.sleep_light_min || 0), 0);
    const awakeMins = activeRecords.reduce((acc, m) => acc + (m.sleep_awake_min || 0), 0);

    const hrvList = activeRecords.map((m) => m.hrv_ms).filter((v): v is number => v != null && !isNaN(v));
    const rhrList = activeRecords.map((m) => m.rhr_bpm).filter((v): v is number => v != null && !isNaN(v));
    const respList = activeRecords
      .map((m) => m.respiratory_rate_rpm)
      .filter((v): v is number => v != null && !isNaN(v));

    const avgTotal = Math.round(totalMins / count);
    const avgAwake = Math.round(awakeMins / count);
    const timeInBed = avgTotal + avgAwake;
    const efficiencyPct = timeInBed > 0 ? Math.round((avgTotal / timeInBed) * 100) : 0;

    return {
      count,
      avgTotal,
      avgDeep: Math.round(deepMins / count),
      avgRem: Math.round(remMins / count),
      avgLight: Math.round(lightMins / count),
      avgAwake,
      avgHrv:
        hrvList.length > 0 ? Number((hrvList.reduce((a, b) => a + b, 0) / hrvList.length).toFixed(1)) : null,
      avgRhr:
        rhrList.length > 0 ? Number((rhrList.reduce((a, b) => a + b, 0) / rhrList.length).toFixed(1)) : null,
      avgRespRate:
        respList.length > 0
          ? Number((respList.reduce((a, b) => a + b, 0) / respList.length).toFixed(1))
          : null,
      avgBedtime: calculateCircularAverageTime(activeRecords.map((m) => m.sleep_start)),
      avgWakeTime: calculateCircularAverageTime(activeRecords.map((m) => m.sleep_end)),
      efficiencyPct,
      regularity: calculateSleepRegularity(activeRecords),
    };
  }, [activeRecords]);

  // Chart data sorted chronologically (oldest to newest)
  const chartData = useMemo(() => {
    let subset = [...activeRecords];
    if (selectedMonth === 'all') {
      if (chartRange === 'last20') {
        const sortedDesc = [...subset].sort((a, b) => b.date_ref.localeCompare(a.date_ref));
        subset = sortedDesc.slice(0, 20);
      } else if (chartRange === '30d') {
        const sortedDesc = [...subset].sort((a, b) => b.date_ref.localeCompare(a.date_ref));
        subset = sortedDesc.slice(0, 30);
      } else if (chartRange === '60d') {
        const sortedDesc = [...subset].sort((a, b) => b.date_ref.localeCompare(a.date_ref));
        subset = sortedDesc.slice(0, 60);
      }
    }
    return subset.sort((a, b) => a.date_ref.localeCompare(b.date_ref));
  }, [activeRecords, selectedMonth, chartRange]);

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-cyan-500 text-white shadow-lg">
              <Moon className="h-6 w-6" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Monitoramento & Fases do Sono
            </h2>
          </div>
          <p className="text-slate-600 dark:text-slate-400 text-sm">
            Análise detalhada de Sono Profundo, REM, Leve e Despertamentos com histórico consolidado do banco de dados.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchSleepData}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs font-semibold transition-all inline-flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Sincronizar Dados
          </button>
        </div>
      </div>

      {/* Loading & Error States */}
      {loading && (
        <div className="glass-panel p-12 text-center text-slate-400 rounded-2xl flex flex-col items-center gap-3">
          <RefreshCw className="h-8 w-8 animate-spin text-cyan-400" />
          <p>Carregando histórico de sono...</p>
        </div>
      )}

      {error && (
        <div className="glass-panel p-6 rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-400 flex items-center gap-3 text-sm">
          <span>{error}</span>
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Subcomponent 1: Month Filter Bar */}
          <SleepFilters
            selectedMonth={selectedMonth}
            onSelectMonth={setSelectedMonth}
            totalRecordsCount={sleepRecords.length}
            monthlySummaries={monthlySummaries}
            showMonthlyComparison={showMonthlyComparison}
            onToggleMonthlyComparison={() => setShowMonthlyComparison((prev) => !prev)}
          />

          {/* Subcomponent 2: KPI Summary Cards */}
          <SleepSummaryCards
            stats={stats}
            selectedMonth={selectedMonth}
            monthlySummaries={monthlySummaries}
          />

          {/* Subcomponent 3: Interactive Stacked Stages Chart */}
          <SleepStagesChart
            chartData={chartData}
            chartRange={chartRange}
            onChartRangeChange={setChartRange}
            selectedMonth={selectedMonth}
            monthlySummaries={monthlySummaries}
            onClearMonthFilter={() => setSelectedMonth('all')}
          />

          {/* Subcomponent 4: Monthly Comparison Table & Historical Nightly Records Table */}
          <SleepMonthlyTable
            monthlySummaries={monthlySummaries}
            selectedMonth={selectedMonth}
            onSelectMonth={setSelectedMonth}
            showMonthlyComparison={showMonthlyComparison}
            activeRecords={activeRecords}
          />
        </>
      )}
    </div>
  );
};
