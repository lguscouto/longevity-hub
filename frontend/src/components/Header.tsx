import React from 'react';
import {
  Activity,
  ShieldCheck,
  Dna,
  Moon,
  History,
  Camera,
  Dumbbell,
  Pill,
  FlaskConical,
  Sparkles,
  User,
} from 'lucide-react';
import { HeaderUtilityActions } from './HeaderUtilityActions';
import { useScrollActiveIntoView } from '../hooks/useScrollActiveIntoView';
import { SyncState } from './ui/SyncStatusBadge';

export type PrimaryTab = 'today' | 'health' | 'workouts' | 'interventions' | 'ai' | 'profile';

export function resolvePrimaryTab(tab: string): PrimaryTab {
  switch (tab) {
    case 'labs':
    case 'sleep':
    case 'timeline':
    case 'physical-assessments':
    case 'health':
      return 'health';
    case 'workouts':
      return 'workouts';
    case 'supplements':
    case 'n-of-1':
    case 'interventions':
      return 'interventions';
    case 'ai':
      return 'ai';
    case 'profile':
    case 'integrations':
    case 'system':
    case 'diagnostics':
      return 'profile';
    case 'overview':
    case 'today':
    default:
      return 'today';
  }
}

interface PrimaryNavItem {
  id: PrimaryTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  targetTab: string;
}

const PRIMARY_NAV_ITEMS: PrimaryNavItem[] = [
  { id: 'today', label: 'Hoje', icon: Activity, targetTab: 'overview' },
  { id: 'health', label: 'Saúde', icon: ShieldCheck, targetTab: 'labs' },
  { id: 'workouts', label: 'Treinos', icon: Dumbbell, targetTab: 'workouts' },
  { id: 'interventions', label: 'Intervenções', icon: Pill, targetTab: 'supplements' },
  { id: 'ai', label: 'IA & Copiloto', icon: Sparkles, targetTab: 'ai' },
  { id: 'profile', label: 'Perfil', icon: User, targetTab: 'profile' },
];

