import React, { useState, useMemo } from 'react';
import { Calendar, Search, ChevronUp, ChevronDown, Download, Moon } from 'lucide-react';
import { EmptyState, Input, Button, ResponsiveDataTable, DataColumn } from '../ui';
import {
  DailyMetric,
  MonthlySleepSummary,
  formatMinutesToText,
  formatDatePtBr,
  formatDateTimeDetails,
  calculateNightEfficiency,
  getEfficiencyBadge,
} from './types';

export interface SleepMonthlyTableProps {
  monthlySummaries: MonthlySleepSummary[];
  selectedMonth: string;
  onSelectMonth: (monthKey: string) => void;
  showMonthlyComparison: boolean;
  activeRecords: DailyMetric[];
}

const NoValue = () => <span className="text-slate-400 font-mono">—</span>;

const EfficiencyBadge: React.FC<{ pct: number | null | undefined; total: number }> = ({ pct, total }) => {
  const badge = getEfficiencyBadge(pct ?? null, total);
  if (!badge) return <span className="text-slate-400">—</span>;
  return (
    <span
      title={badge.tooltip}
      className={`px-2 py-0.5 rounded-full font-bold text-xs whitespace-nowrap inline-flex items-center gap-1.5 ${badge.badgeClass}`}
    >
      <span>{badge.pct}%</span>
      {badge.tag && (
        <span className={`text-xs px-1.5 py-0.5 rounded font-extrabold ${badge.tagClass || ''}`}>{badge.tag}</span>
      )}
    </span>
  );
};

const ClockCell: React.FC<{ details: { time: string; date: string }; tone: 'indigo' | 'amber' }> = ({ details, tone }) => {
  if (details.time === '—') return <NoValue />;
  const toneClass = tone === 'indigo' ? 'text-indigo-600 dark:text-indigo-400' : 'text-amber-600 dark:text-amber-400';
  return (
    <div className="inline-flex flex-col">
      <span className={`font-bold font-mono text-xs ${toneClass}`}>{details.time}</span>
      <span className="text-xs font-normal text-slate-500 dark:text-slate-400 font-mono">{details.date}</span>
    </div>
  );
};

const StageCell: React.FC<{ minutes: number; pct: number; tone: string; pctTone: string }> = ({ minutes, pct, tone, pctTone }) => (
  <span className={`font-semibold font-mono ${tone}`}>
    {formatMinutesToText(minutes)} <span className={`text-xs ${pctTone}`}>({pct}%)</span>
  </span>
);

interface NightRow {
  record: DailyMetric;
  total: number;
  deep: number;
  rem: number;
  light: number;
  awake: number;
  deepPct: number;
  remPct: number;
  lightPct: number;
  eff: number | null;
  start: { time: string; date: string };
  end: { time: string; date: string };
}

const toNightRow = (m: DailyMetric): NightRow => {
  const total = m.sleep_minutes || 0;
  const deep = m.sleep_deep_min || 0;
  const rem = m.sleep_rem_min || 0;
  const light = m.sleep_light_min || 0;
  const awake = m.sleep_awake_min || 0;
  return {
    record: m,
    total,
    deep,
    rem,
    light,
    awake,
    deepPct: total > 0 ? Math.round((deep / total) * 100) : 0,
    remPct: total > 0 ? Math.round((rem / total) * 100) : 0,
    lightPct: total > 0 ? Math.round((light / total) * 100) : 0,
    eff: calculateNightEfficiency(total, awake),
    start: formatDateTimeDetails(m.sleep_start),
    end: formatDateTimeDetails(m.sleep_end),
  };
};

