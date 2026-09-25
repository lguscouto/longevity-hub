import React, { useState, useEffect, useMemo } from 'react';
import { Moon, Calendar, Clock, Activity, Download, Search, RefreshCw, Zap, Shield, ChevronDown, ChevronUp, Sparkles, Filter, Award } from 'lucide-react';
import { requestJson } from '../lib/api';

export interface DailyMetric {
  date_ref: string;
  steps?: number | null;
  sleep_minutes?: number | null;
  sleep_deep_min?: number | null;
  sleep_light_min?: number | null;
  sleep_rem_min?: number | null;
  sleep_awake_min?: number | null;
  rhr_bpm?: number | null;
  avg_hr_bpm?: number | null;
  hrv_ms?: number | null;
  readiness_score?: number | null;
  source?: string | null;
  [key: string]: any;
}

export interface MonthlySleepSummary {
  monthKey: string;           // 'YYYY-MM'
  label: string;              // 'Setembro de 2026'
  shortLabel: string;         // 'Set/26'
  count: number;              // Quantidade de noites no mês
  avgTotal: number;           // Média em minutos
  avgDeep: number;
  avgRem: number;
  avgLight: number;
  avgAwake: number;
  avgHrv: number | null;
  avgRhr: number | null;
  deepPct: number;
  remPct: number;
  lightPct: number;
  awakePct: number;
  efficiencyPct: number;
}

const MONTH_NAMES_PT: Record<string, string> = {
  '01': 'Janeiro',
  '02': 'Fevereiro',
  '03': 'Março',
  '04': 'Abril',
  '05': 'Maio',
  '06': 'Junho',
  '07': 'Julho',
  '08': 'Agosto',
  '09': 'Setembro',
  '10': 'Outubro',
  '11': 'Novembro',
  '12': 'Dezembro',
};

const SHORT_MONTH_NAMES_PT: Record<string, string> = {
  '01': 'Jan',
  '02': 'Fev',
  '03': 'Mar',
  '04': 'Abr',
  '05': 'Mai',
  '06': 'Jun',
  '07': 'Jul',
  '08': 'Ago',
  '09': 'Set',
  '10': 'Out',
  '11': 'Nov',
  '12': 'Dez',
};

function formatMonthLabel(yearMonth: string): string {
  const parts = yearMonth.split('-');
  if (parts.length < 2) return yearMonth;
  const year = parts[0];
  const month = parts[1];
  const monthName = MONTH_NAMES_PT[month] || month;
  return `${monthName} de ${year}`;
}

function formatShortMonthLabel(yearMonth: string): string {
  const parts = yearMonth.split('-');
  if (parts.length < 2) return yearMonth;
  const year = parts[0];
  const month = parts[1];
  const monthName = SHORT_MONTH_NAMES_PT[month] || month;
  return `${monthName}/${year.slice(2)}`;
}

