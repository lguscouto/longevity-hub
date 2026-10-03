import React from 'react';
import { SourceKind, getSourceConfig } from '../../lib/dataSemantics';

export interface SourceTagProps {
  kind: SourceKind;
  compact?: boolean;
  showIcon?: boolean;
  className?: string;
  tooltip?: string;
  ariaLabel?: string;
}

/**
 * SourceTag
 * Componente primitive que materializa a camada epistemológica na interface.
 * Exibe visualmente a natureza de cada dado (Observado, Modelo, Inferência, etc.),
 * garantindo acessibilidade (nunca apenas cor - WCAG 1.4.1) e clareza analítica.
 */
export const SourceTag: React.FC<SourceTagProps> = ({
  kind,
  compact = false,
  showIcon = true,
  className = '',
  tooltip,
  ariaLabel,
}) => {
  const config = getSourceConfig(kind);
  const Icon = config.icon;
  const labelToDisplay = compact ? config.shortLabel : config.label;
  const computedTooltip = tooltip ?? config.tooltip;
  const computedAriaLabel = ariaLabel ?? config.ariaLabel;

  return (
    <span
      role="note"
      title={computedTooltip}
      aria-label={computedAriaLabel}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-radius-sm text-xs font-semibold border transition-colors select-none ${config.badgeClass} ${className}`}
    >
      {showIcon && <Icon className={`h-3 w-3 shrink-0 ${config.iconClass}`} aria-hidden="true" />}
      <span className="tracking-tight">{labelToDisplay}</span>
    </span>
  );
};