/** Registros noturnos — mobile prioriza data, duração, eficiência, profundo, REM (UX_UI_41 §2). */
const NIGHT_COLUMNS: DataColumn<NightRow>[] = [
  {
    key: 'date',
    header: 'Data',
    priority: 'primary',
    cellClassName: 'font-bold text-slate-900 dark:text-white font-mono',
    render: (n) => formatDatePtBr(n.record.date_ref),
  },
  {
    key: 'total',
    header: 'Tempo Total',
    cellClassName: 'font-bold text-slate-800 dark:text-slate-200 font-mono',
    render: (n) => formatMinutesToText(n.total),
  },
  {
    key: 'eff',
    header: 'Eficiência',
    headerClassName: 'text-emerald-600 dark:text-emerald-400',
    render: (n) => <EfficiencyBadge pct={n.eff} total={n.total} />,
  },
  {
    key: 'deep',
    header: 'Sono Profundo',
    headerClassName: 'text-purple-600 dark:text-purple-400',
    render: (n) => (
      <StageCell minutes={n.deep} pct={n.deepPct} tone="text-purple-600 dark:text-purple-300" pctTone="text-purple-400/80" />
    ),
  },
  {
    key: 'rem',
    header: 'Sono REM',
    headerClassName: 'text-cyan-600 dark:text-cyan-400',
    render: (n) => (
      <StageCell minutes={n.rem} pct={n.remPct} tone="text-cyan-600 dark:text-cyan-300" pctTone="text-cyan-400/80" />
    ),
  },
  {
    key: 'start',
    header: 'Dormiu',
    priority: 'detail',
    headerClassName: 'text-indigo-600 dark:text-indigo-400',
    render: (n) => <ClockCell details={n.start} tone="indigo" />,
  },
  {
    key: 'end',
    header: 'Acordou',
    priority: 'detail',
    headerClassName: 'text-amber-600 dark:text-amber-400',
    render: (n) => <ClockCell details={n.end} tone="amber" />,
  },
  {
    key: 'light',
    header: 'Sono Leve',
    priority: 'detail',
    headerClassName: 'text-slate-600 dark:text-slate-400',
    render: (n) => (
      <StageCell minutes={n.light} pct={n.lightPct} tone="text-slate-600 dark:text-slate-300" pctTone="text-slate-500 dark:text-slate-400" />
    ),
  },
  {
    key: 'awake',
    header: 'Acordado',
    priority: 'detail',
    headerClassName: 'text-amber-600 dark:text-amber-400',
    cellClassName: 'text-amber-600 dark:text-amber-400 font-semibold font-mono',
    render: (n) => formatMinutesToText(n.awake),
  },
  {
    key: 'resp',
    header: 'Taxa Resp.',
    priority: 'detail',
    headerClassName: 'text-cyan-600 dark:text-cyan-400',
    cellClassName: 'text-cyan-600 dark:text-cyan-300 font-mono',
    render: (n) => (n.record.respiratory_rate_rpm != null ? `${n.record.respiratory_rate_rpm.toFixed(1)} rpm` : '—'),
  },
  {
    key: 'hrv',
    header: 'VFC Noturna',
    priority: 'detail',
    cellClassName: 'text-slate-700 dark:text-slate-300 font-mono',
    render: (n) => (n.record.hrv_ms != null ? `${n.record.hrv_ms} ms` : '—'),
  },
  {
    key: 'rhr',
    header: 'FC Repouso',
    priority: 'detail',
    cellClassName: 'text-slate-700 dark:text-slate-300 font-mono',
    render: (n) => (n.record.rhr_bpm != null ? `${n.record.rhr_bpm} bpm` : '—'),
  },
  {
    key: 'source',
    header: 'Fonte',
    priority: 'detail',
    align: 'right',
    cellClassName: 'text-slate-500 dark:text-slate-400 text-xs',
    render: (n) => n.record.source || 'Zepp',
  },
];

