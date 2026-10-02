import React, { useState, useMemo } from 'react';
import { Calendar, Search, ChevronUp, ChevronDown, Download, Moon } from 'lucide-react';
import { EmptyState } from '../ui';
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
            <span className="text-xs text-slate-500 dark:text-slate-400">Clique na linha para filtrar o painel</span>
          </div>

          <div className="overflow-x-auto max-w-full">
            <table className="w-full text-left text-xs block md:table">
              <thead className="hidden md:table-header-group">
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase font-semibold tracking-wider text-xs">
                  <th className="py-2.5 px-3">Mês</th>
                  <th className="py-2.5 px-3">Noites</th>
                  <th className="py-2.5 px-3 text-indigo-600 dark:text-indigo-400">Dormir Médio</th>
                  <th className="py-2.5 px-3 text-amber-600 dark:text-amber-400">Acordar Médio</th>
                  <th className="py-2.5 px-3">Tempo Total</th>
                  <th className="py-2.5 px-3 text-emerald-600 dark:text-emerald-400">Eficiência</th>
                  <th className="py-2.5 px-3 text-purple-600 dark:text-purple-400">Sono Profundo</th>
                  <th className="py-2.5 px-3 text-cyan-600 dark:text-cyan-400">Sono REM</th>
                  <th className="py-2.5 px-3 text-slate-600 dark:text-slate-400">Sono Leve</th>
                  <th className="py-2.5 px-3 text-amber-600 dark:text-amber-400">Acordado</th>
                  <th className="py-2.5 px-3 text-cyan-600 dark:text-cyan-400">Taxa Resp.</th>
                  <th className="py-2.5 px-3">VFC Média</th>
                  <th className="py-2.5 px-3">FC Repouso</th>
                  <th className="py-2.5 px-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="block md:table-row-group divide-y divide-slate-200 dark:divide-slate-800/60 font-medium">
                {monthlySummaries.map((m) => {
                  const isSelected = selectedMonth === m.monthKey;
                  return (
                    <tr
                      key={m.monthKey}
                      onClick={() => onSelectMonth(isSelected ? 'all' : m.monthKey)}
                      className={`block md:table-row p-3 md:p-0 space-y-1 md:space-y-0 cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-cyan-500/10 dark:bg-cyan-500/15 border-l-4 md:border-l-0 border-cyan-500'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-900/50'
                      }`}
                    >
                      <td className="block md:table-cell py-1 md:py-3 md:px-3 font-bold text-slate-900 dark:text-white">
                        <div className="flex items-center justify-between md:block">
                          <span>{m.label}</span>
                          <span className="md:hidden text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                            {m.count} noites
                          </span>
                        </div>
                      </td>
                      <td className="hidden md:table-cell py-3 px-3 text-slate-600 dark:text-slate-400 font-mono">
                        {m.count}
                      </td>
                      <td className="inline-block md:table-cell mr-3 md:mr-0 py-0.5 md:py-3 md:px-3 text-indigo-600 dark:text-indigo-400 font-semibold font-mono">
                        <span className="md:hidden text-xs text-slate-500 dark:text-slate-400 font-sans mr-1">Dormir:</span>
                        {m.avgBedtime || '—'}
                      </td>
                      <td className="inline-block md:table-cell mr-3 md:mr-0 py-0.5 md:py-3 md:px-3 text-amber-600 dark:text-amber-400 font-semibold font-mono">
                        <span className="md:hidden text-xs text-slate-500 dark:text-slate-400 font-sans mr-1">Acordar:</span>
                        {m.avgWakeTime || '—'}
                      </td>
                      <td className="inline-block md:table-cell mr-3 md:mr-0 py-0.5 md:py-3 md:px-3 font-bold text-slate-800 dark:text-slate-200 font-mono">
                        <span className="md:hidden text-xs text-slate-500 dark:text-slate-400 font-sans font-normal mr-1">Total:</span>
                        {formatMinutesToText(m.avgTotal)}
                      </td>
                      <td className="inline-block md:table-cell mr-3 md:mr-0 py-0.5 md:py-3 md:px-3">
                        <span className="md:hidden text-xs text-slate-500 dark:text-slate-400 mr-1">Eficiência:</span>
                        {(() => {
                          const badge = getEfficiencyBadge(m.efficiencyPct, m.avgTotal);
                          if (!badge) return <span className="text-slate-400">—</span>;
                          return (
                            <span
                              title={badge.tooltip}
                              className={`px-2 py-0.5 rounded-full font-bold text-xs whitespace-nowrap inline-flex items-center gap-1.5 ${badge.badgeClass}`}
                            >
                              <span>{badge.pct}%</span>
                              {badge.tag && (
                                <span
                                  className={`text-[10px] px-1.5 py-0.5 rounded font-extrabold ${
                                    badge.tagClass || ''
                                  }`}
                                >
                                  {badge.tag}
                                </span>
                              )}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="inline-block md:table-cell mr-3 md:mr-0 py-0.5 md:py-3 md:px-3 text-purple-600 dark:text-purple-300 font-semibold font-mono">
                        <span className="md:hidden text-xs text-slate-500 dark:text-slate-400 font-sans mr-1">Profundo:</span>
                        {formatMinutesToText(m.avgDeep)}{' '}
                        <span className="text-xs text-purple-400/80">({m.deepPct}%)</span>
                      </td>
                      <td className="inline-block md:table-cell mr-3 md:mr-0 py-0.5 md:py-3 md:px-3 text-cyan-600 dark:text-cyan-300 font-semibold font-mono">
                        <span className="md:hidden text-xs text-slate-500 dark:text-slate-400 font-sans mr-1">REM:</span>
                        {formatMinutesToText(m.avgRem)}{' '}
                        <span className="text-xs text-cyan-400/80">({m.remPct}%)</span>
                      </td>
                      <td className="inline-block md:table-cell mr-3 md:mr-0 py-0.5 md:py-3 md:px-3 text-slate-600 dark:text-slate-300 font-mono">
                        <span className="md:hidden text-xs text-slate-500 dark:text-slate-400 font-sans mr-1">Leve:</span>
                        {formatMinutesToText(m.avgLight)}{' '}
                        <span className="text-xs text-slate-500 dark:text-slate-400">({m.lightPct}%)</span>
                      </td>
                      <td className="inline-block md:table-cell mr-3 md:mr-0 py-0.5 md:py-3 md:px-3 text-amber-600 dark:text-amber-400 font-semibold font-mono">
                        <span className="md:hidden text-xs text-slate-500 dark:text-slate-400 font-sans mr-1">Acordado:</span>
                        {formatMinutesToText(m.avgAwake)}
                      </td>
                      <td className="inline-block md:table-cell mr-3 md:mr-0 py-0.5 md:py-3 md:px-3 text-cyan-600 dark:text-cyan-300 font-mono">
                        <span className="md:hidden text-xs text-slate-500 dark:text-slate-400 font-sans mr-1">Resp:</span>
                        {m.avgRespRate != null ? `${m.avgRespRate} rpm` : '—'}
                      </td>
                      <td className="inline-block md:table-cell mr-3 md:mr-0 py-0.5 md:py-3 md:px-3 text-slate-700 dark:text-slate-300 font-mono">
                        <span className="md:hidden text-xs text-slate-500 dark:text-slate-400 font-sans mr-1">VFC:</span>
                        {m.avgHrv != null ? `${m.avgHrv} ms` : '—'}
                      </td>
                      <td className="inline-block md:table-cell mr-3 md:mr-0 py-0.5 md:py-3 md:px-3 text-slate-700 dark:text-slate-300 font-mono">
                        <span className="md:hidden text-xs text-slate-500 dark:text-slate-400 font-sans mr-1">FC Repouso:</span>
                        {m.avgRhr != null ? `${m.avgRhr} bpm` : '—'}
                      </td>
                      <td className="block md:table-cell py-2 md:py-3 md:px-3 text-left md:text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectMonth(isSelected ? 'all' : m.monthKey);
                          }}
                          className={`w-full md:w-auto px-2.5 py-1.5 md:py-1 rounded-lg text-xs font-semibold transition-all ${
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

      {/* HISTORICAL RECORDS TABLE */}
      <div className="glass-panel p-4 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Calendar className="h-5 w-5 text-cyan-500" />
              {selectedMonth !== 'all'
                ? `Histórico de Registros do Sono - ${
                    monthlySummaries.find((m) => m.monthKey === selectedMonth)?.label
                  } (${tableData.length})`
                : `Histórico Completo de Registros do Sono (${tableData.length})`}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {selectedMonth !== 'all'
                ? `Exibindo apenas os registros de sono de ${
                    monthlySummaries.find((m) => m.monthKey === selectedMonth)?.label
                  }.`
                : 'Todos os registros salvos localmente no dispositivo sem limitação.'}
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
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:border-cyan-500 focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:outline-none w-full sm:w-60"
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
          <div className="py-8">
            <EmptyState
              title="Nenhum registro encontrado"
              description="Nenhum registro de sono encontrado para os filtros aplicados."
              icon={Moon}
            />
          </div>
        ) : (
          <div className="overflow-x-auto max-w-full min-w-0">
            <table className="w-full text-left text-xs block md:table">
              <thead className="hidden md:table-header-group">
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase font-semibold tracking-wider text-xs">
                  <th className="py-3 px-4">Data</th>
                  <th className="py-3 px-4 text-indigo-600 dark:text-indigo-400">Dormiu</th>
                  <th className="py-3 px-4 text-amber-600 dark:text-amber-400">Acordou</th>
                  <th className="py-3 px-4">Tempo Total</th>
                  <th className="py-3 px-4 text-emerald-600 dark:text-emerald-400">Eficiência</th>
                  <th className="py-3 px-4 text-purple-600 dark:text-purple-400">Sono Profundo</th>
                  <th className="py-3 px-4 text-cyan-600 dark:text-cyan-400">Sono REM</th>
                  <th className="py-3 px-4 text-slate-600 dark:text-slate-400">Sono Leve</th>
                  <th className="py-3 px-4 text-amber-600 dark:text-amber-400">Acordado</th>
                  <th className="py-3 px-4 text-cyan-600 dark:text-cyan-400">Taxa Resp.</th>
                  <th className="py-3 px-4">VFC Noturna</th>
                  <th className="py-3 px-4">FC Repouso</th>
                  <th className="py-3 px-4 text-right">Fonte</th>
                </tr>
              </thead>
              <tbody className="block md:table-row-group divide-y divide-slate-200 dark:divide-slate-800/60 font-medium">
                {tableData.map((m) => {
                  const total = m.sleep_minutes || 0;
                  const deep = m.sleep_deep_min || 0;
                  const rem = m.sleep_rem_min || 0;
                  const light = m.sleep_light_min || 0;
                  const awake = m.sleep_awake_min || 0;

                  const deepPct = total > 0 ? Math.round((deep / total) * 100) : 0;
                  const remPct = total > 0 ? Math.round((rem / total) * 100) : 0;
                  const lightPct = total > 0 ? Math.round((light / total) * 100) : 0;

                  const stDetails = formatDateTimeDetails(m.sleep_start);
                  const edDetails = formatDateTimeDetails(m.sleep_end);
                  const eff = calculateNightEfficiency(total, awake);

                  return (
                    <tr
                      key={m.date_ref}
                      className="block md:table-row p-3.5 md:p-0 space-y-2 md:space-y-0 hover:bg-slate-50/80 dark:hover:bg-slate-900/60 transition-colors"
                    >
                      <td className="block md:table-cell py-1 md:py-3.5 md:px-4 font-bold text-slate-900 dark:text-white font-mono text-sm md:text-xs">
                        <div className="flex items-center justify-between md:block">
                          <span>{formatDatePtBr(m.date_ref)}</span>
                          <span className="md:hidden text-slate-500 dark:text-slate-400 font-sans text-xs">
                            {m.source || 'Zepp'}
                          </span>
                        </div>
                      </td>
                      <td className="inline-block md:table-cell mr-3 md:mr-0 py-0.5 md:py-3.5 md:px-4">
                        <span className="md:hidden text-xs text-slate-500 dark:text-slate-400 mr-1">Dormiu:</span>
                        {stDetails.time !== '—' ? (
                          <div className="inline-flex flex-col md:flex">
                            <span className="font-bold text-indigo-600 dark:text-indigo-400 font-mono text-xs">
                              {stDetails.time}
                            </span>
                            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                              {stDetails.date}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 font-mono">—</span>
                        )}
                      </td>
                      <td className="inline-block md:table-cell mr-3 md:mr-0 py-0.5 md:py-3.5 md:px-4">
                        <span className="md:hidden text-xs text-slate-500 dark:text-slate-400 mr-1">Acordou:</span>
                        {edDetails.time !== '—' ? (
                          <div className="inline-flex flex-col md:flex">
                            <span className="font-bold text-amber-600 dark:text-amber-400 font-mono text-xs">
                              {edDetails.time}
                            </span>
                            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                              {edDetails.date}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 font-mono">—</span>
                        )}
                      </td>
                      <td className="inline-block md:table-cell mr-3 md:mr-0 py-0.5 md:py-3.5 md:px-4 font-bold text-slate-800 dark:text-slate-200 font-mono">
                        <span className="md:hidden text-xs text-slate-500 dark:text-slate-400 font-sans font-normal mr-1">
                          Total:
                        </span>
                        {formatMinutesToText(total)}
                      </td>
                      <td className="inline-block md:table-cell mr-3 md:mr-0 py-0.5 md:py-3.5 md:px-4">
                        <span className="md:hidden text-xs text-slate-500 dark:text-slate-400 mr-1">Eficiência:</span>
                        {(() => {
                          const effBadge = getEfficiencyBadge(eff, total);
                          if (!effBadge) return <span className="text-slate-400">—</span>;
                          return (
                            <span
                              title={effBadge.tooltip}
                              className={`px-2 py-0.5 rounded-full font-bold text-xs whitespace-nowrap inline-flex items-center gap-1.5 ${effBadge.badgeClass}`}
                            >
                              <span>{effBadge.pct}%</span>
                              {effBadge.tag && (
                                <span
                                  className={`text-[10px] px-1.5 py-0.5 rounded font-extrabold ${
                                    effBadge.tagClass || ''
                                  }`}
                                >
                                  {effBadge.tag}
                                </span>
                              )}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="inline-block md:table-cell mr-3 md:mr-0 py-0.5 md:py-3.5 md:px-4 text-purple-600 dark:text-purple-300 font-semibold font-mono">
                        <span className="md:hidden text-xs text-slate-500 dark:text-slate-400 font-sans font-normal mr-1">
                          Profundo:
                        </span>
                        {formatMinutesToText(deep)}{' '}
                        <span className="text-xs text-purple-400/80">({deepPct}%)</span>
                      </td>
                      <td className="inline-block md:table-cell mr-3 md:mr-0 py-0.5 md:py-3.5 md:px-4 text-cyan-600 dark:text-cyan-300 font-semibold font-mono">
                        <span className="md:hidden text-xs text-slate-500 dark:text-slate-400 font-sans font-normal mr-1">
                          REM:
                        </span>
                        {formatMinutesToText(rem)}{' '}
                        <span className="text-xs text-cyan-400/80">({remPct}%)</span>
                      </td>
                      <td className="inline-block md:table-cell mr-3 md:mr-0 py-0.5 md:py-3.5 md:px-4 text-slate-600 dark:text-slate-300 font-mono">
                        <span className="md:hidden text-xs text-slate-500 dark:text-slate-400 font-sans font-normal mr-1">
                          Leve:
                        </span>
                        {formatMinutesToText(light)}{' '}
                        <span className="text-xs text-slate-500 dark:text-slate-400">({lightPct}%)</span>
                      </td>
                      <td className="inline-block md:table-cell mr-3 md:mr-0 py-0.5 md:py-3.5 md:px-4 text-amber-600 dark:text-amber-400 font-semibold font-mono">
                        <span className="md:hidden text-xs text-slate-500 dark:text-slate-400 font-sans font-normal mr-1">
                          Acordado:
                        </span>
                        {formatMinutesToText(awake)}
                      </td>
                      <td className="inline-block md:table-cell mr-3 md:mr-0 py-0.5 md:py-3.5 md:px-4 text-cyan-600 dark:text-cyan-300 font-mono">
                        <span className="md:hidden text-xs text-slate-500 dark:text-slate-400 font-sans font-normal mr-1">
                          Taxa Resp:
                        </span>
                        {m.respiratory_rate_rpm != null
                          ? `${m.respiratory_rate_rpm.toFixed(1)} rpm`
                          : '—'}
                      </td>
                      <td className="inline-block md:table-cell mr-3 md:mr-0 py-0.5 md:py-3.5 md:px-4 text-slate-700 dark:text-slate-300 font-mono">
                        <span className="md:hidden text-xs text-slate-500 dark:text-slate-400 font-sans font-normal mr-1">
                          VFC:
                        </span>
                        {m.hrv_ms != null ? `${m.hrv_ms} ms` : '—'}
                      </td>
                      <td className="inline-block md:table-cell mr-3 md:mr-0 py-0.5 md:py-3.5 md:px-4 text-slate-700 dark:text-slate-300 font-mono">
                        <span className="md:hidden text-xs text-slate-500 dark:text-slate-400 font-sans font-normal mr-1">
                          FC Repouso:
                        </span>
                        {m.rhr_bpm != null ? `${m.rhr_bpm} bpm` : '—'}
                      </td>
                      <td className="hidden md:table-cell py-3.5 px-4 text-right text-slate-500 dark:text-slate-400 text-xs">
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
    </div>
  );
};
