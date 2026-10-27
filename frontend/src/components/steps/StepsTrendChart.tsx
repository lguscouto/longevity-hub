import React, { useState, useEffect, useMemo } from 'react';
import {
  Footprints,
  TrendingUp,
  Table,
  BarChart2,
  CheckCircle2,
  AlertCircle,
  Clock,
} from 'lucide-react';
import {
  StepDayRecord,
  StepsChartRange,
  STEPS_CHART_RANGE_OPTIONS,
  formatStepNumber,
  formatDateBR,
} from './types';
import { Button, IconButton, TimeRangeControl, EmptyState } from '../ui';

export interface StepsTrendChartProps {
  dailyRecords: StepDayRecord[];
  range: StepsChartRange;
  onRangeChange: (range: StepsChartRange) => void;
  defaultGoal?: number;
}

export const StepsTrendChart: React.FC<StepsTrendChartProps> = ({
  dailyRecords,
  range,
  onRangeChange,
  defaultGoal = 8000,
}) => {
  const [selectedGoal, setSelectedGoal] = useState<number>(defaultGoal);
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');
  const [hoveredRecord, setHoveredRecord] = useState<StepDayRecord | null>(null);

  useEffect(() => {
    setSelectedGoal(defaultGoal);
  }, [defaultGoal]);

  // Filtra dados com base no período selecionado
  const filteredData = useMemo(() => {
    let sliceCount = dailyRecords.length;
    if (range === '7d') sliceCount = 7;
    else if (range === '14d') sliceCount = 14;
    else if (range === '30d') sliceCount = 30;
    else if (range === '90d') sliceCount = 90;
    else if (range === '6m') sliceCount = 180;
    else if (range === '1y') sliceCount = 365;

    const subset = dailyRecords.slice(0, sliceCount);
    // Para plotar o gráfico da esquerda (passado) para a direita (presente), invertemos
    return [...subset].reverse();
  }, [dailyRecords, range]);

  // Estatísticas do período selecionado (usando dias completos na média se houver mais de 1 dia)
  const periodStats = useMemo(() => {
    if (filteredData.length === 0) return { avg: 0, total: 0, goalMetDays: 0, goalPct: 0, max: 0 };
    const total = filteredData.reduce((acc, r) => acc + r.steps, 0);
    const evalDays =
      filteredData.length > 1
        ? filteredData.filter((r) => !r.is_today_in_progress)
        : filteredData;
    const avg =
      evalDays.length > 0
        ? Math.round(evalDays.reduce((acc, r) => acc + r.steps, 0) / evalDays.length)
        : 0;
    const goalMetDays = filteredData.filter((r) => r.steps >= selectedGoal).length;
    const goalPct = evalDays.length > 0 ? Math.round((goalMetDays / evalDays.length) * 100) : 0;
    const max = Math.max(...filteredData.map((r) => r.steps), 0);
    return { avg, total, goalMetDays, goalPct, max };
  }, [filteredData, selectedGoal]);

  const maxChartVal = useMemo(() => {
    const rawMax = Math.max(periodStats.max, selectedGoal, 10000);
    return Math.ceil(rawMax / 2000) * 2000;
  }, [periodStats.max, selectedGoal]);

  // Pontos da curva SVG para a Média Móvel de 7 dias (MA7)
  const ma7PolylinePoints = useMemo(() => {
    if (filteredData.length < 2) return '';
    const n = filteredData.length;
    return filteredData
      .map((item, idx) => {
        const x = ((idx + 0.5) / n) * 1000;
        const y = 100 - Math.min(98, Math.max(2, (item.ma7_steps / maxChartVal) * 100));
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  }, [filteredData, maxChartVal]);

  // Espaçamento adaptativo para evitar colapso de largura em 90D, 6M, 1A e Tudo
  const barGapClass = useMemo(() => {
    if (filteredData.length <= 35) return 'gap-1 sm:gap-1.5';
    if (filteredData.length <= 95) return 'gap-0.5';
    return 'gap-px';
  }, [filteredData.length]);

  const activeTooltip =
    hoveredRecord || (filteredData.length > 0 ? filteredData[filteredData.length - 1] : null);

  return (
    <div className="rounded-radius-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-2xs space-y-4">
      {/* Top Header & Controles */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            Evolução e Tendência de Passos
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Acompanhe o volume diário com linha de meta Zepp e curva da média móvel de 7 dias (MA7)
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          {/* Seletor de Meta */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-radius-lg border border-slate-200 dark:border-slate-700">
            <Button
              variant={selectedGoal === defaultGoal ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setSelectedGoal(defaultGoal)}
              className="text-2xs py-1 px-2.5 h-auto min-h-0"
            >
              Meta Zepp ({formatStepNumber(defaultGoal)})
            </Button>
            <Button
              variant={selectedGoal === 10000 ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setSelectedGoal(10000)}
              className="text-2xs py-1 px-2.5 h-auto min-h-0"
            >
              10.000 (Ouro)
            </Button>
          </div>

          {/* Seletor de Horizonte de Tempo */}
          <TimeRangeControl<StepsChartRange>
            value={range}
            onChange={onRangeChange}
            options={STEPS_CHART_RANGE_OPTIONS}
            activeColor="emerald"
            size="sm"
          />

          {/* Alternar Gráfico / Tabela */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-radius-lg border border-slate-200 dark:border-slate-700">
            <IconButton
              variant={viewMode === 'chart' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('chart')}
              icon={BarChart2}
              title="Visualização em gráfico"
              aria-label="Visualização em gráfico"
            />
            <IconButton
              variant={viewMode === 'table' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('table')}
              icon={Table}
              title="Visualização em tabela"
              aria-label="Visualização em tabela"
            />
          </div>
        </div>
      </div>

      {/* Mini KPIs do Período */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-950/50 p-3 rounded-radius-lg border border-slate-100 dark:border-slate-800/80 text-xs">
        <div>
          <span className="text-slate-500 dark:text-slate-400 block font-medium">Média do Período</span>
          <span className="text-sm font-bold text-slate-900 dark:text-white font-mono">
            {formatStepNumber(periodStats.avg)} passos/dia
          </span>
        </div>
        <div>
          <span className="text-slate-500 dark:text-slate-400 block font-medium">Total de Passos</span>
          <span className="text-sm font-bold text-slate-900 dark:text-white font-mono">
            {formatStepNumber(periodStats.total)}
          </span>
        </div>
        <div>
          <span className="text-slate-500 dark:text-slate-400 block font-medium">Dias na Meta ({selectedGoal})</span>
          <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono">
            {periodStats.goalMetDays} de {filteredData.length} ({periodStats.goalPct}%)
          </span>
        </div>
        <div>
          <span className="text-slate-500 dark:text-slate-400 block font-medium">Pico no Período</span>
          <span className="text-sm font-bold text-purple-600 dark:text-purple-400 font-mono">
            {formatStepNumber(periodStats.max)} passos
          </span>
        </div>
      </div>

      {filteredData.length === 0 ? (
        <div className="py-12">
          <EmptyState
            title="Nenhum dado no período selecionado"
            description="Não encontramos registros de passos para o filtro escolhido."
            icon={Footprints}
          />
        </div>
      ) : viewMode === 'table' ? (
        /* Tabela Acessível */
        <div className="overflow-x-auto max-h-80 border border-slate-200 dark:border-slate-800 rounded-radius-lg shadow-2xs">
          <table className="w-full text-xs text-left" aria-label="Histórico de passos do período">
            <caption className="sr-only">Passos diários e atingimento de metas</caption>
            <thead className="bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-bold sticky top-0 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th scope="col" className="p-2.5">Data</th>
                <th scope="col" className="p-2.5">Passos</th>
                <th scope="col" className="p-2.5">Meta</th>
                <th scope="col" className="p-2.5">Status</th>
                <th scope="col" className="p-2.5">Distância</th>
                <th scope="col" className="p-2.5">Calorias</th>
                <th scope="col" className="p-2.5">Média Móvel (7d)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredData.map((r) => {
                const met = r.steps >= selectedGoal;
                return (
                  <tr key={r.date_ref} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                    <td className="p-2.5 font-mono font-medium">{formatDateBR(r.date_ref)}</td>
                    <td className="p-2.5 font-bold font-mono text-slate-900 dark:text-white">
                      {formatStepNumber(r.steps)}
                    </td>
                    <td className="p-2.5 font-mono text-slate-500">{formatStepNumber(selectedGoal)}</td>
                    <td className="p-2.5">
                      {r.is_today_in_progress ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-radius-sm font-semibold text-2xs bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border border-cyan-500/20">
                          <Clock className="h-3 w-3" /> Em andamento
                        </span>
                      ) : (
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-radius-sm font-semibold text-2xs ${
                            met
                              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                              : r.steps >= selectedGoal * 0.7
                              ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20'
                              : 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20'
                          }`}
                        >
                          {met ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                          {met ? 'Meta atingida' : r.steps >= selectedGoal * 0.7 ? 'Próximo da meta' : 'Abaixo da meta'}
                        </span>
                      )}
                    </td>
                    <td className="p-2.5 font-mono text-slate-600 dark:text-slate-400">{r.distance_km} km</td>
                    <td className="p-2.5 font-mono text-slate-600 dark:text-slate-400">{r.calories} kcal</td>
                    <td className="p-2.5 font-mono text-cyan-600 dark:text-cyan-400">
                      {formatStepNumber(r.ma7_steps)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* Gráfico Visual Interativo */
        <div className="space-y-3">
          {/* Tooltip Dinâmico Fixado no Topo do Gráfico */}
          {activeTooltip && (
            <div className="bg-slate-900 text-white p-3 rounded-radius-lg border border-slate-800 shadow-md flex items-center justify-between flex-wrap gap-3 text-xs">
              <div className="flex items-center gap-3">
                <div>
                  <span className="text-slate-400 text-2xs block">Data</span>
                  <span className="font-mono font-bold text-sm text-white">
                    {formatDateBR(activeTooltip.date_ref)}
                  </span>
                </div>
                <div className="border-l border-slate-700 pl-3">
                  <span className="text-slate-400 text-2xs block">Passos</span>
                  <span className="font-mono font-bold text-base text-emerald-400">
                    {formatStepNumber(activeTooltip.steps)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs font-semibold flex-wrap">
                <div>
                  <span className="text-slate-400 text-2xs block">Distância</span>
                  <span className="text-slate-200 font-mono">{activeTooltip.distance_km} km</span>
                </div>
                <div>
                  <span className="text-slate-400 text-2xs block">Calorias</span>
                  <span className="text-amber-400 font-mono">{activeTooltip.calories} kcal</span>
                </div>
                <div>
                  <span className="text-slate-400 text-2xs block">Média Móvel (7d)</span>
                  <span className="text-cyan-400 font-mono">{formatStepNumber(activeTooltip.ma7_steps)}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-2xs block">Meta ({selectedGoal})</span>
                  <span
                    className={`font-semibold ${
                      activeTooltip.steps >= selectedGoal
                        ? 'text-emerald-400'
                        : activeTooltip.is_today_in_progress
                        ? 'text-cyan-400'
                        : 'text-rose-400'
                    }`}
                  >
                    {activeTooltip.steps >= selectedGoal
                      ? '✓ Atingida'
                      : activeTooltip.is_today_in_progress
                      ? `Dia em andamento (faltam ${formatStepNumber(selectedGoal - activeTooltip.steps)})`
                      : `${formatStepNumber(selectedGoal - activeTooltip.steps)} passos restantes`}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Gráfico de Barras com Linha de Meta e Overlay SVG para Curva MA7 */}
          <div className="relative h-64 w-full border border-slate-200 dark:border-slate-800 rounded-radius-lg bg-slate-50/50 dark:bg-slate-950/30 p-2 sm:p-4 overflow-hidden">
            {/* Linha de Meta Horizontal */}
            {(() => {
              const goalYPct = 100 - (selectedGoal / maxChartVal) * 100;
              return (
                <div
                  className="absolute left-0 right-0 border-t-2 border-dashed border-emerald-500/60 z-10 pointer-events-none flex items-center justify-end pr-2"
                  style={{ top: `${Math.max(5, Math.min(95, goalYPct))}%` }}
                >
                  <span className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-mono text-2xs font-bold px-1.5 py-0.5 rounded-radius-sm">
                    Meta: {formatStepNumber(selectedGoal)}
                  </span>
                </div>
              );
            })()}

            {/* Área Interna de Plotagem */}
            <div className="relative h-full w-full">
              {/* Overlay SVG da Média Móvel de 7 dias (MA7) */}
              {ma7PolylinePoints && (
                <svg
                  viewBox="0 0 1000 100"
                  preserveAspectRatio="none"
                  className="absolute inset-0 w-full h-full pointer-events-none z-10 overflow-visible"
                  aria-hidden="true"
                >
                  <polyline
                    fill="none"
                    stroke="#06b6d4"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={ma7PolylinePoints}
                    vectorEffect="non-scaling-stroke"
                  />
                </svg>
              )}

              {/* Barras Diárias */}
              <div className={`h-full flex items-end ${barGapClass} w-full relative z-0`}>
                {filteredData.map((item) => {
                  const heightPct = Math.min(100, Math.max(3, (item.steps / maxChartVal) * 100));
                  const isMet = item.steps >= selectedGoal;
                  const isNear = !isMet && item.steps >= selectedGoal * 0.7;
                  const barColor = item.is_today_in_progress
                    ? 'bg-cyan-500 hover:bg-cyan-400'
                    : isMet
                    ? 'bg-emerald-500 hover:bg-emerald-400'
                    : isNear
                    ? 'bg-amber-500 hover:bg-amber-400'
                    : 'bg-rose-500/80 hover:bg-rose-400';

                  const isHovered = hoveredRecord?.date_ref === item.date_ref;

                  return (
                    <div
                      key={item.date_ref}
                      tabIndex={0}
                      role="button"
                      aria-label={`${formatDateBR(item.date_ref)}: ${formatStepNumber(item.steps)} passos`}
                      className="flex-1 min-w-[1px] h-full flex flex-col justify-end items-center group relative cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500"
                      onMouseEnter={() => setHoveredRecord(item)}
                      onMouseLeave={() => setHoveredRecord(null)}
                      onFocus={() => setHoveredRecord(item)}
                      onBlur={() => setHoveredRecord(null)}
                    >
                      <div
                        className={`w-full rounded-t-xs transition-all duration-150 ${barColor} ${
                          isHovered ? 'ring-2 ring-slate-900 dark:ring-white scale-y-105' : 'opacity-90'
                        }`}
                        style={{ height: `${heightPct}%` }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Legenda */}
          <div className="flex items-center justify-between flex-wrap gap-2 text-2xs text-slate-500 dark:text-slate-400 pt-1">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-xs bg-emerald-500 inline-block" /> Meta batida (≥ {formatStepNumber(selectedGoal)})
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-xs bg-amber-500 inline-block" /> Próximo (70–99%)
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-xs bg-rose-500 inline-block" /> Abaixo de 70%
              </span>
              <span className="flex items-center gap-1">
                <span className="h-0.5 w-4 bg-cyan-500 inline-block rounded-full" /> Média Móvel 7d (MA7)
              </span>
            </div>
            <span>Passe o cursor ou navegue via Tab para ver detalhes</span>
          </div>
        </div>
      )}
    </div>
  );
};