function formatMinutesToHHMM(mins: number | null | undefined): string {
  if (mins == null || isNaN(mins)) return '00:00';
  const total = Math.max(0, Math.round(mins));
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function formatMinutesToText(mins: number | null | undefined): string {
  if (mins == null || isNaN(mins)) return '—';
  const total = Math.max(0, Math.round(mins));
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

function formatDatePtBr(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export const SleepView: React.FC = () => {
  const [metrics, setMetrics] = useState<DailyMetric[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Month filter selector: 'all' | 'YYYY-MM'
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [showMonthlyComparison, setShowMonthlyComparison] = useState<boolean>(true);

  // Chart range selector: 'last20' | '30d' | '60d' | 'all'
  const [chartRange, setChartRange] = useState<'last20' | '30d' | '60d' | 'all'>('last20');

  // Hovered item for interactive chart tooltip
  const [hoveredMetric, setHoveredMetric] = useState<DailyMetric | null>(null);

  // Search & Table State
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

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
    return metrics.filter(m => (m.sleep_minutes && m.sleep_minutes > 0) || (m.sleep_deep_min && m.sleep_deep_min > 0));
  }, [metrics]);

  // Group sleep records by month (YYYY-MM) and calculate consolidated statistics
  const monthlySummaries = useMemo<MonthlySleepSummary[]>(() => {
    if (sleepRecords.length === 0) return [];
    const groups: Record<string, DailyMetric[]> = {};

    sleepRecords.forEach(m => {
      if (!m.date_ref || m.date_ref.length < 7) return;
      const ym = m.date_ref.slice(0, 7);
      if (!groups[ym]) groups[ym] = [];
      groups[ym].push(m);
    });

    const sortedKeys = Object.keys(groups).sort((a, b) => b.localeCompare(a));
    return sortedKeys.map(ym => {
      const records = groups[ym];
      const count = records.length;
      const totalMins = records.reduce((acc, m) => acc + (m.sleep_minutes || 0), 0);
      const deepMins = records.reduce((acc, m) => acc + (m.sleep_deep_min || 0), 0);
      const remMins = records.reduce((acc, m) => acc + (m.sleep_rem_min || 0), 0);
      const lightMins = records.reduce((acc, m) => acc + (m.sleep_light_min || 0), 0);
      const awakeMins = records.reduce((acc, m) => acc + (m.sleep_awake_min || 0), 0);

      const hrvList = records.map(m => m.hrv_ms).filter((v): v is number => v != null && !isNaN(v));
      const rhrList = records.map(m => m.rhr_bpm).filter((v): v is number => v != null && !isNaN(v));

      const avgTotal = Math.round(totalMins / count);
      const avgDeep = Math.round(deepMins / count);
      const avgRem = Math.round(remMins / count);
      const avgLight = Math.round(lightMins / count);
      const avgAwake = Math.round(awakeMins / count);

      const avgHrv = hrvList.length > 0 ? Number((hrvList.reduce((a, b) => a + b, 0) / hrvList.length).toFixed(1)) : null;
      const avgRhr = rhrList.length > 0 ? Number((rhrList.reduce((a, b) => a + b, 0) / rhrList.length).toFixed(1)) : null;

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
        deepPct: avgTotal > 0 ? Math.round((avgDeep / avgTotal) * 100) : 0,
        remPct: avgTotal > 0 ? Math.round((avgRem / avgTotal) * 100) : 0,
        lightPct: avgTotal > 0 ? Math.round((avgLight / avgTotal) * 100) : 0,
        awakePct: avgTotal > 0 ? Math.round((avgAwake / avgTotal) * 100) : 0,
        efficiencyPct,
      };
    });
  }, [sleepRecords]);

  // Active records based on selected month filter
  const activeRecords = useMemo(() => {
    if (selectedMonth === 'all') return sleepRecords;
    return sleepRecords.filter(m => m.date_ref.startsWith(selectedMonth));
  }, [sleepRecords, selectedMonth]);

  // Subset for Chart based on range or selected month
  const chartData = useMemo(() => {
    if (activeRecords.length === 0) return [];
    if (selectedMonth !== 'all') {
      // For a specific month, display all days chronologically (left to right: day 1 to day 31)
      return [...activeRecords].reverse();
    }
    let subset: DailyMetric[] = [];
    if (chartRange === 'last20') {
      subset = activeRecords.slice(0, 20);
    } else if (chartRange === '30d') {
      subset = activeRecords.slice(0, 30);
    } else if (chartRange === '60d') {
      subset = activeRecords.slice(0, 60);
    } else {
      subset = [...activeRecords];
    }
    // Reverse chronologically for chart display (oldest to newest, left to right)
    return [...subset].reverse();
  }, [activeRecords, chartRange, selectedMonth]);

  // Selected or active hovered metric defaults to latest record if available
  const activeTooltipData = hoveredMetric || (chartData.length > 0 ? chartData[chartData.length - 1] : null);

  // Averages for KPI summary cards (computed over active filtered records)
  const stats = useMemo(() => {
    if (activeRecords.length === 0) {
      return {
        avgTotal: 0,
        avgDeep: 0,
        avgRem: 0,
        avgLight: 0,
        avgAwake: 0,
        avgHrv: null as number | null,
        avgRhr: null as number | null,
        count: 0,
        efficiencyPct: 0,
      };
    }
    const count = activeRecords.length;
    const totalMins = activeRecords.reduce((acc, m) => acc + (m.sleep_minutes || 0), 0);
    const deepMins = activeRecords.reduce((acc, m) => acc + (m.sleep_deep_min || 0), 0);
    const remMins = activeRecords.reduce((acc, m) => acc + (m.sleep_rem_min || 0), 0);
    const lightMins = activeRecords.reduce((acc, m) => acc + (m.sleep_light_min || 0), 0);
    const awakeMins = activeRecords.reduce((acc, m) => acc + (m.sleep_awake_min || 0), 0);

    const hrvList = activeRecords.map(m => m.hrv_ms).filter((v): v is number => v != null && !isNaN(v));
    const rhrList = activeRecords.map(m => m.rhr_bpm).filter((v): v is number => v != null && !isNaN(v));

    const avgTotal = Math.round(totalMins / count);
    const avgDeep = Math.round(deepMins / count);
    const avgRem = Math.round(remMins / count);
    const avgLight = Math.round(lightMins / count);
    const avgAwake = Math.round(awakeMins / count);

    const avgHrv = hrvList.length > 0 ? Number((hrvList.reduce((a, b) => a + b, 0) / hrvList.length).toFixed(1)) : null;
    const avgRhr = rhrList.length > 0 ? Number((rhrList.reduce((a, b) => a + b, 0) / rhrList.length).toFixed(1)) : null;

    const timeInBed = avgTotal + avgAwake;
    const efficiencyPct = timeInBed > 0 ? Math.round((avgTotal / timeInBed) * 100) : 0;

    return {
      avgTotal,
      avgDeep,
      avgRem,
      avgLight,
      avgAwake,
      avgHrv,
      avgRhr,
      count,
      efficiencyPct,
    };
  }, [activeRecords]);

  // Filtered & Sorted Table Data
  const tableData = useMemo(() => {
    let list = [...activeRecords];
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(m => m.date_ref.includes(q) || formatDatePtBr(m.date_ref).includes(q));
    }
    list.sort((a, b) => {
      if (sortAsc) return a.date_ref.localeCompare(b.date_ref);
      return b.date_ref.localeCompare(a.date_ref);
    });
    return list;
  }, [activeRecords, searchTerm, sortAsc]);

  // Export CSV Handler
  const handleExportCSV = () => {
    if (activeRecords.length === 0) return;
    const headers = ['Data', 'Tempo Total (min)', 'Sono Profundo (min)', 'Sono REM (min)', 'Sono Leve (min)', 'Tempo Acordado (min)', 'VFC Noturna (ms)', 'RHR (bpm)', 'Fonte'];
    const rows = activeRecords.map(m => [
      m.date_ref,
      m.sleep_minutes || 0,
      m.sleep_deep_min || 0,
      m.sleep_rem_min || 0,
      m.sleep_light_min || 0,
      m.sleep_awake_min || 0,
      m.hrv_ms || '',
      m.rhr_bpm || '',
      m.source || 'Zepp',
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const filenameSuffix = selectedMonth !== 'all' ? selectedMonth : new Date().toISOString().split('T')[0];
    link.setAttribute('download', `historico_sono_${filenameSuffix}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Stacked chart max minutes (default 10h = 600m)
  const maxMinutesInChart = useMemo(() => {
    if (chartData.length === 0) return 600;
    let maxFound = 0;
    chartData.forEach(m => {
      const sum = (m.sleep_deep_min || 0) + (m.sleep_rem_min || 0) + (m.sleep_light_min || 0) + (m.sleep_awake_min || 0);
      const total = m.sleep_minutes && m.sleep_minutes > sum ? m.sleep_minutes : sum;
      if (total > maxFound) maxFound = total;
    });
    return Math.max(600, Math.ceil((maxFound + 30) / 150) * 150); // ceil to multiples of 2.5h (150m)
  }, [chartData]);

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-cyan-500 text-white shadow-lg">
              <Moon className="h-6 w-6" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Monitoramento & Fases do Sono</h2>
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
          {/* Month Filter Bar */}
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
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors shadow-2xs"
              >
                <option value="all">Todos os Meses ({sleepRecords.length} noites consolidadas)</option>
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
                  onClick={() => setSelectedMonth('all')}
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
                      onClick={() => setSelectedMonth(m.monthKey)}
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
                  onClick={() => setSelectedMonth('all')}
                  className="text-xs text-cyan-600 dark:text-cyan-400 hover:underline font-semibold flex items-center gap-1 mr-2"
                >
                  Limpar filtro
                </button>
              )}
              {monthlySummaries.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowMonthlyComparison((prev) => !prev)}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs font-semibold transition-all inline-flex items-center gap-1.5"
                >
                  <Calendar className="h-3.5 w-3.5 text-cyan-500" />
                  <span>{showMonthlyComparison ? 'Ocultar Quadro Mensal' : 'Ver Quadro Mensal'}</span>
                  {showMonthlyComparison ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </button>
              )}
            </div>
          </div>

          {/* Active Context Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1 text-xs text-slate-500 dark:text-slate-400 font-medium">
            <div className="flex items-center gap-2">
              <span>
                {selectedMonth !== 'all' ? (
                  <>
                    Médias do mês:{' '}
                    <strong className="text-slate-900 dark:text-white font-bold">
                      {monthlySummaries.find((m) => m.monthKey === selectedMonth)?.label || selectedMonth}
                    </strong>
                  </>
                ) : (
                  <>
                    Médias gerais:{' '}
                    <strong className="text-slate-900 dark:text-white font-bold">Histórico Completo Consolidado</strong>
                  </>
                )}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-semibold border border-cyan-500/20 text-[11px]">
                {stats.count} {stats.count === 1 ? 'noite' : 'noites'}
              </span>
            </div>
            {stats.count > 0 && (
              <div className="flex items-center gap-3 sm:gap-4 text-[11px]">
                {stats.avgHrv != null && (
                  <span>
                    VFC Média: <strong className="text-slate-800 dark:text-slate-200">{stats.avgHrv} ms</strong>
                  </span>
                )}
                {stats.avgRhr != null && (
                  <span>
                    FC Repouso: <strong className="text-slate-800 dark:text-slate-200">{stats.avgRhr} bpm</strong>
                  </span>
                )}
                <span>
                  Eficiência: <strong className="text-slate-800 dark:text-slate-200">{stats.efficiencyPct}%</strong>
                </span>
              </div>
            )}
          </div>

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {/* Total Sleep */}
            <div className="glass-panel p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
                <span>Tempo Total Médio</span>
                <Clock className="h-4 w-4 text-cyan-400" />
              </div>
              <div className="mt-2">
                <span className="text-2xl font-extrabold text-slate-900 dark:text-white">
                  {formatMinutesToText(stats.avgTotal)}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 block mt-0.5">
                  Meta recomendada: 7h-9h
                </span>
              </div>
            </div>

            {/* Deep Sleep */}
            <div className="glass-panel p-4 rounded-2xl border border-purple-500/20 bg-purple-500/5 flex flex-col justify-between">
              <div className="flex items-center justify-between text-purple-600 dark:text-purple-400 text-xs font-semibold">
                <span>Sono Profundo</span>
                <div className="w-2.5 h-2.5 rounded-full bg-purple-500" />
              </div>
              <div className="mt-2">
                <span className="text-2xl font-extrabold text-purple-600 dark:text-purple-300">
                  {formatMinutesToText(stats.avgDeep)}
                </span>
                <span className="text-xs text-purple-500/80 dark:text-purple-400/80 block mt-0.5 font-medium">
                  {stats.avgTotal > 0 ? `${Math.round((stats.avgDeep / stats.avgTotal) * 100)}% do total` : '—'}
                </span>
              </div>
            </div>

            {/* REM Sleep */}
            <div className="glass-panel p-4 rounded-2xl border border-cyan-500/20 bg-cyan-500/5 flex flex-col justify-between">
              <div className="flex items-center justify-between text-cyan-600 dark:text-cyan-400 text-xs font-semibold">
                <span>Sono REM</span>
                <div className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
              </div>
              <div className="mt-2">
                <span className="text-2xl font-extrabold text-cyan-600 dark:text-cyan-300">
                  {formatMinutesToText(stats.avgRem)}
                </span>
                <span className="text-xs text-cyan-500/80 dark:text-cyan-400/80 block mt-0.5 font-medium">
                  {stats.avgTotal > 0 ? `${Math.round((stats.avgRem / stats.avgTotal) * 100)}% do total` : '—'}
                </span>
              </div>
            </div>

            {/* Light Sleep */}
            <div className="glass-panel p-4 rounded-2xl border border-slate-500/20 bg-slate-500/5 flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 text-xs font-semibold">
                <span>Sono Leve</span>
                <div className="w-2.5 h-2.5 rounded-full bg-slate-400" />
              </div>
              <div className="mt-2">
                <span className="text-2xl font-extrabold text-slate-700 dark:text-slate-300">
                  {formatMinutesToText(stats.avgLight)}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 block mt-0.5 font-medium">
                  {stats.avgTotal > 0 ? `${Math.round((stats.avgLight / stats.avgTotal) * 100)}% do total` : '—'}
                </span>
              </div>
            </div>

            {/* Awake Time */}
            <div className="glass-panel p-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 flex flex-col justify-between">
              <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 text-xs font-semibold">
                <span>Tempo Acordado</span>
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              </div>
              <div className="mt-2">
                <span className="text-2xl font-extrabold text-amber-600 dark:text-amber-300">
                  {formatMinutesToText(stats.avgAwake)}
                </span>
                <span className="text-xs text-amber-500/80 dark:text-amber-400/80 block mt-0.5 font-medium">
                  Despertamentos Noturnos
                </span>
              </div>
            </div>
          </div>

          {/* MONTHLY AVERAGES COMPARISON TABLE (Quadro Comparativo de Médias Mensais) */}
          {showMonthlyComparison && monthlySummaries.length > 0 && (
            <div className="glass-panel p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-cyan-500" />
                    Médias de Sono de Cada Mês
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Comparativo consolidado da arquitetura do sono e métricas autonômicas mês a mês.
                  </p>
                </div>
                <span className="text-xs text-slate-400">
                  Clique na linha para filtrar o painel
                </span>
              </div>

              <div className="overflow-x-auto max-w-full">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase font-semibold tracking-wider">
                      <th className="py-2.5 px-3">Mês</th>
                      <th className="py-2.5 px-3">Noites</th>
                      <th className="py-2.5 px-3">Tempo Total Médio</th>
                      <th className="py-2.5 px-3 text-purple-600 dark:text-purple-400">Sono Profundo</th>
                      <th className="py-2.5 px-3 text-cyan-600 dark:text-cyan-400">Sono REM</th>
                      <th className="py-2.5 px-3 text-slate-600 dark:text-slate-400">Sono Leve</th>
                      <th className="py-2.5 px-3 text-amber-600 dark:text-amber-400">Acordado</th>
                      <th className="py-2.5 px-3">VFC Média</th>
                      <th className="py-2.5 px-3">FC Repouso</th>
                      <th className="py-2.5 px-3 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 font-medium">
                    {monthlySummaries.map((m) => {
                      const isSelected = selectedMonth === m.monthKey;
                      return (
                        <tr
                          key={m.monthKey}
                          onClick={() => setSelectedMonth(isSelected ? 'all' : m.monthKey)}
                          className={`cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-cyan-500/10 dark:bg-cyan-500/15 font-semibold'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-900/50'
                          }`}
                        >
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 dark:text-white">{m.label}</span>
                              {isSelected && (
                                <span className="text-[10px] px-2 py-0.5 rounded-md bg-cyan-500 text-white font-bold">
                                  Filtrado
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-slate-600 dark:text-slate-300">
                            {m.count} {m.count === 1 ? 'noite' : 'noites'}
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-bold text-slate-900 dark:text-white">
                              {formatMinutesToText(m.avgTotal)}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-purple-600 dark:text-purple-300 font-semibold">
                            {formatMinutesToText(m.avgDeep)}{' '}
                            <span className="text-[10px] text-purple-400/80">({m.deepPct}%)</span>
                          </td>
                          <td className="py-3 px-3 text-cyan-600 dark:text-cyan-300 font-semibold">
                            {formatMinutesToText(m.avgRem)}{' '}
                            <span className="text-[10px] text-cyan-400/80">({m.remPct}%)</span>
                          </td>
                          <td className="py-3 px-3 text-slate-600 dark:text-slate-300">
                            {formatMinutesToText(m.avgLight)}{' '}
                            <span className="text-[10px] text-slate-400">({m.lightPct}%)</span>
                          </td>
                          <td className="py-3 px-3 text-amber-600 dark:text-amber-400 font-semibold">
                            {formatMinutesToText(m.avgAwake)}
                          </td>
                          <td className="py-3 px-3 text-slate-700 dark:text-slate-300">
                            {m.avgHrv != null ? `${m.avgHrv} ms` : '—'}
                          </td>
                          <td className="py-3 px-3 text-slate-700 dark:text-slate-300">
                            {m.avgRhr != null ? `${m.avgRhr} bpm` : '—'}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedMonth(isSelected ? 'all' : m.monthKey);
                              }}
                              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                                isSelected
                                  ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300'
                                  : 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/20'
                              }`}
                            >
                              {isSelected ? 'Ver Todos' : 'Filtrar Mês'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* STACKED BAR CHART CONTAINER (Matching Screenshot) */}
          <div className="glass-panel p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-lg relative bg-slate-900/90 text-white">
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
                <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-semibold overflow-x-auto no-scrollbar max-w-full">
                  <button
                    onClick={() => setChartRange('last20')}
                    className={`px-3 py-1.5 rounded-lg transition-all shrink-0 whitespace-nowrap ${
                      chartRange === 'last20' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    20 Registros
                  </button>
                  <button
                    onClick={() => setChartRange('30d')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      chartRange === '30d' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    30d
                  </button>
                  <button
                    onClick={() => setChartRange('60d')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      chartRange === '60d' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    60d
                  </button>
                  <button
                    onClick={() => setChartRange('all')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      chartRange === 'all' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Tudo ({sleepRecords.length})
                  </button>
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
                    onClick={() => setSelectedMonth('all')}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
                  >
                    Ver todo período
                  </button>
                </div>
              )}
            </div>

            {/* Interactive Stacked Chart Component */}
            {chartData.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-slate-500 text-sm">
                <Moon className="h-10 w-10 mb-2 opacity-40" />
                Nenhum registro de sono disponível para o período selecionado.
              </div>
            ) : (
              <div className="relative pt-4 pb-2">
                {/* FLOATING HOVER TOOLTIP (Fiel ao Anexo) */}
                {activeTooltipData && (
                  <div className="hidden sm:block absolute top-4 right-8 z-20 bg-slate-950/95 backdrop-blur-md border border-slate-700/80 rounded-2xl p-4 shadow-2xl min-w-[200px] transition-all">
                    <div className="text-sm font-bold text-white mb-2 border-b border-slate-800 pb-1.5 flex items-center justify-between">
                      <span>{activeTooltipData.date_ref}</span>
                      <span className="text-xs text-slate-400 font-normal">
                        Total: {formatMinutesToHHMM(activeTooltipData.sleep_minutes)}
                      </span>
                    </div>
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

                      const deepPct = (deep / maxMinutesInChart) * 100;
                      const remPct = (rem / maxMinutesInChart) * 100;
                      const lightPct = (light / maxMinutesInChart) * 100;
                      const awakePct = (awake / maxMinutesInChart) * 100;

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

                {/* Chart Bottom Legend (Fiel ao Anexo) */}
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

          {/* HISTORICAL RECORDS TABLE (All Records in Database) */}
          <div className="glass-panel p-4 sm:p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-cyan-500" />
                  {selectedMonth !== 'all'
                    ? `Histórico de Registros do Sono - ${monthlySummaries.find((m) => m.monthKey === selectedMonth)?.label} (${tableData.length})`
                    : `Histórico Completo de Registros do Sono (${tableData.length})`}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {selectedMonth !== 'all'
                    ? `Exibindo apenas os registros de sono de ${monthlySummaries.find((m) => m.monthKey === selectedMonth)?.label}.`
                    : 'Todos os registros consolidados no banco de dados SQLite sem limitação.'}
                </p>
              </div>

              {/* Search & Export Controls */}
              <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
                <div className="relative flex-1 sm:flex-initial">
                  <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Filtrar por data (AAAA-MM-DD)..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="pl-9 pr-4 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-cyan-500 w-full sm:w-60"
                  />
                </div>

                <button
                  onClick={() => setSortAsc(!sortAsc)}
                  className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 transition-all shrink-0"
                  title="Inverter Ordem de Data"
                >
                  {sortAsc ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  {sortAsc ? 'Mais Antigos' : 'Mais Recentes'}
                </button>

                <button
                  onClick={handleExportCSV}
                  disabled={tableData.length === 0}
                  className="px-3.5 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl text-xs font-semibold shadow-sm hover:shadow transition-all flex items-center gap-1.5 disabled:opacity-50 shrink-0"
                  title="Exportar registros como arquivo CSV"
                >
                  <Download className="h-4 w-4" /> Exportar CSV
                </button>
              </div>
            </div>

            {/* Table */}
            {tableData.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">
                Nenhum registro de sono encontrado para os filtros aplicados.
              </div>
            ) : (
              <div className="overflow-x-auto max-w-full min-w-0">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase font-semibold tracking-wider">
                      <th className="py-3 px-4">Data</th>
                      <th className="py-3 px-4">Tempo Total</th>
                      <th className="py-3 px-4 text-purple-600 dark:text-purple-400">Sono Profundo</th>
                      <th className="py-3 px-4 text-cyan-600 dark:text-cyan-400">Sono REM</th>
                      <th className="py-3 px-4 text-slate-600 dark:text-slate-400">Sono Leve</th>
                      <th className="py-3 px-4 text-amber-600 dark:text-amber-400">Acordado</th>
                      <th className="py-3 px-4">VFC Noturna</th>
                      <th className="py-3 px-4">FC Repouso</th>
                      <th className="py-3 px-4 text-right">Fonte</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 font-medium">
                    {tableData.map(m => {
                      const total = m.sleep_minutes || 0;
                      const deep = m.sleep_deep_min || 0;
                      const rem = m.sleep_rem_min || 0;
                      const light = m.sleep_light_min || 0;
                      const awake = m.sleep_awake_min || 0;

                      const deepPct = total > 0 ? Math.round((deep / total) * 100) : 0;
                      const remPct = total > 0 ? Math.round((rem / total) * 100) : 0;
                      const lightPct = total > 0 ? Math.round((light / total) * 100) : 0;

                      return (
                        <tr key={m.date_ref} className="hover:bg-slate-50/80 dark:hover:bg-slate-900/60 transition-colors">
                          <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white font-mono">
                            {formatDatePtBr(m.date_ref)}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-slate-800 dark:text-slate-200">
                            {formatMinutesToText(total)}
                          </td>
                          <td className="py-3.5 px-4 text-purple-600 dark:text-purple-300 font-semibold">
                            {formatMinutesToText(deep)}{' '}
                            <span className="text-[10px] text-purple-400/80">({deepPct}%)</span>
                          </td>
                          <td className="py-3.5 px-4 text-cyan-600 dark:text-cyan-300 font-semibold">
                            {formatMinutesToText(rem)}{' '}
                            <span className="text-[10px] text-cyan-400/80">({remPct}%)</span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                            {formatMinutesToText(light)}{' '}
                            <span className="text-[10px] text-slate-400">({lightPct}%)</span>
                          </td>
                          <td className="py-3.5 px-4 text-amber-600 dark:text-amber-400 font-semibold">
                            {formatMinutesToText(awake)}
                          </td>
                          <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">
                            {m.hrv_ms != null ? `${m.hrv_ms} ms` : '—'}
                          </td>
                          <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">
                            {m.rhr_bpm != null ? `${m.rhr_bpm} bpm` : '—'}
                          </td>
                          <td className="py-3.5 px-4 text-right text-slate-400 text-[11px]">
                            {m.source || 'Zepp'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
