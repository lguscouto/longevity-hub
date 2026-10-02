import React from 'react';
import {
  Activity,
  PlusCircle,
  Stethoscope,
  RefreshCw,
  Settings,
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

interface HeaderProps {
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
}) => {
  const handleTabClick = (tabId: string) => {
    if (onSelectTab) {
      onSelectTab(tabId);
    } else if (setActiveTab) {
      setActiveTab(tabId);
    }
  };

  const primaryTab = resolvePrimaryTab(activeTab);

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

  return (
    <header className="sticky top-0 z-40 glass-panel border-b border-slate-200/80 dark:border-slate-800 px-3.5 sm:px-6 py-2.5 sm:py-3 mb-4 sm:mb-8 space-y-2.5">
      {/* Linha Superior: Marca e Ações (Separadas entre Clínicas e Infraestrutura) */}
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Marca / Identidade */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start min-w-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center text-white glow-emerald shrink-0">
              <Activity className="h-5 w-5 sm:h-6 sm:w-6 animate-pulse" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-bold tracking-tight bg-gradient-to-r from-slate-900 via-slate-700 to-emerald-600 dark:from-white dark:via-slate-200 dark:to-emerald-400 bg-clip-text text-transparent flex items-center gap-1.5 truncate">
                LONGEVIDADE <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">HUB</span>
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">
                Gestão e acompanhamento pessoal de saúde e longevidade
              </p>
            </div>
          </div>
        </div>

        {/* Ações Rápidas: Registro & Clínicas | Sincronização & Infraestrutura */}
        <div className="flex items-center flex-wrap justify-center md:justify-end gap-2 w-full md:w-auto">
          {/* Cluster Clínico / Usuário */}
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenManualEntry}
              title="Registrar métricas manuais (pressão arterial, peso, dinamometria, VO2 max)"
              aria-label="Registrar Métrica Manual"
              className="flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-xs transition shrink-0 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
            >
              <PlusCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>Registrar Métrica</span>
            </button>

            <button
              onClick={onOpenDoctorBriefing}
              className="flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-xl text-xs font-semibold bg-cyan-50 dark:bg-cyan-950/40 hover:bg-cyan-100 dark:hover:bg-cyan-900/60 text-cyan-800 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800/60 shadow-xs transition shrink-0 focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:outline-none"
            >
              <Stethoscope className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
              <span>Doctor Briefing</span>
            </button>
          </div>

          <div className="h-5 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block mx-0.5" />

          {/* Cluster Técnico / Infraestrutura */}
          <div className="flex items-center gap-1.5 bg-slate-100/80 dark:bg-slate-900/60 p-1 rounded-xl border border-slate-200/80 dark:border-slate-800/80">
            <button
              onClick={() => onSyncZepp()}
              disabled={isSyncing}
              title="Atualizar dados de wearables (Zepp OS)"
              aria-label="Sync Zepp"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-emerald-700 dark:text-emerald-400 border border-slate-200/80 dark:border-slate-700/80 transition shadow-xs disabled:opacity-50 shrink-0 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Sincronizando...' : 'Atualizar dados'}</span>
            </button>

            {onSyncGoogleHealth && (
              <button
                onClick={onSyncGoogleHealth}
                disabled={isSyncingGoogle}
                title="Sincronizar Google Health API v4"
                aria-label="Sync Google"
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold hover:bg-slate-200/60 dark:hover:bg-slate-800/60 text-blue-700 dark:text-blue-400 transition disabled:opacity-50 shrink-0 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isSyncingGoogle ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">{isSyncingGoogle ? 'Google...' : 'Google'}</span>
              </button>
            )}

            <button
              onClick={onOpenAISettings}
              className="p-1.5 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-800/60 text-slate-600 dark:text-slate-300 transition shrink-0 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
              title="Configurações de IA e Chaves de API"
              aria-label="Configurações de IA e Chaves de API"
            >
              <Settings className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Linha Principal: Barra de Navegação Consolidada (6 Áreas Primárias) */}
      <div className="max-w-7xl mx-auto py-0.5">
        <nav aria-label="Navegação Principal" className="grid grid-cols-3 sm:grid-cols-6 gap-1 bg-slate-100/90 dark:bg-slate-900/70 p-1 sm:p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800">
          {/* 1. Hoje */}
          <button
            onClick={() => handleTabClick('overview')}
            aria-current={primaryTab === 'today' ? 'page' : undefined}
            className={`flex items-center justify-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-medium transition-all ${
              primaryTab === 'today' ? activePrimaryClass : inactivePrimaryClass
            }`}
          >
            <Activity className="h-4 w-4 shrink-0" />
            <span className="truncate">Hoje</span>
          </button>

          {/* 2. Saúde */}
          <button
            onClick={() => handleTabClick(primaryTab === 'health' ? activeTab : 'labs')}
            aria-current={primaryTab === 'health' ? 'page' : undefined}
            className={`flex items-center justify-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-medium transition-all ${
              primaryTab === 'health' ? activePrimaryClass : inactivePrimaryClass
            }`}
          >
            <ShieldCheck className="h-4 w-4 shrink-0" />
            <span className="truncate">Saúde</span>
          </button>

          {/* 3. Treinos */}
          <button
            onClick={() => handleTabClick('workouts')}
            aria-current={primaryTab === 'workouts' ? 'page' : undefined}
            className={`flex items-center justify-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-medium transition-all ${
              primaryTab === 'workouts' ? activePrimaryClass : inactivePrimaryClass
            }`}
          >
            <Dumbbell className="h-4 w-4 shrink-0" />
            <span className="truncate">Treinos</span>
          </button>

          {/* 4. Intervenções */}
          <button
            onClick={() => handleTabClick(primaryTab === 'interventions' ? activeTab : 'supplements')}
            aria-current={primaryTab === 'interventions' ? 'page' : undefined}
            className={`flex items-center justify-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-medium transition-all ${
              primaryTab === 'interventions' ? activePrimaryClass : inactivePrimaryClass
            }`}
          >
            <Pill className="h-4 w-4 shrink-0" />
            <span className="truncate">Intervenções</span>
          </button>

          {/* 5. IA & Copiloto */}
          <button
            onClick={() => handleTabClick('ai')}
            aria-current={primaryTab === 'ai' ? 'page' : undefined}
            className={`flex items-center justify-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-medium transition-all ${
              primaryTab === 'ai' ? activePrimaryClass : inactivePrimaryClass
            }`}
          >
            <Sparkles className="h-4 w-4 shrink-0" />
            <span className="truncate">IA & Copiloto</span>
          </button>

          {/* 6. Perfil */}
          <button
            onClick={() => handleTabClick(primaryTab === 'profile' ? activeTab : 'profile')}
            aria-current={primaryTab === 'profile' ? 'page' : undefined}
            className={`flex items-center justify-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-medium transition-all ${
              primaryTab === 'profile' ? activePrimaryClass : inactivePrimaryClass
            }`}
          >
            <User className="h-4 w-4 shrink-0" />
            <span className="truncate">Perfil</span>
          </button>
        </nav>
      </div>

      {/* Linha Contextual: Sub-navegação para Saúde ou Intervenções */}
      {primaryTab === 'health' && (
        <div className="max-w-7xl mx-auto pt-0.5 animate-fadeIn">
          <nav aria-label="Sub-navegação de Saúde" className="flex items-center gap-1 sm:gap-1.5 bg-slate-200/50 dark:bg-slate-950/40 p-1 rounded-xl border border-slate-200/80 dark:border-slate-800/80 overflow-x-auto no-scrollbar">
            <button
              onClick={() => handleTabClick('labs')}
              aria-current={activeTab === 'labs' ? 'page' : undefined}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition shrink-0 whitespace-nowrap ${
                activeTab === 'labs' ? activeSubClass : inactiveSubClass
              }`}
            >
              <Dna className="h-3.5 w-3.5" />
              <span>Exames & PhenoAge</span>
            </button>

            <button
              onClick={() => handleTabClick('sleep')}
              aria-current={activeTab === 'sleep' ? 'page' : undefined}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition shrink-0 whitespace-nowrap ${
                activeTab === 'sleep' ? activeSubClass : inactiveSubClass
              }`}
            >
              <Moon className="h-3.5 w-3.5" />
              <span>Sono</span>
            </button>

            <button
              onClick={() => handleTabClick('timeline')}
              aria-current={activeTab === 'timeline' ? 'page' : undefined}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition shrink-0 whitespace-nowrap ${
                activeTab === 'timeline' ? activeSubClass : inactiveSubClass
              }`}
            >
              <History className="h-3.5 w-3.5" />
              <span>Linha do Tempo</span>
            </button>

            <button
              onClick={() => handleTabClick('physical-assessments')}
              aria-current={activeTab === 'physical-assessments' ? 'page' : undefined}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition shrink-0 whitespace-nowrap ${
                activeTab === 'physical-assessments' ? activeSubClass : inactiveSubClass
              }`}
            >
              <Camera className="h-3.5 w-3.5" />
              <span>Avaliações Físicas</span>
            </button>
          </nav>
        </div>
      )}

      {primaryTab === 'interventions' && (
        <div className="max-w-7xl mx-auto pt-0.5 animate-fadeIn">
          <nav aria-label="Sub-navegação de Intervenções" className="flex items-center gap-1 sm:gap-1.5 bg-slate-200/50 dark:bg-slate-950/40 p-1 rounded-xl border border-slate-200/80 dark:border-slate-800/80 overflow-x-auto no-scrollbar">
            <button
              onClick={() => handleTabClick('supplements')}
              aria-current={activeTab === 'supplements' ? 'page' : undefined}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition shrink-0 whitespace-nowrap ${
                activeTab === 'supplements' ? activeSubClass : inactiveSubClass
              }`}
            >
              <Pill className="h-3.5 w-3.5" />
              <span>Suplementos & Hormônios</span>
            </button>

            <button
              onClick={() => handleTabClick('n-of-1')}
              aria-current={activeTab === 'n-of-1' ? 'page' : undefined}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition shrink-0 whitespace-nowrap ${
                activeTab === 'n-of-1' ? activeSubClass : inactiveSubClass
              }`}
            >
              <FlaskConical className="h-3.5 w-3.5" />
              <span>N-of-1 Tests</span>
            </button>
          </nav>
        </div>
      )}

      {primaryTab === 'profile' && (
        <div className="max-w-7xl mx-auto pt-0.5 animate-fadeIn">
          <nav aria-label="Sub-navegação de Perfil" className="flex items-center gap-1 sm:gap-1.5 bg-slate-200/50 dark:bg-slate-950/40 p-1 rounded-xl border border-slate-200/80 dark:border-slate-800/80 overflow-x-auto no-scrollbar">
            <button
              onClick={() => handleTabClick('profile')}
              aria-current={(activeTab === 'profile' || !['integrations', 'system', 'diagnostics'].includes(activeTab)) ? 'page' : undefined}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition shrink-0 whitespace-nowrap ${
                (activeTab === 'profile' || !['integrations', 'system', 'diagnostics'].includes(activeTab)) ? activeSubClass : inactiveSubClass
              }`}
            >
              <User className="h-3.5 w-3.5" />
              <span>Meu Perfil</span>
            </button>

            <button
              onClick={() => handleTabClick('integrations')}
              aria-current={activeTab === 'integrations' ? 'page' : undefined}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition shrink-0 whitespace-nowrap ${
                activeTab === 'integrations' ? activeSubClass : inactiveSubClass
              }`}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Integrações</span>
            </button>

            <button
              onClick={() => handleTabClick('system')}
              aria-current={(activeTab === 'system' || activeTab === 'diagnostics') ? 'page' : undefined}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition shrink-0 whitespace-nowrap ${
                (activeTab === 'system' || activeTab === 'diagnostics') ? activeSubClass : inactiveSubClass
              }`}
            >
              <Activity className="h-3.5 w-3.5" />
              <span>Diagnóstico & Sistema</span>
            </button>
          </nav>
        </div>
      )}
    </header>
  );
};
