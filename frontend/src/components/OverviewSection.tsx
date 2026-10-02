import React, { useState } from 'react';
import { LucideIcon, ChevronDown } from 'lucide-react';

export interface OverviewSectionProps {
  id: string;
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  badge?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  storageKey?: string;
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
  collapsible = false,
  defaultCollapsed = false,
  storageKey,
}) => {
  const headingId = `${id}-heading`;
  const contentId = `${id}-content`;

  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    if (!collapsible) return false;
    if (storageKey && typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored !== null) {
          return stored === 'true';
        }
      } catch {
        // ignore localStorage access errors
      }
    }
    return defaultCollapsed;
  });

  const toggleCollapse = () => {
    if (!collapsible) return;
    setIsCollapsed(prev => {
      const next = !prev;
      if (storageKey && typeof window !== 'undefined') {
        try {
          localStorage.setItem(storageKey, String(next));
        } catch {
          // ignore
        }
      }
      return next;
    });
  };

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

        <div className="flex items-center gap-2 shrink-0">
          {action}
          {collapsible && (
            <button
              type="button"
              onClick={toggleCollapse}
              aria-expanded={!isCollapsed}
              aria-controls={contentId}
              aria-label={isCollapsed ? `Exibir detalhes de ${title}` : `Ocultar detalhes de ${title}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/80 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 relative after:absolute after:-inset-1 md:after:hidden"
            >
              <span>{isCollapsed ? 'Exibir análises detalhadas' : 'Ocultar detalhes'}</span>
              <ChevronDown
                className={`h-4 w-4 transition-transform duration-200 ${
                  isCollapsed ? '-rotate-90' : ''
                }`}
              />
            </button>
          )}
        </div>
      </div>

      <div
        id={contentId}
        hidden={isCollapsed}
        className={isCollapsed ? 'hidden' : 'space-y-4 animate-in fade-in duration-200'}
      >
        {children}
      </div>
    </section>
  );
};
