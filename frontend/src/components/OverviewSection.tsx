import React from 'react';
import { LucideIcon } from 'lucide-react';

interface OverviewSectionProps {
  id: string;
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  badge?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const OverviewSection: React.FC<OverviewSectionProps> = ({
  id,
  title,
  subtitle,
  icon: Icon,
  badge,
  action,
  children,
  className = '',
}) => {
  const headingId = `${id}-heading`;

  return (
    <section aria-labelledby={headingId} className={`space-y-4 pt-2 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-slate-200/80 dark:border-slate-800/80">
        <div className="flex items-center gap-2.5">
          {Icon && (
            <div className="p-1.5 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
              <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h2 id={headingId} className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                {title}
              </h2>
              {badge}
            </div>
            {subtitle && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {action && (
          <div className="flex items-center gap-2 shrink-0">
            {action}
          </div>
        )}
      </div>

      <div className="space-y-4">
        {children}
      </div>
    </section>
  );
};