const buildMonthColumns = (
  selectedMonth: string,
  onSelectMonth: (monthKey: string) => void,
): DataColumn<MonthlySleepSummary>[] => [
  {
    key: 'month',
    header: 'Mês',
    priority: 'primary',
    cellClassName: 'font-bold text-slate-900 dark:text-white',
    render: (m) => m.label,
  },
  {
    key: 'count',
    header: 'Noites',
    cellClassName: 'text-slate-600 dark:text-slate-400 font-mono',
    render: (m) => m.count,
  },
  {
    key: 'total',
    header: 'Tempo Total',
    cellClassName: 'font-bold text-slate-800 dark:text-slate-200 font-mono',
    render: (m) => formatMinutesToText(m.avgTotal),
  },
  {
    key: 'eff',
    header: 'Eficiência',
    headerClassName: 'text-emerald-600 dark:text-emerald-400',
    render: (m) => <EfficiencyBadge pct={m.efficiencyPct} total={m.avgTotal} />,
  },
  {
    key: 'deep',
    header: 'Sono Profundo',
    headerClassName: 'text-purple-600 dark:text-purple-400',
    render: (m) => (
      <StageCell minutes={m.avgDeep} pct={m.deepPct} tone="text-purple-600 dark:text-purple-300" pctTone="text-purple-400/80" />
    ),
  },
  {
    key: 'rem',
    header: 'Sono REM',
    headerClassName: 'text-cyan-600 dark:text-cyan-400',
    render: (m) => (
      <StageCell minutes={m.avgRem} pct={m.remPct} tone="text-cyan-600 dark:text-cyan-300" pctTone="text-cyan-400/80" />
    ),
  },
  {
    key: 'bedtime',
    header: 'Dormir Médio',
    priority: 'detail',
    headerClassName: 'text-indigo-600 dark:text-indigo-400',
    cellClassName: 'text-indigo-600 dark:text-indigo-400 font-semibold font-mono',
    render: (m) => m.avgBedtime || '—',
  },
  {
    key: 'wake',
    header: 'Acordar Médio',
    priority: 'detail',
    headerClassName: 'text-amber-600 dark:text-amber-400',
    cellClassName: 'text-amber-600 dark:text-amber-400 font-semibold font-mono',
    render: (m) => m.avgWakeTime || '—',
  },
  {
    key: 'light',
    header: 'Sono Leve',
    priority: 'detail',
    headerClassName: 'text-slate-600 dark:text-slate-400',
    render: (m) => (
      <StageCell minutes={m.avgLight} pct={m.lightPct} tone="text-slate-600 dark:text-slate-300" pctTone="text-slate-500 dark:text-slate-400" />
    ),
  },
  {
    key: 'awake',
    header: 'Acordado',
    priority: 'detail',
    headerClassName: 'text-amber-600 dark:text-amber-400',
    cellClassName: 'text-amber-600 dark:text-amber-400 font-semibold font-mono',
    render: (m) => formatMinutesToText(m.avgAwake),
  },
  {
    key: 'resp',
    header: 'Taxa Resp.',
    priority: 'detail',
    headerClassName: 'text-cyan-600 dark:text-cyan-400',
    cellClassName: 'text-cyan-600 dark:text-cyan-300 font-mono',
    render: (m) => (m.avgRespRate != null ? `${m.avgRespRate} rpm` : '—'),
  },
  {
    key: 'hrv',
    header: 'VFC Média',
    priority: 'detail',
    cellClassName: 'text-slate-700 dark:text-slate-300 font-mono',
    render: (m) => (m.avgHrv != null ? `${m.avgHrv} ms` : '—'),
  },
  {
    key: 'rhr',
    header: 'FC Repouso',
    priority: 'detail',
    cellClassName: 'text-slate-700 dark:text-slate-300 font-mono',
    render: (m) => (m.avgRhr != null ? `${m.avgRhr} bpm` : '—'),
  },
  {
    key: 'action',
    header: 'Ação',
    priority: 'action',
    align: 'right',
    render: (m) => {
      const isSelected = selectedMonth === m.monthKey;
      return (
        <Button
          type="button"
          size="sm"
          variant={isSelected ? 'secondary' : 'outline'}
          onClick={(e) => {
            e.stopPropagation();
            onSelectMonth(isSelected ? 'all' : m.monthKey);
          }}
          aria-pressed={isSelected}
          className="w-full md:w-auto"
        >
          {isSelected ? 'Ver Todos' : 'Filtrar Mês'}
        </Button>
      );
    },
  },
];

