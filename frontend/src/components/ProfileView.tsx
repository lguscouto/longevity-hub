import React, { useState } from 'react';
import { User, Calendar, Ruler, Scale, Target, ShieldCheck, Edit3, Save, CheckCircle2, Activity } from 'lucide-react';
import { PipelineStatusPanel, PipelineRun } from './PipelineStatusPanel';
import { DataQualityPanel } from './DataQualityPanel';

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
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  profile,
  onUpdateProfile,
  pipelineRuns = [],
  pipelineLoading = false,
  onRefreshPipeline = () => {},
  historySectionRef,
  onOpenGoogleHealthModal,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: profile.name || 'Paciente Longevidade',
    birthdate: profile.birthdate || '1986-07-28',
    height_cm: profile.height_cm || 178,
    target_weight_kg: profile.target_weight_kg || 75,
    gender: profile.gender || 'Masculino'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile(formData);
    setIsEditing(false);
  };

  const heightInMeters = (formData.height_cm / 100).toFixed(2);
  const currentWeight = profile.current_weight_kg;

  const inputClass = "w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-slate-900 dark:text-white font-medium focus:border-emerald-500 focus:outline-none";

  return (
    <div className="space-y-6">
      {/* Banner Card Header */}
      <div className="glass-panel p-6 rounded-3xl border border-emerald-500/30 bg-gradient-to-r from-slate-100 via-slate-100 to-emerald-500/10 dark:from-slate-900 dark:via-slate-900 dark:to-emerald-950/40 relative overflow-hidden shadow-sm">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="h-20 w-20 rounded-2xl bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center text-white text-3xl font-bold shadow-xl glow-emerald">
              {profile.name ? profile.name[0].toUpperCase() : 'P'}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">{profile.name}</h2>
                {profile.google_connected ? (
                  <button
                    type="button"
                    onClick={onOpenGoogleHealthModal}
                    className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 transition cursor-pointer"
                  >
                    <ShieldCheck className="h-3.5 w-3.5" /> Google Health API Conectado
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onOpenGoogleHealthModal}
                    className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-blue-500/10 hover:bg-blue-500/20 text-blue-700 dark:text-blue-400 border border-blue-500/30 transition cursor-pointer"
                  >
                    + Conectar Google Health
                  </button>
                )}
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{profile.email} • Perfil do Longevidade Hub</p>
            </div>
          </div>

          <button
            onClick={() => setIsEditing(!isEditing)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-700 transition shadow-md"
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
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Idade Cronológica</span>
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
              <Calendar className="h-5 w-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white">
            {profile.chronological_age} <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">anos</span>
          </div>
          <span className="text-[10px] text-slate-500 mt-2 block">Nascimento: {profile.birthdate}</span>
        </div>

        {/* Altura */}
        <div className="glass-card p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Altura</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Ruler className="h-5 w-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
            {profile.height_cm} <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">cm ({heightInMeters} m)</span>
          </div>
          <span className="text-[10px] text-slate-500 mt-2 block">Sexo: {profile.gender || 'Não informado'}</span>
        </div>

        {/* Peso Atual */}
        <div className="glass-card p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Peso Atual</span>
            <div className="p-2 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
              <Scale className="h-5 w-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-violet-700 dark:text-violet-300">
            {currentWeight ? `${currentWeight} kg` : '(Sem dados)'}
          </div>
          <span className="text-[10px] text-slate-500 mt-2 block">
            {profile.bmi ? `IMC: ${profile.bmi} kg/m²` : 'Sem IMC calculado'}
          </span>
        </div>

        {/* Meta de Peso */}
        <div className="glass-card p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Meta de Peso</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Target className="h-5 w-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-amber-600 dark:text-amber-400">
            {profile.target_weight_kg} <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">kg</span>
          </div>
          <span className="text-[10px] text-slate-500 mt-2 block">Meta Longevidade Protocol</span>
        </div>
      </div>

      {/* Edit Profile Form */}
      {isEditing && (
        <div className="glass-panel p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 shadow-2xl">
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Edit3 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" /> Editar Informações do Perfil
          </h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">Nome Completo</label>
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">Data de Nascimento</label>
              <input
                type="date"
                value={formData.birthdate}
                onChange={e => setFormData({ ...formData, birthdate: e.target.value })}
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">Altura (cm)</label>
              <input
                type="number"
                step="0.5"
                value={formData.height_cm}
                onChange={e => setFormData({ ...formData, height_cm: +e.target.value })}
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">Meta de Peso (kg)</label>
              <input
                type="number"
                step="0.5"
                value={formData.target_weight_kg}
                onChange={e => setFormData({ ...formData, target_weight_kg: +e.target.value })}
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">Sexo</label>
              <select
                value={formData.gender}
                onChange={e => setFormData({ ...formData, gender: e.target.value })}
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

      {/* Auditoria de Qualidade e Cobertura dos Dados */}
      <div className="pt-4">
        <DataQualityPanel />
      </div>

      {/* Histórico de Sincronizações na parte de baixo do perfil */}
      <div ref={historySectionRef} className="pt-4">
        <PipelineStatusPanel
          runs={pipelineRuns}
          loading={pipelineLoading}
          onRefresh={onRefreshPipeline}
        />
      </div>
    </div>
  );
};
