import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Ruler,
  Scale,
  Target,
  Edit3,
} from 'lucide-react';
import { ProfileData } from './ProfileTypes';
import { ProfileHeroCard } from './ProfileHeroCard';
import { BiologicalAgeSnapshotCard } from './BiologicalAgeSnapshotCard';
import { GoldenBiomarkersGrid } from './GoldenBiomarkersGrid';
import { MedicalIdCard } from './MedicalIdCard';
import { LifestyleArchitectureCard } from './LifestyleArchitectureCard';
import { EditProfileModal } from './EditProfileModal';

export interface ProfilePersonalSectionProps {
  profile: ProfileData;
  onUpdateProfile: (updated: any) => void;
  onOpenDoctorBriefing?: () => void;
}

export const ProfilePersonalSection: React.FC<ProfilePersonalSectionProps> = ({
  profile,
  onUpdateProfile,
  onOpenDoctorBriefing,
}) => {
  const [isEditing, setIsEditing] = useState(false);

  const heightInMeters = profile.height_cm
    ? (profile.height_cm / 100).toFixed(2)
    : '0.00';
  const currentWeight = profile.current_weight_kg;

  return (
    <div className="space-y-6 animate-fadeIn" role="region" aria-label="Dados do Perfil">
      {/* Banner Card Header com Protocolo e Metas */}
      <ProfileHeroCard
        profile={profile}
        isEditing={isEditing}
        onToggleEdit={() => setIsEditing(!isEditing)}
        onOpenDoctorBriefing={onOpenDoctorBriefing}
      />

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {/* Idade */}
        <div className="p-5 rounded-radius-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Idade Cronológica
            </span>
            <div className="p-2 rounded-radius-md bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
              <Calendar className="h-5 w-5" aria-hidden="true" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white">
            {profile.chronological_age} <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">anos</span>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 mt-2 block">Nascimento: {profile.birthdate}</span>
        </div>

        {/* Altura */}
        <div className="p-5 rounded-radius-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Altura
            </span>
            <div className="p-2 rounded-radius-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Ruler className="h-5 w-5" aria-hidden="true" />
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
        <div className="p-5 rounded-radius-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Peso Atual
            </span>
            <div className="p-2 rounded-radius-md bg-violet-500/10 text-violet-600 dark:text-violet-400">
              <Scale className="h-5 w-5" aria-hidden="true" />
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
        <div className="p-5 rounded-radius-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Meta de Peso
            </span>
            <div className="p-2 rounded-radius-md bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Target className="h-5 w-5" aria-hidden="true" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-amber-600 dark:text-amber-400">
            {profile.target_weight_kg} <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">kg</span>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 mt-2 block">Meta Longevidade Protocol</span>
        </div>
      </div>

      {/* Snapshot de Idade Biológica (PhenoAge) */}
      <BiologicalAgeSnapshotCard
        biologicalAge={profile.biological_age}
        chronologicalAge={profile.chronological_age}
      />

      {/* Grade de Biomarcadores Padrão-Ouro (Pilares de Longevidade) */}
      <GoldenBiomarkersGrid
        goldenMetrics={profile.golden_metrics}
        heightCm={profile.height_cm}
        currentWeightKg={profile.current_weight_kg}
      />

      {/* Grade Dupla: Ficha Médica (Medical ID) e Estilo de Vida */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <MedicalIdCard
          medicalId={profile.medical_id}
          bloodTypeDirect={profile.blood_type}
          allergiesDirect={profile.allergies}
        />
        <LifestyleArchitectureCard
          lifestyle={profile.lifestyle}
          fastingWindowDirect={profile.fasting_window}
          chronotypeDirect={profile.chronotype}
          waterTargetDirect={profile.daily_water_target_ml}
          sleepTargetDirect={profile.target_sleep_hours}
          targetBodyFatDirect={profile.target_body_fat_pct}
        />
      </div>

      {/* Modal de Edição Estruturado em Abas */}
      {isEditing && (
        <EditProfileModal
          isOpen={isEditing}
          onClose={() => setIsEditing(false)}
          profile={profile}
          onUpdateProfile={onUpdateProfile}
        />
      )}
    </div>
  );
};