export const SleepMonthlyTable: React.FC<SleepMonthlyTableProps> = ({
  monthlySummaries,
  selectedMonth,
  onSelectMonth,
  showMonthlyComparison,
  activeRecords,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  // Filter & sort records for table
  const tableData = useMemo(() => {
    let result = [...activeRecords];
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(
        (m) =>
          m.date_ref.includes(q) ||
          formatDatePtBr(m.date_ref).includes(q) ||
          (m.source && m.source.toLowerCase().includes(q))
      );
    }
    result.sort((a, b) => {
      const cmp = a.date_ref.localeCompare(b.date_ref);
      return sortAsc ? cmp : -cmp;
    });
    return result;
  }, [activeRecords, searchTerm, sortAsc]);

  const nightRows = useMemo(() => tableData.map(toNightRow), [tableData]);
  const monthColumns = useMemo(() => buildMonthColumns(selectedMonth, onSelectMonth), [selectedMonth, onSelectMonth]);
  const selectedLabel = monthlySummaries.find((m) => m.monthKey === selectedMonth)?.label;

  const handleExportCSV = () => {
    if (activeRecords.length === 0) return;
    const headers = [
      'Data',
      'Dormiu (Horario)',
      'Dormiu (Data)',
      'Acordou (Horario)',
      'Acordou (Data)',
      'Tempo Total (min)',
      'Eficiência (%)',
      'Sono Profundo (min)',
      'Sono REM (min)',
      'Sono Leve (min)',
      'Tempo Acordado (min)',
      'Freq Respiratoria (rpm)',
      'VFC Noturna (ms)',
      'RHR (bpm)',
      'Fonte',
    ];
    const rows = activeRecords.map((m) => {
      const stDetails = formatDateTimeDetails(m.sleep_start);
      const edDetails = formatDateTimeDetails(m.sleep_end);
      const eff = calculateNightEfficiency(m.sleep_minutes, m.sleep_awake_min);
      return [
        m.date_ref,
        stDetails.time,
        stDetails.date,
        edDetails.time,
        edDetails.date,
        m.sleep_minutes || 0,
        eff != null ? eff : '',
        m.sleep_deep_min || 0,
        m.sleep_rem_min || 0,
        m.sleep_light_min || 0,
        m.sleep_awake_min || 0,
        m.respiratory_rate_rpm != null ? m.respiratory_rate_rpm.toFixed(1) : '',
        m.hrv_ms || '',
        m.rhr_bpm || '',
        m.source || 'Zepp',
      ];
    });
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const filenameSuffix =
      selectedMonth !== 'all' ? selectedMonth : new Date().toISOString().split('T')[0];
    link.setAttribute('download', `historico_sono_${filenameSuffix}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* MONTHLY AVERAGES COMPARISON TABLE */}
      {showMonthlyComparison && monthlySummaries.length > 0 && (
        <div className="glass-panel p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
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
            <span className="text-xs text-slate-500 dark:text-slate-400">Clique em uma linha para filtrar os dados</span>
          </div>

          <ResponsiveDataTable
            caption="Médias mensais de sono"
            columns={monthColumns}
            rows={monthlySummaries}
            getRowKey={(m) => m.monthKey}
            getRowLabel={(m) => `${m.label}: ${m.count} noites`}
            onRowClick={(m) => onSelectMonth(selectedMonth === m.monthKey ? 'all' : m.monthKey)}
            isRowSelected={(m) => selectedMonth === m.monthKey}
            stickyFirstColumn
            detailsLabel="Mais métricas do mês"
          />
        </div>
      )}

      {/* HISTORICAL RECORDS TABLE */}
      <div className="glass-panel p-4 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Calendar className="h-5 w-5 text-cyan-500" />
              {selectedMonth !== 'all'
                ? `Histórico de sono — ${selectedLabel} (${tableData.length})`
                : `Histórico de sono (${tableData.length})`}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {selectedMonth !== 'all'
                ? `Exibindo apenas os registros de sono de ${selectedLabel}.`
                : 'Todos os registros de sono salvos localmente.'}
            </p>
          </div>

          {/* Search & Export Controls */}
          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            <div className="flex-1 sm:flex-initial w-full sm:w-60">
              <Input
                type="text"
                placeholder="Filtrar por data..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                leftIcon={<Search className="h-4 w-4 text-slate-400" />}
              />
            </div>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setSortAsc(!sortAsc)}
              leftIcon={sortAsc ? ChevronUp : ChevronDown}
              title="Inverter ordem das datas"
              className="shrink-0"
            >
              {sortAsc ? 'Mais Antigos' : 'Mais Recentes'}
            </Button>

            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleExportCSV}
              disabled={tableData.length === 0}
              leftIcon={Download}
              title="Exportar registros como arquivo CSV"
              className="shrink-0"
            >
              Exportar CSV
            </Button>
          </div>
        </div>

        {/* Table */}
        {tableData.length === 0 ? (
          <div className="py-8">
            <EmptyState
              title="Nenhum registro encontrado"
              description="Nenhum registro de sono encontrado para os filtros aplicados."
              icon={Moon}
            />
          </div>
        ) : (
          <ResponsiveDataTable
            caption={`Registros noturnos de sono (${tableData.length})`}
            columns={NIGHT_COLUMNS}
            rows={nightRows}
            getRowKey={(n) => n.record.date_ref}
            getRowLabel={(n) => `Noite de ${formatDatePtBr(n.record.date_ref)}`}
            stickyFirstColumn
            detailsLabel="Horários, fases e sinais autonômicos"
          />
        )}
      </div>
    </div>
  );
};
