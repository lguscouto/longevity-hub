import React from 'react';
import { Activity, ShieldCheck, RefreshCw, FileText, PlusCircle, Dna, FlaskConical, Stethoscope, User, Sparkles, Settings, Pill, Camera, Moon, Dumbbell } from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
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
  onSyncZepp,
  onSyncGoogleHealth,
  onOpenManualEntry,
  onOpenDoctorBriefing,
  onOpenAISettings,
  isSyncing,
  isSyncingGoogle = false,
}) => {
  const inactiveBtnClass = "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/80 dark:hover:bg-slate-800/50 transition";

  return (
    <header className="sticky top-0 z-40 glass-panel border-b border-slate-200/80 dark:border-slate-800 px-3.5 sm:px-6 py-2.5 sm:py-3 mb-4 sm:mb-8 space-y-2.5">
      {/* Linha Superior: Marca e Ações Rápidas */}
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Brand */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center text-white glow-emerald shrink-0">
              <Activity className="h-5 w-5 sm:h-6 sm:w-6 animate-pulse" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold tracking-tight bg-gradient-to-r from-slate-900 via-slate-700 to-emerald-600 dark:from-white dark:via-slate-200 dark:to-emerald-400 bg-clip-text text-transparent flex items-center gap-1.5">
                LONGEVIDADE <span className="text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">BLUEPRINT</span>
              </h1>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium truncate">Hub de Inteligência de Saúde & Epigenética Local</p>
            </div>
          </div>
        </div>

        {/* Actions - Ações rápidas sempre visíveis */}
        <div className="flex items-center flex-wrap justify-center md:justify-end gap-2 w-full md:w-auto">
          <button
            onClick={onOpenAISettings}
            className="p-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shadow-sm transition shrink-0"
            title="Configurações de IA e Chaves de API"
          >
            <Settings className="h-4 w-4" />
          </button>

          <button
            onClick={onOpenManualEntry}
            className="flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-sm transition shrink-0"
          >
            <PlusCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /> Registrar
          </button>

          <button
            onClick={onOpenDoctorBriefing}
            className="flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-xl text-xs font-semibold bg-cyan-50 dark:bg-cyan-950/40 hover:bg-cyan-100 dark:hover:bg-cyan-900/60 text-cyan-800 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800/60 shadow-sm transition shrink-0"
          >
            <Stethoscope className="h-4 w-4 text-cyan-600 dark:text-cyan-400" /> Doctor Briefing
          </button>

          {onSyncGoogleHealth && (
            <button
              onClick={onSyncGoogleHealth}
              disabled={isSyncingGoogle}
              title="Sincronizar Google Health API v4 / Pixel Watch / Health Connect"
              className="flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white transition shadow-md disabled:opacity-50 shrink-0"
            >
              <RefreshCw className={`h-4 w-4 ${isSyncingGoogle ? 'animate-spin' : ''}`} />
              {isSyncingGoogle ? 'Sync Google...' : 'Sync Google'}
            </button>
          )}

          <button
            onClick={onSyncZepp}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 transition glow-emerald disabled:opacity-50 shadow-md shrink-0"
          >
            <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Sincronizando...' : 'Sync Zepp'}
          </button>
        </div>
      </div>

      {/* Linha Inferior: Barra de Navegação Dedicada (Todas as 9 Abas) */}
      <div className="max-w-7xl mx-auto overflow-x-auto no-scrollbar py-0.5">
        <nav className="flex items-center gap-1 sm:gap-1.5 bg-slate-100/90 dark:bg-slate-900/60 p-1 sm:p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 w-max min-w-full">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-medium transition-all shrink-0 whitespace-nowrap ${
              activeTab === 'overview'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md'
                : inactiveBtnClass
            }`}
          >
            <Activity className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Visão Geral
          </button>
          <button
            onClick={() => setActiveTab('workouts')}
            className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-medium transition-all shrink-0 whitespace-nowrap ${
              activeTab === 'workouts'
                ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-md font-bold'
                : inactiveBtnClass
            }`}
          >
            <Dumbbell className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Treinos
          </button>
          <button
            onClick={() => setActiveTab('labs')}
            className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-medium transition-all shrink-0 whitespace-nowrap ${
              activeTab === 'labs'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md'
                : inactiveBtnClass
            }`}
          >
            <Dna className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Exames & PhenoAge
          </button>
          <button
            onClick={() => setActiveTab('supplements')}
            className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-medium transition-all shrink-0 whitespace-nowrap ${
              activeTab === 'supplements'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md font-bold'
                : inactiveBtnClass
            }`}
          >
            <Pill className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Suplementos & Hormônios
          </button>
          <button
            onClick={() => setActiveTab('sleep')}
            className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-medium transition-all shrink-0 whitespace-nowrap ${
              activeTab === 'sleep'
                ? 'bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-500 text-white shadow-md font-bold'
                : inactiveBtnClass
            }`}
          >
            <Moon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-indigo-400" /> Sono
          </button>
          <button
            onClick={() => setActiveTab('ai')}
            className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-medium transition-all shrink-0 whitespace-nowrap ${
              activeTab === 'ai'
                ? 'bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600 text-white shadow-md font-bold glow-cyan'
                : 'text-cyan-700 dark:text-cyan-400 hover:text-cyan-900 dark:hover:text-cyan-200 hover:bg-cyan-50 dark:hover:bg-slate-800/50 font-medium'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> IA & Copiloto
          </button>
          <button
            onClick={() => setActiveTab('n-of-1')}
            className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-medium transition-all shrink-0 whitespace-nowrap ${
              activeTab === 'n-of-1'
                ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-md'
                : inactiveBtnClass
            }`}
          >
            <FlaskConical className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> N-of-1 Tests
          </button>
          <button
            onClick={() => setActiveTab('physical-assessments')}
            className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-medium transition-all shrink-0 whitespace-nowrap ${
              activeTab === 'physical-assessments'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md'
                : inactiveBtnClass
            }`}
          >
            <Camera className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Avaliações Físicas
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-medium transition-all shrink-0 whitespace-nowrap ${
              activeTab === 'profile'
                ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md'
                : inactiveBtnClass
            }`}
          >
            <User className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Perfil
          </button>
        </nav>
      </div>
    </header>
  );
};
