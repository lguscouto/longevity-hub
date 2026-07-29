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
    emerald: 'from-emerald-500/20 to-teal-500/5 text-emerald-400 border-emerald-500/30',
    cyan: 'from-cyan-500/20 to-blue-500/5 text-cyan-400 border-cyan-500/30',
    violet: 'from-violet-500/20 to-purple-500/5 text-violet-400 border-violet-500/30',
    rose: 'from-rose-500/20 to-pink-500/5 text-rose-400 border-rose-500/30',
    amber: 'from-amber-500/20 to-orange-500/5 text-amber-400 border-amber-500/30',
  };

  const iconBgMap = {
    emerald: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    cyan: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    violet: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
    rose: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
    amber: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  };

  return (
    <div className={`p-5 rounded-2xl glass-card border bg-gradient-to-br ${colorMap[color]} transition-all hover:scale-[1.02]`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</span>
        <div className={`p-2.5 rounded-xl border ${iconBgMap[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="flex items-baseline gap-1.5 mb-1">
        <span className="text-2xl font-extrabold tracking-tight text-white">{value}</span>
        {unit && <span className="text-xs font-semibold text-slate-400">{unit}</span>}
      </div>
      {(subtitle || trend) && (
        <div className="flex items-center justify-between text-xs text-slate-400 mt-2 pt-2 border-t border-slate-800/60">
          {subtitle && <span>{subtitle}</span>}
          {trend && <span className="font-medium text-emerald-400">{trend}</span>}
        </div>
      )}
    </div>
  );
};
