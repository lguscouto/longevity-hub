import React, { useState, useEffect } from 'react';
import {
  User,
  Calendar,
  Ruler,
  Scale,
  Target,
  ShieldCheck,
  Edit3,
  Activity,
  RefreshCw,
  Dumbbell,
  CheckCircle2,
  AlertTriangle,
  Database,
  Lock,
  ChevronRight,
} from 'lucide-react';
import { PipelineStatusPanel, PipelineRun } from './PipelineStatusPanel';
import { DataQualityPanel } from './DataQualityPanel';
import { StatusBadge } from './ui';

export type ProfileSubTab = 'profile' | 'integrations' | 'system';

interface ProfileData {
  name: string;
  email: string;
  birthdate: string;
  chronological_age: number;
  height_cm: number;
  current_weight_kg?: number;
  target_weight_kg: number;
  bmi?: number;
  gender: string;
  google_connected: boolean;
  source: string;
}

interface ProfileViewProps {
  profile: ProfileData;
  onUpdateProfile: (updated: any) => void;
  pipelineRuns?: PipelineRun[];
  pipelineLoading?: boolean;
  onRefreshPipeline?: () => void;
  historySectionRef?: React.Ref<HTMLDivElement>;
  onOpenGoogleHealthModal?: () => void;
  activeSubTab?: ProfileSubTab;
  onSelectSubTab?: (subTab: ProfileSubTab) => void;
  onSyncZepp?: (full?: boolean) => void;
  isSyncingZepp?: boolean;
  onSyncGoogleHealth?: () => void;
  isSyncingGoogle?: boolean;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  profile,
  onUpdateProfile,
  pipelineRuns = [],
  pipelineLoading = false,
  onRefreshPipeline = () => {},
  historySectionRef,
  onOpenGoogleHealthModal,
  activeSubTab = 'profile',
  onSelectSubTab,
  onSyncZepp,
  isSyncingZepp = false,
  onSyncGoogleHealth,
  isSyncingGoogle = false,
}) => {
  const [internalSubTab, setInternalSubTab] = useState<ProfileSubTab>(activeSubTab);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: profile.name || '',
    birthdate: profile.birthdate || '',
    height_cm: profile.height_cm || 0,
    current_weight_kg:
      profile.current_weight_kg !== undefined && profile.current_weight_kg !== null
        ? String(profile.current_weight_kg)
        : '',
    target_weight_kg: profile.target_weight_kg || 0,
    gender: profile.gender || 'Masculino',
  });

  useEffect(() => {
    if (activeSubTab) {
      setInternalSubTab(activeSubTab);
    }
  }, [activeSubTab]);

  useEffect(() => {
    setFormData({
      name: profile.name || '',
      birthdate: profile.birthdate || '',
      height_cm: profile.height_cm || 0,
      current_weight_kg:
        profile.current_weight_kg !== undefined && profile.current_weight_kg !== null
          ? String(profile.current_weight_kg)
          : '',
      target_weight_kg: profile.target_weight_kg || 0,
      gender: profile.gender || 'Masculino',
    });
  }, [profile]);

  const handleSubTabChange = (tab: ProfileSubTab) => {
    setInternalSubTab(tab);
    if (onSelectSubTab) {
      onSelectSubTab(tab);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = { ...formData };
    if (payload.current_weight_kg === '' || isNaN(Number(payload.current_weight_kg))) {
      delete payload.current_weight_kg;
    } else {
      payload.current_weight_kg = Number(payload.current_weight_kg);
    }
    onUpdateProfile(payload);
    setIsEditing(false);
  };

  const heightInMeters = formData.height_cm
    ? (formData.height_cm / 100).toFixed(2)
    : profile.height_cm
    ? (profile.height_cm / 100).toFixed(2)
    : '0.00';
  const currentWeight = profile.current_weight_kg;

  const inputClass =
    'w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-slate-900 dark:text-white font-medium focus:border-emerald-500 focus:outline-none';

  return (
    <div className="space-y-6">
      {/* Seletor Segmentado de Sub-Áreas */}
      <div className="flex items-center gap-1 sm:gap-2 p-1 bg-slate-100/90 dark:bg-slate-900/80 rounded-2xl border border-slate-200 dark:border-slate-800 w-full sm:w-fit overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => handleSubTabChange('profile')}
          className={`flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition shrink-0 whitespace-nowrap focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none ${
            internalSubTab === 'profile'
              ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 shadow-xs border border-slate-200 dark:border-slate-700'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <User className="h-3.5 w-3.5" />
          <span>Meu Perfil</span>
        </button>

        <button
          type="button"
          onClick={() => handleSubTabChange('integrations')}
          className={`flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition shrink-0 whitespace-nowrap focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none ${
            internalSubTab === 'integrations'
              ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 shadow-xs border border-slate-200 dark:border-slate-700'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>Integrações</span>
        </button>

        <button
          type="button"
          onClick={() => handleSubTabChange('system')}
          className={`flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition shrink-0 whitespace-nowrap focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none ${
            internalSubTab === 'system'
              ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 shadow-xs border border-slate-200 dark:border-slate-700'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Activity className="h-3.5 w-3.5" />
          <span>Diagnóstico & Sistema</span>
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          1. SUB-ÁREA: MEU PERFIL (Dados Pessoais & Metas)
      ───────────────────────────────────────────────────────────── */}
      {internalSubTab === 'profile' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Banner Card Header */}
          <div className="glass-panel p-6 rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-slate-100 via-slate-100 to-emerald-500/10 dark:from-slate-900 dark:via-slate-900 dark:to-emerald-950/40 relative overflow-hidden shadow-sm">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-5">
                <div className="h-20 w-20 rounded-2xl bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center text-white text-3xl font-bold shadow-xl glow-emerald">
                  {profile.name ? profile.name[0].toUpperCase() : 'P'}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">{profile.name}</h2>
                    <StatusBadge variant="success" dot>
                      Protocolo Ativo
                    </StatusBadge>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    {profile.email} • Perfil do Longevidade Hub
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsEditing(!isEditing)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-700 transition shadow-md focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
              >
                <Edit3 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                {isEditing ? 'Cancelar Edição' : 'Editar Perfil'}
              </button>
            </div>
          </div>

          {/* Main Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {/* Idade */}
            <div className="glass-card p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Idade Cronológica
                </span>
                <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                  <Calendar className="h-5 w-5" />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-slate-900 dark:text-white">
                {profile.chronological_age} <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">anos</span>
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400 mt-2 block">Nascimento: {profile.birthdate}</span>
            </div>

            {/* Altura */}
            <div className="glass-card p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Altura
                </span>
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <Ruler className="h-5 w-5" />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
                {profile.height_cm}{' '}
                <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                  cm ({heightInMeters} m)
                </span>
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400 mt-2 block">Sexo: {profile.gender || 'Não informado'}</span>
            </div>

            {/* Peso Atual */}
            <div className="glass-card p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Peso Atual
                </span>
                <div className="p-2 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
                  <Scale className="h-5 w-5" />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-violet-700 dark:text-violet-300">
                {currentWeight ? `${currentWeight} kg` : '(Sem dados)'}
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400 mt-2 block">
                {profile.bmi ? `IMC: ${profile.bmi} kg/m²` : 'Sem IMC calculado'}
              </span>
            </div>

            {/* Meta de Peso */}
            <div className="glass-card p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Meta de Peso
                </span>
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <Target className="h-5 w-5" />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-amber-600 dark:text-amber-400">
                {profile.target_weight_kg} <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">kg</span>
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400 mt-2 block">Meta Longevidade Protocol</span>
            </div>
          </div>

          {/* Edit Profile Form */}
          {isEditing && (
            <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 shadow-dialog">
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <Edit3 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" /> Editar Informações do Perfil
              </h3>
              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">Nome Completo</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">Data de Nascimento</label>
                  <input
                    type="date"
                    value={formData.birthdate}
                    onChange={(e) => setFormData({ ...formData, birthdate: e.target.value })}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">Altura (cm)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={formData.height_cm}
                    onChange={(e) => setFormData({ ...formData, height_cm: +e.target.value })}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">Peso Atual (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.current_weight_kg}
                    onChange={(e) => setFormData({ ...formData, current_weight_kg: e.target.value })}
                    className={inputClass}
                    placeholder="Ex: 87.0"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">Meta de Peso (kg)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={formData.target_weight_kg}
                    onChange={(e) => setFormData({ ...formData, target_weight_kg: +e.target.value })}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">Sexo</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className={inputClass}
                  >
                    <option value="Masculino">Masculino</option>
                    <option value="Feminino">Feminino</option>
                  </select>
                </div>

                <div className="md:col-span-2 flex justify-end gap-3 mt-4">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold border border-slate-200 dark:border-slate-700 transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold glow-emerald transition shadow-md"
                  >
                    Salvar Alterações
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          2. SUB-ÁREA: INTEGRAÇÕES (Zepp OS, Google Health, Hevy)
      ───────────────────────────────────────────────────────────── */}
      {internalSubTab === 'integrations' && (
        <div className="space-y-6 animate-fadeIn">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              Fontes de Dados & Wearables Conectados
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Conecte sensores e dispositivos para sincronizar métricas de frequência cardíaca, sono e recuperação.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Card Zepp OS */}
            <div className="glass-card p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      <Activity className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">Zepp OS (Amazfit)</h4>
                      <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                        ● Coleta de Sensores Ativa
                      </span>
                    </div>
                  </div>
                  <StatusBadge variant="success">Conectado</StatusBadge>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mb-4 leading-relaxed">
                  Proveniência primária para Frequência Cardíaca de Repouso (RHR), Variabilidade (HRV), estágios de sono e passos.
                </p>
              </div>

              <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                {onSyncZepp && (
                  <button
                    type="button"
                    onClick={() => onSyncZepp(false)}
                    disabled={isSyncingZepp}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition shadow-xs disabled:opacity-50"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isSyncingZepp ? 'animate-spin' : ''}`} />
                    <span>{isSyncingZepp ? 'Sincronizando...' : 'Sync Zepp'}</span>
                  </button>
                )}
                {onSyncZepp && (
                  <button
                    type="button"
                    onClick={() => onSyncZepp(true)}
                    disabled={isSyncingZepp}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition disabled:opacity-50"
                  >
                    <span>Full Sync Zepp</span>
                  </button>
                )}
              </div>
            </div>

            {/* Card Google Health Connect */}
            <div className="glass-card p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">Google Health API v4</h4>
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        Pixel Watch & Health Connect
                      </span>
                    </div>
                  </div>
                  {profile.google_connected ? (
                    <StatusBadge variant="success">Conectado</StatusBadge>
                  ) : (
                    <StatusBadge variant="neutral">Não Conectado</StatusBadge>
                  )}
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mb-4 leading-relaxed">
                  Sincronização de biomarcadores adicionais, agregação de wearables Android e redundância de séries temporais.
                </p>
              </div>

              <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                {profile.google_connected ? (
                  <>
                    {onSyncGoogleHealth && (
                      <button
                        type="button"
                        onClick={onSyncGoogleHealth}
                        disabled={isSyncingGoogle}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition shadow-xs disabled:opacity-50"
                      >
                        <RefreshCw className={`h-3.5 w-3.5 ${isSyncingGoogle ? 'animate-spin' : ''}`} />
                        <span>{isSyncingGoogle ? 'Sincronizando...' : 'Sync Google'}</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={onOpenGoogleHealthModal}
                      className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition"
                    >
                      Configurações Google
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={onOpenGoogleHealthModal}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition shadow-xs"
                  >
                    <span>+ Conectar Google Health</span>
                  </button>
                )}
              </div>
            </div>

            {/* Card Hevy */}
            <div className="glass-card p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-between md:col-span-2">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
                      <Dumbbell className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">Hevy (Treinos de Força)</h4>
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        Cargas, séries e volume muscular
                      </span>
                    </div>
                  </div>
                  <StatusBadge variant="info">API Ativa</StatusBadge>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mb-4 leading-relaxed">
                  Importação contínua de treinos de musculação e hipertrofia para cálculo de carga crônica e manutenção da massa magra.
                </p>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                <span className="text-slate-500 dark:text-slate-400">Gerenciado nas Configurações Centrais</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Pronto para sincronização
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          3. SUB-ÁREA: DIAGNÓSTICO & SISTEMA (Qualidade & Pipeline)
      ───────────────────────────────────────────────────────────── */}
      {internalSubTab === 'system' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Card de Infraestrutura Local-First */}
          <div className="glass-card p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <Database className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">Base de Dados SQLite Local</h4>
                    <StatusBadge variant="success">Local-First OK</StatusBadge>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Banco de dados residente em <code>longevidade.db</code> com criptografia e isolamento local.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800/80 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700">
                <Lock className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span>Privacidade Soberana: Zero Telemetria Externa</span>
              </div>
            </div>
          </div>

          {/* Auditoria de Qualidade e Cobertura dos Dados */}
          <div>
            <DataQualityPanel />
          </div>

          {/* Histórico de Sincronizações na parte de baixo do perfil */}
          <div ref={historySectionRef}>
            <PipelineStatusPanel
              runs={pipelineRuns}
              loading={pipelineLoading}
              onRefresh={onRefreshPipeline}
            />
          </div>
        </div>
      )}
    </div>
  );
};