export interface HeaderProps {
  activeTab: string;
  setActiveTab?: (tab: string) => void;
  onSelectTab?: (tab: string) => void;
  onSyncZepp: () => void;
  onSyncGoogleHealth?: () => void;
  onOpenManualEntry: () => void;
  onOpenDoctorBriefing: () => void;
  onOpenAISettings: () => void;
  isSyncing: boolean;
  isSyncingGoogle?: boolean;
  lastSyncTime?: string | null;
  syncState?: SyncState;
  dataCoveredUntil?: string | null;
  onOpenSyncStatus?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onSelectTab,
  onSyncZepp,
  onSyncGoogleHealth,
  onOpenManualEntry,
  onOpenDoctorBriefing,
  onOpenAISettings,
  isSyncing,
  isSyncingGoogle = false,
  lastSyncTime,
  syncState,
  dataCoveredUntil,
  onOpenSyncStatus,
}) => {
  const handleTabClick = (tabId: string) => {
    if (onSelectTab) {
      onSelectTab(tabId);
    } else if (setActiveTab) {
      setActiveTab(tabId);
    }
  };

  const primaryTab = resolvePrimaryTab(activeTab);

  const activeSubNavRef = useScrollActiveIntoView<HTMLButtonElement>({
    activeKey: activeTab,
    behavior: 'smooth',
    inline: 'nearest',
    block: 'nearest',
  });

  // Botões inativos com contraste acessível e transição suave
  const inactivePrimaryClass =
    'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/70 dark:hover:bg-slate-800/60 transition focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none';

  // Botão ativo com contraste sólido e sem arco-íris de gradientes
  const activePrimaryClass =
    'bg-emerald-600 dark:bg-emerald-500 text-white dark:text-slate-950 font-bold shadow-sm focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none';

  const inactiveSubClass =
    'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-800/40 transition focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none';

  const activeSubClass =
    'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 font-bold shadow-xs border border-slate-200 dark:border-slate-700 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none';

  const renderSubNavButton = (
    id: string,
    label: string,
    Icon: React.ComponentType<{ className?: string }>,
    isActive: boolean
  ) => (
    <button
      key={id}
      ref={isActive ? activeSubNavRef : undefined}
      onClick={() => handleTabClick(id)}
      aria-current={isActive ? 'page' : undefined}
      className={`flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] rounded-lg text-xs font-medium transition shrink-0 whitespace-nowrap ${
        isActive ? activeSubClass : inactiveSubClass
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      <span>{label}</span>
    </button>
  );

  return (
    <header className="sticky top-0 z-40 glass-panel border-b border-slate-200/80 dark:border-slate-800 px-3 sm:px-6 py-1.5 sm:py-3 mb-3 sm:mb-8 space-y-1.5 sm:space-y-2.5">
      {/* Linha Superior: Marca e Ações (Separadas entre Clínicas e Infraestrutura) */}
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2.5 sm:gap-3">
        {/* Marca / Identidade */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start min-w-0">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            {/* ds-exception: DSX-003 */}
            <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center text-white shrink-0">
              <Activity className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div className="min-w-0">
              {/* ds-exception: DSX-004 */}
              <h1 className="text-sm sm:text-lg font-bold tracking-tight bg-gradient-to-r from-slate-900 via-slate-700 to-emerald-600 dark:from-white dark:via-slate-200 dark:to-emerald-400 bg-clip-text text-transparent flex items-center gap-1.5 truncate">
                LONGEVIDADE <span className="text-xs font-semibold px-1.5 sm:px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">HUB</span>
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">
                Gestão e acompanhamento pessoal de saúde e longevidade
              </p>
            </div>
          </div>
        </div>

        {/* Ações Utilitárias Modulares: Clínicas, Infraestrutura e Preferências */}
        <HeaderUtilityActions
          onOpenManualEntry={onOpenManualEntry}
          onOpenDoctorBriefing={onOpenDoctorBriefing}
          onSyncZepp={onSyncZepp}
          onSyncGoogleHealth={onSyncGoogleHealth}
          onOpenAISettings={onOpenAISettings}
          isSyncing={isSyncing}
          isSyncingGoogle={isSyncingGoogle}
          lastSyncTime={lastSyncTime}
          syncState={syncState}
          dataCoveredUntil={dataCoveredUntil}
          onOpenSyncStatus={onOpenSyncStatus}
        />
      </div>

      {/* Linha Principal: Barra de Navegação Consolidada (6 Áreas Primárias) */}
      <div className="max-w-7xl mx-auto py-0.5">
        <nav aria-label="Navegação Principal" className="grid grid-cols-3 sm:grid-cols-6 gap-1 bg-slate-100/90 dark:bg-slate-900/70 p-1 sm:p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800">
          {PRIMARY_NAV_ITEMS.map((item) => {
            const isActive = primaryTab === item.id;
            const target =
              item.id === 'health'
                ? (primaryTab === 'health' ? activeTab : 'labs')
                : item.id === 'interventions'
                ? (primaryTab === 'interventions' ? activeTab : 'supplements')
                : item.id === 'profile'
                ? (primaryTab === 'profile' ? activeTab : 'profile')
                : item.targetTab;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => handleTabClick(target)}
                aria-current={isActive ? 'page' : undefined}
                className={`flex items-center justify-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 sm:py-2 min-h-[44px] rounded-xl text-xs sm:text-sm font-medium transition-all ${
                  isActive ? activePrimaryClass : inactivePrimaryClass
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Linha Contextual: Sub-navegação contextual para Saúde, Intervenções ou Perfil */}
      {primaryTab === 'health' && (
        <div className="max-w-7xl mx-auto pt-0.5 animate-fadeIn">
          <div className="relative">
            <nav aria-label="Sub-navegação de Saúde" className="flex items-center gap-1 sm:gap-1.5 bg-slate-200/50 dark:bg-slate-950/40 p-1 rounded-xl border border-slate-200/80 dark:border-slate-800/80 overflow-x-auto no-scrollbar">
              {renderSubNavButton('labs', 'Exames & PhenoAge', Dna, activeTab === 'labs')}
              {renderSubNavButton('sleep', 'Sono', Moon, activeTab === 'sleep')}
              {renderSubNavButton('timeline', 'Linha do Tempo', History, activeTab === 'timeline')}
              {renderSubNavButton('physical-assessments', 'Avaliações Físicas', Camera, activeTab === 'physical-assessments')}
            </nav>
            {/* ds-exception: DSX-005 */}
            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-slate-200/90 dark:from-slate-950/90 to-transparent pointer-events-none rounded-r-xl sm:hidden" />
          </div>
        </div>
      )}

      {primaryTab === 'interventions' && (
        <div className="max-w-7xl mx-auto pt-0.5 animate-fadeIn">
          <div className="relative">
            <nav aria-label="Sub-navegação de Intervenções" className="flex items-center gap-1 sm:gap-1.5 bg-slate-200/50 dark:bg-slate-950/40 p-1 rounded-xl border border-slate-200/80 dark:border-slate-800/80 overflow-x-auto no-scrollbar">
              {renderSubNavButton('supplements', 'Suplementos & Hormônios', Pill, activeTab === 'supplements')}
              {renderSubNavButton('n-of-1', 'N-of-1 Tests', FlaskConical, activeTab === 'n-of-1')}
            </nav>
            {/* ds-exception: DSX-006 */}
            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-slate-200/90 dark:from-slate-950/90 to-transparent pointer-events-none rounded-r-xl sm:hidden" />
          </div>
        </div>
      )}

      {primaryTab === 'profile' && (
        <div className="max-w-7xl mx-auto pt-0.5 animate-fadeIn">
          <div className="relative">
            <nav aria-label="Sub-navegação de Perfil" className="flex items-center gap-1 sm:gap-1.5 bg-slate-200/50 dark:bg-slate-950/40 p-1 rounded-xl border border-slate-200/80 dark:border-slate-800/80 overflow-x-auto no-scrollbar">
              {renderSubNavButton('profile', 'Meu Perfil', User, activeTab === 'profile' || !['integrations', 'system', 'diagnostics'].includes(activeTab))}
              {renderSubNavButton('integrations', 'Integrações', ShieldCheck, activeTab === 'integrations')}
              {renderSubNavButton('system', 'Diagnóstico & Sistema', Activity, activeTab === 'system' || activeTab === 'diagnostics')}
            </nav>
            {/* ds-exception: DSX-007 */}
            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-slate-200/90 dark:from-slate-950/90 to-transparent pointer-events-none rounded-r-xl sm:hidden" />
          </div>
        </div>
      )}
    </header>
  );
};
