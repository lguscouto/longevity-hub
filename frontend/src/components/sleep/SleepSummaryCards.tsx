import React from 'react';
import { Clock, Moon, Sun, Award, Sparkles, Wind } from 'lucide-react';
import { MonthlySleepSummary, formatMinutesToText } from './types';

export interface SleepStats {
  count: number;
  avgTotal: number;
  avgDeep: number;
  avgRem: number;
  avgLight: number;
  avgAwake: number;
  avgHrv: number | null;
  avgRhr: number | null;
  avgRespRate: number | null;
  avgBedtime: string | null;
  avgWakeTime: string | null;
  efficiencyPct: number;
  regularity: {
    score: number;
    label: string;
    badgeClass: string;
    stdBedtimeMin: number;
  };
}

export interface SleepSummaryCardsProps {
  stats: SleepStats;
  selectedMonth: string;
  monthlySummaries: MonthlySleepSummary[];
}

export const SleepSummaryCards: React.FC<SleepSummaryCardsProps> = ({
  stats,
  selectedMonth,
  monthlySummaries,
}) => {
  return (
    <div className="space-y-4">
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
          <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-semibold border border-cyan-500/20 text-xs">
            {stats.count} {stats.count === 1 ? 'noite' : 'noites'}
          </span>
        </div>
        {stats.count > 0 && (
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs">
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
            {stats.avgRespRate != null && (
              <span>
                Resp. Média: <strong className="text-slate-800 dark:text-slate-200">{stats.avgRespRate} rpm</strong>
              </span>
            )}
            <span className="flex items-center gap-1.5">
              Regularidade:
              <strong className={`px-1.5 py-0.5 rounded text-xs border font-bold ${stats.regularity.badgeClass}`}>
                {stats.regularity.score}% ({stats.regularity.label})
              </strong>
            </span>
          </div>
        )}
      </div>

      {/* KPI Summary Cards - Linha 1: Arquitetura do Sono */}
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

      {/* KPI Summary Cards - Linha 2: Ritmo Circadiano, Eficiência e Fisiologia */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {/* Horário Médio de Dormir */}
        <div className="glass-panel p-4 rounded-2xl border border-indigo-500/20 bg-indigo-500/5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-indigo-600 dark:text-indigo-400 text-xs font-semibold">
            <span>Horário médio para dormir</span>
            <Moon className="h-4 w-4 text-indigo-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-300 font-mono">
              {stats.avgBedtime || '—'}
            </span>
            <span className="text-xs text-indigo-500/80 dark:text-indigo-400/80 block mt-0.5 font-medium">
              Janela ideal: 22h - 23h30
            </span>
          </div>
        </div>

        {/* Horário Médio de Acordar */}
        <div className="glass-panel p-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 text-xs font-semibold">
            <span>Horário médio para acordar</span>
            <Sun className="h-4 w-4 text-amber-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-extrabold text-amber-600 dark:text-amber-300 font-mono">
              {stats.avgWakeTime || '—'}
            </span>
            <span className="text-xs text-amber-500/80 dark:text-amber-400/80 block mt-0.5 font-medium">
              Despertar habitual
            </span>
          </div>
        </div>

        {/* Eficiência Média */}
        {(() => {
          const isShort = stats.count > 0 && stats.avgTotal > 0 && stats.avgTotal < 360;
          const isAdequate = stats.efficiencyPct >= 85 && stats.avgTotal >= 390;
          const borderClass = isShort
            ? 'border-amber-500/30 bg-amber-500/5'
            : isAdequate
            ? 'border-emerald-500/20 bg-emerald-500/5'
            : stats.efficiencyPct >= 75
            ? 'border-amber-500/20 bg-amber-500/5'
            : 'border-rose-500/20 bg-rose-500/5';
          const textClass = isShort
            ? 'text-amber-600 dark:text-amber-400'
            : isAdequate
            ? 'text-emerald-600 dark:text-emerald-400'
            : stats.efficiencyPct >= 75
            ? 'text-amber-600 dark:text-amber-400'
            : 'text-rose-600 dark:text-rose-400';
          return (
            <div className={`glass-panel p-4 rounded-2xl border flex flex-col justify-between ${borderClass}`}>
              <div className={`flex items-center justify-between text-xs font-semibold ${textClass}`}>
                <span>Eficiência</span>
                <Award className="h-4 w-4" />
              </div>
              <div className="mt-2">
                <div className="flex items-baseline gap-2">
                  <span className={`text-2xl font-extrabold ${textClass}`}>
                    {stats.efficiencyPct}%
                  </span>
                  {isShort && (
                    <span className="text-xs px-1.5 py-0.5 rounded font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                      Sono Curto
                    </span>
                  )}
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400 block mt-0.5 font-medium">
                  Meta: &gt; 85% &amp; &ge; 6h30
                </span>
              </div>
            </div>
          );
        })()}

        {/* Regularidade Circadiana */}
        <div className="glass-panel p-4 rounded-2xl border border-purple-500/20 bg-purple-500/5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-purple-600 dark:text-purple-400 text-xs font-semibold">
            <span>Regularidade</span>
            <Sparkles className="h-4 w-4 text-purple-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-extrabold text-purple-600 dark:text-purple-300">
              {stats.regularity.score}%
            </span>
            <span className="text-xs text-purple-500/80 dark:text-purple-400/80 block mt-0.5 font-medium">
              {stats.regularity.label} (±{stats.regularity.stdBedtimeMin}m)
            </span>
          </div>
        </div>

        {/* Taxa Respiratória Média */}
        <div className="glass-panel p-4 rounded-2xl border border-cyan-500/20 bg-cyan-500/5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-cyan-600 dark:text-cyan-400 text-xs font-semibold">
            <span>Frequência respiratória</span>
            <Wind className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-extrabold text-cyan-600 dark:text-cyan-300 font-mono">
              {stats.avgRespRate != null ? `${stats.avgRespRate} rpm` : '—'}
            </span>
            <span className="text-xs text-cyan-500/80 dark:text-cyan-400/80 block mt-0.5 font-medium">
              Faixa normal noturna: 12-20
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
