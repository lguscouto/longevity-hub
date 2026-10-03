import React from 'react';
import {
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Clock,
  Cloud,
  CloudOff,
  KeyRound,
} from 'lucide-react';

export type SyncState =
  | 'never'
  | 'syncing'
  | 'success'
  | 'partial'
  | 'error'
  | 'expired'
  | 'disconnected'
  | 'stale';

export interface SyncStatusBadgeProps {
  state: SyncState;
  sourceLabel?: string;
  lastSyncTime?: string | null;
  dataCoveredUntil?: string | null;
  partialCount?: {
    imported: number;
    unprocessable: number;
  };
  errorMessage?: string | null;
  onClick?: () => void;
  disabled?: boolean;
  compact?: boolean;
  className?: string;
}

interface StateConfig {
  label: string;
  badgeLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  containerClass: string;
  iconClass: string;
  textClass: string;
  ariaDescription: string;
}

const STATE_CONFIGS: Record<SyncState, StateConfig> = {
  never: {
    label: 'Nunca sincronizado',
    badgeLabel: 'Não sincronizado',
    icon: Cloud,
    containerClass:
      'bg-slate-100 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300',
    iconClass: 'text-slate-500 dark:text-slate-400',
    textClass: 'text-slate-700 dark:text-slate-300',
    ariaDescription: 'Nenhuma sincronização foi realizada ainda.',
  },
  syncing: {
    label: 'Sincronizando...',
    badgeLabel: 'Sincronizando',
    icon: RefreshCw,
    containerClass:
      'bg-cyan-50 dark:bg-cyan-950/40 border-cyan-200 dark:border-cyan-800/60 text-cyan-800 dark:text-cyan-300',
    iconClass: 'text-cyan-600 dark:text-cyan-400 animate-spin',
    textClass: 'text-cyan-800 dark:text-cyan-300 font-semibold',
    ariaDescription: 'Sincronização em andamento com as fontes de saúde.',
  },
  success: {
    label: 'Sincronizado',
    badgeLabel: 'Sincronizado',
    icon: CheckCircle2,
    containerClass:
      'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300',
    iconClass: 'text-emerald-600 dark:text-emerald-400',
    textClass: 'text-emerald-800 dark:text-emerald-300 font-semibold',
    ariaDescription: 'Fontes de dados sincronizadas com sucesso.',
  },
  partial: {
    label: 'Sincronizado com pendências',
    badgeLabel: 'Sucesso parcial',
    icon: AlertTriangle,
    containerClass:
      'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-300',
    iconClass: 'text-amber-600 dark:text-amber-400',
    textClass: 'text-amber-800 dark:text-amber-300 font-semibold',
    ariaDescription: 'Sincronização concluída parcialmente com registros não processados.',
  },
  error: {
    label: 'Falha na sincronização',
    badgeLabel: 'Erro de sync',
    icon: AlertCircle,
    containerClass:
      'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/60 text-rose-800 dark:text-rose-300',
    iconClass: 'text-rose-600 dark:text-rose-400',
    textClass: 'text-rose-800 dark:text-rose-300 font-semibold',
    ariaDescription: 'Ocorreu um erro ao sincronizar as fontes de dados.',
  },
  expired: {
    label: 'Token expirado',
    badgeLabel: 'Reautenticar',
    icon: KeyRound,
    containerClass:
      'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/60 text-rose-800 dark:text-rose-300',
    iconClass: 'text-rose-600 dark:text-rose-400',
    textClass: 'text-rose-800 dark:text-rose-300 font-semibold',
    ariaDescription: 'Credenciais de integração expiraram e exigem nova autorização.',
  },
  disconnected: {
    label: 'Fonte desconectada',
    badgeLabel: 'Desconectado',
    icon: CloudOff,
    containerClass:
      'bg-slate-100 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300',
    iconClass: 'text-slate-500 dark:text-slate-400',
    textClass: 'text-slate-700 dark:text-slate-300',
    ariaDescription: 'Nenhum dispositivo ou fonte de wearable está conectado.',
  },
  stale: {
    label: 'Dados antigos (>24h)',
    badgeLabel: 'Dados desatualizados',
    icon: Clock,
    containerClass:
      'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-300',
    iconClass: 'text-amber-600 dark:text-amber-400',
    textClass: 'text-amber-800 dark:text-amber-300 font-medium',
    ariaDescription: 'Dados de saúde não são atualizados há mais de 24 horas.',
  },
};

export const SyncStatusBadge: React.FC<SyncStatusBadgeProps> = ({
  state,
  sourceLabel = 'Zepp',
  lastSyncTime,
  dataCoveredUntil,
  partialCount,
  errorMessage,
  onClick,
  disabled = false,
  compact = false,
  className = '',
}) => {
  const config = STATE_CONFIGS[state] || STATE_CONFIGS.never;
  const Icon = config.icon;

  const tooltipParts = [
    sourceLabel ? `${sourceLabel}: ${config.label}` : config.label,
    lastSyncTime ? `Última sincronização: ${lastSyncTime}` : null,
    dataCoveredUntil ? `Dados cobertos até: ${dataCoveredUntil}` : null,
    partialCount
      ? `${partialCount.imported} importados · ${partialCount.unprocessable} não processados`
      : null,
    errorMessage ? `Detalhes: ${errorMessage}` : null,
  ].filter(Boolean);

  const fullAriaLabel = tooltipParts.join(' · ');

  const content = (
    <>
      <span className="relative flex items-center justify-center shrink-0">
        <Icon className={`h-3.5 w-3.5 ${config.iconClass}`} aria-hidden="true" />
      </span>

      <span className="flex items-center gap-1.5 min-w-0 truncate">
        {/* Mobile ou modo compacto */}
        <span className={`${compact ? 'inline' : 'inline sm:hidden'} ${config.textClass}`}>
          {state === 'syncing' ? 'Sync...' : config.badgeLabel}
        </span>

        {/* Desktop / Expansivo (apenas quando não compacto) */}
        {!compact && (
          <span
            className={`hidden sm:inline-flex items-center gap-1 ${config.textClass}`}
          >
            <span>{sourceLabel}</span>
            <span className="text-slate-400 dark:text-slate-600 font-normal">·</span>
            <span>
              {state === 'syncing'
                ? 'Sincronizando fontes...'
                : state === 'partial' && partialCount
                ? `${partialCount.imported} ok · ${partialCount.unprocessable} avisos`
                : lastSyncTime
                ? `sincronizado ${lastSyncTime}`
                : config.label}
            </span>
            {dataCoveredUntil && state === 'success' && (
              <>
                <span className="text-slate-400 dark:text-slate-600 font-normal">·</span>
                <span className="text-slate-500 dark:text-slate-400 font-normal">
                  dados até {dataCoveredUntil}
                </span>
              </>
            )}
          </span>
        )}
      </span>
    </>
  );

  const baseClasses = `inline-flex items-center gap-1.5 px-2.5 py-1 min-h-[32px] sm:min-h-[34px] rounded-radius-sm border text-xs shadow-xs transition select-none ${
    config.containerClass
  } ${className}`;

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled || state === 'syncing'}
        aria-label={fullAriaLabel}
        title={fullAriaLabel}
        className={`${baseClasses} hover:opacity-90 active:scale-98 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none relative after:content-[''] after:absolute after:top-1/2 after:left-1/2 after:-translate-x-1/2 after:-translate-y-1/2 after:min-h-[44px] after:w-full md:after:hidden`}
      >
        {content}
      </button>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={fullAriaLabel}
      title={fullAriaLabel}
      className={baseClasses}
    >
      {content}
    </div>
  );
};
