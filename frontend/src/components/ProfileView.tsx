import React, { useState, useEffect } from 'react';
import {
  User,
  ShieldCheck,
  Activity,
} from 'lucide-react';
import {
  ProfileData,
  ProfileSubTab,
  ProfileViewProps,
} from './profile/ProfileTypes';
import { ProfilePersonalSection } from './profile/ProfilePersonalSection';
import { ProfileIntegrationsSection } from './profile/ProfileIntegrationsSection';
import { ProfileSystemSection } from './profile/ProfileSystemSection';

export type { ProfileData, ProfileSubTab, ProfileViewProps };

const PROFILE_SUBTAB_STORAGE_KEY = 'longevidade:profile_subtab:v1';

function getStoredSubTab(defaultValue: ProfileSubTab): ProfileSubTab {
  try {
    const stored = localStorage.getItem(PROFILE_SUBTAB_STORAGE_KEY);
    if (stored === 'profile' || stored === 'integrations' || stored === 'system') {
      return stored;
    }
  } catch {
    // Ignore storage access errors in private/sandboxed environments
  }
  return defaultValue;
}

function setStoredSubTab(tab: ProfileSubTab) {
  try {
    localStorage.setItem(PROFILE_SUBTAB_STORAGE_KEY, tab);
  } catch {
    // Ignore storage access errors
  }
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  profile,
  onUpdateProfile,
  pipelineRuns = [],
  pipelineLoading = false,
  onRefreshPipeline = () => {},
  historySectionRef,
  onOpenGoogleHealthModal,
  activeSubTab,
  onSelectSubTab,
  onSyncZepp,
  isSyncingZepp = false,
  onSyncGoogleHealth,
  isSyncingGoogle = false,
  onOpenAISettings,
}) => {
  const [internalSubTab, setInternalSubTab] = useState<ProfileSubTab>(() =>
    activeSubTab || getStoredSubTab('profile')
  );

  useEffect(() => {
    if (activeSubTab) {
      setInternalSubTab(activeSubTab);
      setStoredSubTab(activeSubTab);
    }
  }, [activeSubTab]);

  const handleSubTabChange = (tab: ProfileSubTab) => {
    setInternalSubTab(tab);
    setStoredSubTab(tab);
    if (onSelectSubTab) {
      onSelectSubTab(tab);
    }
  };

  return (
    <div className="space-y-6">
      {/* Seletor Segmentado de Sub-Áreas com Semântica de Abas (U22-P1-67..70) */}
      <div
        role="tablist"
        aria-label="Sub-navegação de Perfil e Configurações"
        className="flex items-center gap-1 sm:gap-2 p-1 bg-slate-100/90 dark:bg-slate-900/80 rounded-radius-xl border border-slate-200 dark:border-slate-800 w-full sm:w-fit overflow-x-auto no-scrollbar"
      >
        <button
          type="button"
          role="tab"
          id="tab-profile-personal"
          aria-controls="panel-profile-personal"
          aria-selected={internalSubTab === 'profile'}
          onClick={() => handleSubTabChange('profile')}
          className={`flex items-center justify-center gap-1.5 px-3.5 py-1.5 min-h-[36px] rounded-radius-lg text-xs font-semibold transition shrink-0 whitespace-nowrap focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none ${
            internalSubTab === 'profile'
              ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 shadow-xs border border-slate-200 dark:border-slate-700'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <User className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Meu Perfil</span>
        </button>

        <button
          type="button"
          role="tab"
          id="tab-profile-integrations"
          aria-controls="panel-profile-integrations"
          aria-selected={internalSubTab === 'integrations'}
          onClick={() => handleSubTabChange('integrations')}
          className={`flex items-center justify-center gap-1.5 px-3.5 py-1.5 min-h-[36px] rounded-radius-lg text-xs font-semibold transition shrink-0 whitespace-nowrap focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none ${
            internalSubTab === 'integrations'
              ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 shadow-xs border border-slate-200 dark:border-slate-700'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Integrações</span>
        </button>

        <button
          type="button"
          role="tab"
          id="tab-profile-system"
          aria-controls="panel-profile-system"
          aria-selected={internalSubTab === 'system'}
          onClick={() => handleSubTabChange('system')}
          className={`flex items-center justify-center gap-1.5 px-3.5 py-1.5 min-h-[36px] rounded-radius-lg text-xs font-semibold transition shrink-0 whitespace-nowrap focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none ${
            internalSubTab === 'system'
              ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 shadow-xs border border-slate-200 dark:border-slate-700'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Activity className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Diagnóstico e Sistema</span>
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          1. SUB-ÁREA: MEU PERFIL (Dados Pessoais & Metas)
      ───────────────────────────────────────────────────────────── */}
      {internalSubTab === 'profile' && (
        <div id="panel-profile-personal" role="tabpanel" aria-labelledby="tab-profile-personal">
          <ProfilePersonalSection
            profile={profile}
            onUpdateProfile={onUpdateProfile}
          />
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          2. SUB-ÁREA: INTEGRAÇÕES (Zepp OS, Google Health, Hevy)
      ───────────────────────────────────────────────────────────── */}
      {internalSubTab === 'integrations' && (
        <div id="panel-profile-integrations" role="tabpanel" aria-labelledby="tab-profile-integrations">
          <ProfileIntegrationsSection
            profile={profile}
            onOpenGoogleHealthModal={onOpenGoogleHealthModal}
            onSyncZepp={onSyncZepp}
            isSyncingZepp={isSyncingZepp}
            onSyncGoogleHealth={onSyncGoogleHealth}
            isSyncingGoogle={isSyncingGoogle}
          />
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          3. SUB-ÁREA: DIAGNÓSTICO & SISTEMA (Qualidade, Pipeline, IA)
      ───────────────────────────────────────────────────────────── */}
      {internalSubTab === 'system' && (
        <div id="panel-profile-system" role="tabpanel" aria-labelledby="tab-profile-system">
          <ProfileSystemSection
            pipelineRuns={pipelineRuns}
            pipelineLoading={pipelineLoading}
            onRefreshPipeline={onRefreshPipeline}
            historySectionRef={historySectionRef}
            onOpenAISettings={onOpenAISettings}
          />
        </div>
      )}
    </div>
  );
};
