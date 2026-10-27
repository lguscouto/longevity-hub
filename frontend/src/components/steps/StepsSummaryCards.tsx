import React from 'react';
import {
  Footprints,
  Calendar,
  BarChart2,
  Target,
  Trophy,
  TrendingUp,
  TrendingDown,
  Minus,
  Flame,
  ShieldCheck,
} from 'lucide-react';
import { StepsSummary, StepsTrend, MonthlyStepSummary, formatStepNumber, formatDateBR } from './types';

export interface StepsSummaryCardsProps {
  summary: StepsSummary;
  trend: StepsTrend;
  currentMonth?: MonthlyStepSummary;
}

export const StepsSummaryCards: React.FC<StepsSummaryCardsProps> = ({
  summary,
  trend,
  currentMonth,
}) => {
  const isPositive7d = trend.delta_7d_pct > 0;
  const isNegative7d = trend.delta_7d_pct < 0;

  const getTierColorClass = (color: string) => {
    switch (color) {
      case 'emerald':
        return 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'teal':
        return 'text-teal-600 dark:text-teal-400 bg-teal-500/10 border-teal-500/20';
      case 'amber':
        return 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'rose':
        return 'text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20';
      default:
        return 'text-slate-600 dark:text-slate-400 bg-slate-500/10 border-slate-500/20';
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
      {/* 1. Média Diária & Longevidade */}
      <div className="rounded-radius-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 shadow-2xs flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Footprints className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            Média Diária Geral
          </span>
          <span
            className={`text-2xs font-bold px-2 py-0.5 rounded-radius-full border ${getTierColorClass(
              trend.longevity_tier.color
            )}`}
          >
            {trend.longevity_tier.badge}
          </span>
        </div>
        <div className="my-2">
          <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white font-mono">
            {formatStepNumber(summary.overall_avg_steps)}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate" title={trend.longevity_tier.tier}>
            {trend.longevity_tier.tier}
          </p>
        </div>
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 text-2xs text-slate-400 dark:text-slate-500 flex items-center gap-1">
          <ShieldCheck className="h-3 w-3 text-emerald-500" />
          <span>Faixa de proteção: {trend.longevity_tier.target_range}</span>
        </div>
      </div>

      {/* 2. Média Semanal (Últimos 7 dias) */}
      <div className="rounded-radius-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 shadow-2xs flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Calendar className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
            Média Semanal (7d)
          </span>
          <span
            className={`text-2xs font-bold px-1.5 py-0.5 rounded-radius-full flex items-center gap-0.5 ${
              isPositive7d
                ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
                : isNegative7d
                ? 'text-rose-600 dark:text-rose-400 bg-rose-500/10'
                : 'text-slate-600 dark:text-slate-400 bg-slate-500/10'
            }`}
          >
            {isPositive7d ? (
              <TrendingUp className="h-3 w-3" />
            ) : isNegative7d ? (
              <TrendingDown className="h-3 w-3" />
            ) : (
              <Minus className="h-3 w-3" />
            )}
            {trend.delta_7d_pct > 0 ? `+${trend.delta_7d_pct}%` : `${trend.delta_7d_pct}%`}
          </span>
        </div>
        <div className="my-2">
          <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white font-mono">
            {formatStepNumber(trend.current_7d_avg)}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            vs. {formatStepNumber(trend.previous_7d_avg)} na semana anterior
          </p>
        </div>
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 text-2xs text-slate-400 dark:text-slate-500">
          Últimos 7 dias registrados
        </div>
      </div>

      {/* 3. Média Mensal Vigente */}
      <div className="rounded-radius-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 shadow-2xs flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <BarChart2 className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            Mês Vigente
          </span>
          {currentMonth?.trend_vs_previous_month_pct != null && (
            <span
              className={`text-2xs font-bold px-1.5 py-0.5 rounded-radius-full ${
                currentMonth.trend_vs_previous_month_pct >= 0
                  ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
                  : 'text-rose-600 dark:text-rose-400 bg-rose-500/10'
              }`}
            >
              {currentMonth.trend_vs_previous_month_pct > 0 ? '+' : ''}
              {currentMonth.trend_vs_previous_month_pct}%
            </span>
          )}
        </div>
        <div className="my-2">
          <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white font-mono">
            {formatStepNumber(currentMonth?.avg_steps ?? summary.overall_avg_steps)}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Total: {formatStepNumber(currentMonth?.total_steps ?? 0)} passos
          </p>
        </div>
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 text-2xs text-slate-400 dark:text-slate-500">
          {currentMonth?.month_label || 'Consolidado mensal'}
        </div>
      </div>

      {/* 4. Meta Zepp & Dias Batidos */}
      <div className="rounded-radius-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 shadow-2xs flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Target className="h-4 w-4 text-amber-500" />
            Meta Zepp ({formatStepNumber(summary.default_goal)})
          </span>
          {summary.current_streak_goal_days > 0 && (
            <span className="text-2xs font-bold px-1.5 py-0.5 rounded-radius-full text-amber-600 dark:text-amber-400 bg-amber-500/10 flex items-center gap-1">
              <Flame className="h-3 w-3 text-amber-500" />
              {summary.current_streak_goal_days}d seguidos
            </span>
          )}
        </div>
        <div className="my-2">
          <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white font-mono">
            {summary.goal_completion_rate_pct}%
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {summary.days_above_goal} de {summary.total_days} dias na meta
          </p>
        </div>
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 text-2xs text-slate-400 dark:text-slate-500">
          Melhor sequência: {summary.best_streak_goal_days} dias
        </div>
      </div>

      {/* 5. Recorde Pessoal & Distância */}
      <div className="rounded-radius-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 shadow-2xs flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Trophy className="h-4 w-4 text-amber-400" />
            Recorde Histórico
          </span>
          <span className="text-2xs font-bold px-1.5 py-0.5 rounded-radius-full text-amber-700 dark:text-amber-300 bg-amber-400/10">
            Máximo
          </span>
        </div>
        <div className="my-2">
          <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white font-mono">
            {formatStepNumber(summary.max_steps)}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {summary.max_steps_date ? `Em ${formatDateBR(summary.max_steps_date)}` : '—'}
          </p>
        </div>
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 text-2xs text-slate-400 dark:text-slate-500">
          {summary.total_distance_km.toFixed(1)} km totais percorridos
        </div>
      </div>
    </div>
  );
};
