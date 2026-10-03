import React from 'react';
import {
  PlusCircle,
  Stethoscope,
  RefreshCw,
  Settings,
  Moon,
  Sun,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { SyncStatusBadge, SyncState } from './ui/SyncStatusBadge';

export interface HeaderUtilityActionsProps {
  onOpenManualEntry: () => void;
  onOpenDoctorBriefing: () => void;
  onSyncZepp: () => void;
  onSyncGoogleHealth?: () => void;
  onOpenAISettings: () => void;
  isSyncing: boolean;
  isSyncingGoogle?: boolean;
  lastSyncTime?: string | null;
  syncState?: SyncState;
  dataCoveredUntil?: string | null;
  onOpenSyncStatus?: () => void;
}

/**
 * Componente modular de ações utilitárias do cabeçalho.
 * Agrupa semanticamente:
 * 1. Ações clínicas operacionais ("Ações do dia"): Registrar Métrica e Doctor Briefing
 * 2. Infraestrutura e Sincronização: Wearables Zepp e Google Health
 * 3. Preferências e Configurações: Configuração de IA e Alternador de Tema
 */
export const HeaderUtilityActions: React.FC<HeaderUtilityActionsProps> = ({
  onOpenManualEntry,
  onOpenDoctorBriefing,
  onSyncZepp,
  onSyncGoogleHealth,
  onOpenAISettings,
  isSyncing,
  isSyncingGoogle = false,
  lastSyncTime,
  syncState,
  dataCoveredUntil,
  onOpenSyncStatus,
}) => {
  const { theme, toggleTheme } = useTheme();

  const effectiveSyncState: SyncState =
    syncState ||
    (isSyncing || isSyncingGoogle
      ? 'syncing'
      : lastSyncTime
      ? 'success'
      : 'never');

  return (
    <div
      role="toolbar"
      aria-label="Ações de utilidade e controle"
      className="flex items-center flex-wrap justify-center md:justify-end gap-2 w-full md:w-auto"
    >
      {/* 1. Cluster Clínico Operacional ("Ações do Dia") */}
      <div
        role="group"
        aria-label="Ações clínicas do dia"
        className="flex items-center gap-2"
      >
        <button
          type="button"
          onClick={onOpenManualEntry}
          title="Registrar métricas manuais (pressão arterial, peso, dinamometria, VO2 max)"
          aria-label="Registrar Métrica Manual"
          className="relative flex items-center gap-1.5 px-3 py-1.5 sm:py-2 min-h-[36px] sm:min-h-[40px] after:content-[''] after:absolute after:top-1/2 after:left-1/2 after:-translate-x-1/2 after:-translate-y-1/2 after:min-h-[44px] after:w-full md:after:hidden rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-xs transition shrink-0 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
        >
          <PlusCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <span>Registrar Métrica</span>
        </button>

        <button
          type="button"
          onClick={onOpenDoctorBriefing}
          title="Gerar briefing clínico estruturado para consulta médica"
          aria-label="Doctor Briefing"
          className="relative flex items-center gap-1.5 px-3 py-1.5 sm:py-2 min-h-[36px] sm:min-h-[40px] after:content-[''] after:absolute after:top-1/2 after:left-1/2 after:-translate-x-1/2 after:-translate-y-1/2 after:min-h-[44px] after:w-full md:after:hidden rounded-xl text-xs font-semibold bg-cyan-50 dark:bg-cyan-950/40 hover:bg-cyan-100 dark:hover:bg-cyan-900/60 text-cyan-800 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800/60 shadow-xs transition shrink-0 focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:outline-none"
        >
          <Stethoscope className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
          <span>Doctor Briefing</span>
        </button>
      </div>

      <div
        className="h-5 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block mx-0.5"
        aria-hidden="true"
      />

      {/* 2. Cluster Técnico / Infraestrutura e Preferências */}
      <div
        role="group"
        aria-label="Controle de sincronização e configurações"
        className="flex items-center gap-1.5 bg-slate-100/80 dark:bg-slate-900/60 p-1 rounded-xl border border-slate-200/80 dark:border-slate-800/80"
      >
        <SyncStatusBadge
          state={effectiveSyncState}
          sourceLabel="Zepp"
          lastSyncTime={lastSyncTime}
          dataCoveredUntil={dataCoveredUntil}
          onClick={onOpenSyncStatus}
          compact
          className="hidden md:inline-flex"
        />

        <button
          type="button"
          onClick={() => onSyncZepp()}
          disabled={isSyncing || isSyncingGoogle}
          title={
            isSyncing
              ? 'Sincronizando dados de wearables (Zepp OS)...'
              : lastSyncTime
              ? `Última sincronização às ${lastSyncTime}. Clique para atualizar.`
              : 'Atualizar dados de wearables (Zepp OS)'
          }
          aria-label="Sync Zepp"
          className="relative flex items-center gap-1.5 px-2.5 py-1.5 min-h-[36px] after:content-[''] after:absolute after:top-1/2 after:left-1/2 after:-translate-x-1/2 after:-translate-y-1/2 after:min-h-[44px] after:w-full md:after:hidden rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700/80 transition shadow-xs disabled:opacity-50 shrink-0 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 ${
              isSyncing ? 'animate-spin' : ''
            }`}
          />
          <span className="hidden sm:inline">
            {isSyncing
              ? 'Sincronizando...'
              : lastSyncTime
              ? `Sincronizado ${lastSyncTime}`
              : 'Sync Zepp'}
          </span>
          <span className="sm:hidden font-medium">Sync</span>
        </button>

        {onSyncGoogleHealth && (
          <button
            type="button"
            onClick={onSyncGoogleHealth}
            disabled={isSyncing || isSyncingGoogle}
            title="Sincronizar Google Health API v4"
            aria-label="Sync Google"
            className="relative flex items-center gap-1 px-2.5 py-1.5 min-h-[36px] after:content-[''] after:absolute after:top-1/2 after:left-1/2 after:-translate-x-1/2 after:-translate-y-1/2 after:min-h-[44px] after:w-full md:after:hidden rounded-lg text-xs font-semibold hover:bg-slate-200/60 dark:hover:bg-slate-800/60 text-blue-700 dark:text-blue-400 transition disabled:opacity-50 shrink-0 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isSyncingGoogle ? 'animate-spin' : ''}`}
            />
            <span className="hidden md:inline">
              {isSyncingGoogle ? 'Google...' : 'Google'}
            </span>
          </button>
        )}

        <button
          type="button"
          onClick={onOpenAISettings}
          className="relative p-1.5 min-h-[36px] min-w-[36px] after:content-[''] after:absolute after:top-1/2 after:left-1/2 after:-translate-x-1/2 after:-translate-y-1/2 after:min-w-[44px] after:min-h-[44px] md:after:hidden rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-800/60 text-slate-600 dark:text-slate-300 transition shrink-0 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none flex items-center justify-center cursor-pointer"
          title="Configurações de IA e Chaves de API"
          aria-label="Configurações de IA e Chaves de API"
        >
          <Settings className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={toggleTheme}
          className="relative p-1.5 min-h-[36px] min-w-[36px] after:content-[''] after:absolute after:top-1/2 after:left-1/2 after:-translate-x-1/2 after:-translate-y-1/2 after:min-w-[44px] after:min-h-[44px] md:after:hidden rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-800/60 text-slate-600 dark:text-slate-300 transition shrink-0 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none flex items-center justify-center cursor-pointer"
          title={
            theme === 'dark'
              ? 'Alternar para tema claro'
              : 'Alternar para tema escuro'
          }
          aria-label={
            theme === 'dark'
              ? 'Alternar para tema claro'
              : 'Alternar para tema escuro'
          }
        >
          {theme === 'dark' ? (
            <Sun className="h-4 w-4 text-amber-400" />
          ) : (
            <Moon className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          )}
        </button>
      </div>
    </div>
  );
};
