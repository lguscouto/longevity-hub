import React from 'react';
import { LucideIcon } from 'lucide-react';
import { ExplainChangeButton } from './contextInsights/ExplainChangeButton';
import { formatMetricValue } from '../lib/formatters';

export type RangeType = 'target' | 'reference' | 'optimal';

export interface MetricCardProps {
  title: string;
  value: string | number | null | undefined;
  unit?: string;
  subtitle?: string;
  rangeType?: RangeType;
  rangeValue?: string;
  icon: LucideIcon;
  color?: 'emerald' | 'cyan' | 'violet' | 'rose' | 'amber';
  trend?: string;
  onExplainChange?: () => void;
}

export const RANGE_SEMANTICS: Record<
  RangeType,
  {
    label: string;
    shortLabel: string;
    tooltip: string;
    badgeClass: string;
  }
> = {
  target: {
    label: 'Alvo Pessoal',
    shortLabel: 'Alvo',
    tooltip: 'Meta personalizada definida no seu protocolo de saúde',
    badgeClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
  },
  reference: {
    label: 'Referência Clínica',
    shortLabel: 'Ref',
    tooltip: 'Intervalo de referência clínica padrão laboratorial/populacional',
    badgeClass: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20',
  },
  optimal: {
    label: 'Alvo Ótimo',
    shortLabel: 'Ótimo',
    tooltip: 'Faixa funcional preconizada para longevidade preventiva',
    badgeClass: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/20',
  },
};

const iconBgMap = {
  emerald: 'bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 dark:border-emerald-500/30',
  cyan: 'bg-cyan-500/10 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border-cyan-500/20 dark:border-cyan-500/30',
  violet: 'bg-violet-500/10 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400 border-violet-500/20 dark:border-violet-500/30',
  rose: 'bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/20 dark:border-rose-500/30',
  amber: 'bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/20 dark:border-amber-500/30',
};

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  unit,
  subtitle,
  rangeType,
  rangeValue,
  icon: Icon,
  color = 'emerald',
  trend,
  onExplainChange,
}) => {
  const formatted = formatMetricValue(value, unit);
  const rangeConfig = rangeType ? RANGE_SEMANTICS[rangeType] : null;

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 truncate">{title}</span>
        <div className={`p-2 rounded-xl border ${iconBgMap[color]} shrink-0`}>
          <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
        </div>
      </div>
      <div className="flex items-baseline gap-1.5 mb-1">
        <span
          className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white"
          aria-label={formatted.accessibleText}
        >
          {formatted.displayValue}
        </span>
        {formatted.displayUnit && (
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {formatted.displayUnit}
          </span>
        )}
      </div>
      {(subtitle || (rangeConfig && rangeValue) || trend || onExplainChange) && (
        <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/60">
          <div className="flex items-center gap-2 flex-wrap">
            {rangeConfig && rangeValue ? (
              <span
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-semibold border ${rangeConfig.badgeClass}`}
                title={rangeConfig.tooltip}
                aria-label={`${rangeConfig.label}: ${rangeValue}`}
              >
                <span className="hidden sm:inline">{rangeConfig.label}:</span>
                <span className="sm:hidden">{rangeConfig.shortLabel}:</span>
                <span className="font-mono">{rangeValue}</span>
              </span>
            ) : subtitle ? (
              <span className="truncate">{subtitle}</span>
            ) : null}
            {trend && <span className="font-semibold text-emerald-600 dark:text-emerald-400">{trend}</span>}
          </div>
          {onExplainChange && (
            <ExplainChangeButton onClick={onExplainChange} size="sm" />
          )}
        </div>
      )}
    </div>
  );
};
