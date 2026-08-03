import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  subtitle?: string;
  icon: LucideIcon;
  color?: 'emerald' | 'cyan' | 'violet' | 'rose' | 'amber';
  trend?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  unit,
  subtitle,
  icon: Icon,
  color = 'emerald',
  trend
}) => {
  const colorMap = {
    emerald: 'from-emerald-500/10 via-emerald-500/5 to-transparent text-emerald-600 dark:text-emerald-400 border-emerald-500/20 dark:border-emerald-500/30',
    cyan: 'from-cyan-500/10 via-cyan-500/5 to-transparent text-cyan-600 dark:text-cyan-400 border-cyan-500/20 dark:border-cyan-500/30',
    violet: 'from-violet-500/10 via-violet-500/5 to-transparent text-violet-600 dark:text-violet-400 border-violet-500/20 dark:border-violet-500/30',
    rose: 'from-rose-500/10 via-rose-500/5 to-transparent text-rose-600 dark:text-rose-400 border-rose-500/20 dark:border-rose-500/30',
    amber: 'from-amber-500/10 via-amber-500/5 to-transparent text-amber-600 dark:text-amber-400 border-amber-500/20 dark:border-amber-500/30',
  };

  const iconBgMap = {
    emerald: 'bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 dark:border-emerald-500/30',
    cyan: 'bg-cyan-500/10 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border-cyan-500/20 dark:border-cyan-500/30',
    violet: 'bg-violet-500/10 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400 border-violet-500/20 dark:border-violet-500/30',
    rose: 'bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/20 dark:border-rose-500/30',
    amber: 'bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/20 dark:border-amber-500/30',
  };

  return (
    <div className={`p-5 rounded-2xl glass-card border bg-gradient-to-br ${colorMap[color]} transition-all hover:scale-[1.02] shadow-sm`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{title}</span>
        <div className={`p-2.5 rounded-xl border ${iconBgMap[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="flex items-baseline gap-1.5 mb-1">
        <span className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">{value}</span>
        {unit && <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{unit}</span>}
      </div>
      {(subtitle || trend) && (
        <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 mt-2 pt-2 border-t border-slate-200 dark:border-slate-800/60">
          {subtitle && <span>{subtitle}</span>}
          {trend && <span className="font-medium text-emerald-600 dark:text-emerald-400">{trend}</span>}
        </div>
      )}
    </div>
  );
};
