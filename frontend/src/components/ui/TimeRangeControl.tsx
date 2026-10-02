import React, { useRef } from 'react';

export interface TimeRangeOption<T extends string | number = string | number> {
  value: T;
  label: string;
  shortLabel?: string;
  ariaLabel?: string;
  disabled?: boolean;
}

export interface TimeRangeControlProps<T extends string | number = string | number> {
  value: T;
  onChange: (value: T) => void;
  options: TimeRangeOption<T>[];
  label?: string;
  id?: string;
  className?: string;
  size?: 'sm' | 'md';
  activeColor?: 'emerald' | 'indigo' | 'slate';
}

const ACTIVE_COLOR_STYLES: Record<'emerald' | 'indigo' | 'slate', string> = {
  emerald: 'bg-emerald-500 text-slate-950 font-black shadow-xs glow-emerald',
  indigo: 'bg-indigo-600 text-white font-bold shadow-xs',
  slate: 'bg-slate-800 text-white dark:bg-slate-700 font-bold shadow-xs',
};

export function TimeRangeControl<T extends string | number = string | number>({
  value,
  onChange,
  options,
  label,
  id,
  className = '',
  size = 'md',
  activeColor = 'emerald',
}: TimeRangeControlProps<T>): React.ReactElement {
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const enabledOptions = options.map((opt, idx) => ({ opt, idx })).filter(item => !item.opt.disabled);
  const selectedIndex = options.findIndex(opt => opt.value === value);

  // If none is selected, the first enabled option gets tabIndex 0
  const activeTabIndex = selectedIndex !== -1 && !options[selectedIndex]?.disabled
    ? selectedIndex
    : enabledOptions[0]?.idx ?? 0;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
    if (!['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) {
      return;
    }

    e.preventDefault();

    if (enabledOptions.length === 0) return;

    const currentEnabledPos = enabledOptions.findIndex(item => item.idx === currentIndex);
    let targetIndex = currentIndex;

    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      const nextPos = (currentEnabledPos + 1) % enabledOptions.length;
      targetIndex = enabledOptions[nextPos].idx;
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      const prevPos = (currentEnabledPos - 1 + enabledOptions.length) % enabledOptions.length;
      targetIndex = enabledOptions[prevPos].idx;
    } else if (e.key === 'Home') {
      targetIndex = enabledOptions[0].idx;
    } else if (e.key === 'End') {
      targetIndex = enabledOptions[enabledOptions.length - 1].idx;
    }

    const targetOpt = options[targetIndex];
    if (targetOpt && !targetOpt.disabled) {
      onChange(targetOpt.value);
      buttonRefs.current[targetIndex]?.focus();
    }
  };

  const sizeClasses = size === 'sm' ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-xs';

  return (
    <div
      id={id}
      role="radiogroup"
      aria-label={label || 'Intervalo de tempo'}
      className={`inline-flex items-center gap-1 bg-slate-100/90 dark:bg-slate-950 p-1 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs font-semibold ${className}`}
    >
      {label && (
        <span className="px-2 text-xs text-slate-500 font-medium hidden sm:inline select-none">
          {label}:
        </span>
      )}
      {options.map((opt, idx) => {
        const isSelected = opt.value === value;
        const isCurrentTabTarget = idx === activeTabIndex;

        const activeStyle = ACTIVE_COLOR_STYLES[activeColor] || ACTIVE_COLOR_STYLES.emerald;
        const inactiveStyle =
          'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/80 dark:hover:bg-slate-900/60';

        return (
          <button
            key={String(opt.value)}
            ref={el => {
              buttonRefs.current[idx] = el;
            }}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-label={opt.ariaLabel || opt.label}
            disabled={opt.disabled}
            tabIndex={isCurrentTabTarget ? 0 : -1}
            onClick={() => {
              if (!opt.disabled) {
                onChange(opt.value);
              }
            }}
            onKeyDown={e => handleKeyDown(e, idx)}
            className={`rounded-xl transition-all select-none shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1 dark:focus-visible:ring-offset-slate-950 ${sizeClasses} ${
              isSelected ? activeStyle : inactiveStyle
            } ${opt.disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            {opt.shortLabel ? (
              <>
                <span className="hidden sm:inline">{opt.label}</span>
                <span className="sm:hidden">{opt.shortLabel}</span>
              </>
            ) : (
              <span>{opt.label}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
