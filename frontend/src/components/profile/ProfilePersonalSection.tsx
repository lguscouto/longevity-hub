import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Ruler,
  Scale,
  Target,
  Edit3,
} from 'lucide-react';
import { ProfileData } from './ProfileTypes';
import { StatusBadge, FormField, Input, Select, Button } from '../ui';

export interface ProfilePersonalSectionProps {
  profile: ProfileData;
  onUpdateProfile: (updated: any) => void;
}

export const ProfilePersonalSection: React.FC<ProfilePersonalSectionProps> = ({
  profile,
  onUpdateProfile,
}) => {
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

  return (
    <div className="space-y-6 animate-fadeIn" role="region" aria-label="Dados do Perfil">
      {/* Banner Card Header */}
      <div className="p-6 rounded-radius-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 relative overflow-hidden shadow-xs">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            {/* ds-exception: DSX-008 */}
            <div className="h-20 w-20 rounded-radius-xl bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center text-white text-3xl font-bold shadow-md">
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

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setIsEditing(!isEditing)}
            leftIcon={Edit3}
          >
            {isEditing ? 'Cancelar Edição' : 'Editar Perfil'}
          </Button>
        </div>
      </div>

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

      {/* Edit Profile Form */}
      {isEditing && (
        <div className="p-6 rounded-radius-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/95 shadow-md">
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Edit3 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" /> Editar Informações do Perfil
          </h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <FormField id="profile-name" label="Nome Completo" required>
              <Input
                id="profile-name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </FormField>

            <FormField id="profile-birthdate" label="Data de Nascimento">
              <Input
                id="profile-birthdate"
                type="date"
                value={formData.birthdate}
                onChange={(e) => setFormData({ ...formData, birthdate: e.target.value })}
              />
            </FormField>

            <FormField id="profile-height" label="Altura (cm)">
              <Input
                id="profile-height"
                type="number"
                step="0.5"
                value={formData.height_cm}
                onChange={(e) => setFormData({ ...formData, height_cm: +e.target.value })}
              />
            </FormField>

            <FormField id="profile-current-weight" label="Peso Atual (kg)">
              <Input
                id="profile-current-weight"
                type="number"
                step="0.1"
                value={formData.current_weight_kg}
                onChange={(e) => setFormData({ ...formData, current_weight_kg: e.target.value })}
                placeholder="Ex: 87.0"
              />
            </FormField>

            <FormField id="profile-target-weight" label="Meta de Peso (kg)">
              <Input
                id="profile-target-weight"
                type="number"
                step="0.5"
                value={formData.target_weight_kg}
                onChange={(e) => setFormData({ ...formData, target_weight_kg: +e.target.value })}
              />
            </FormField>

            <FormField id="profile-gender" label="Sexo">
              <Select
                id="profile-gender"
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
              >
                <option value="Masculino">Masculino</option>
                <option value="Feminino">Feminino</option>
              </Select>
            </FormField>

            <div className="md:col-span-2 flex justify-end gap-3 mt-4 border-t border-slate-200 dark:border-slate-800 pt-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
              >
                Salvar Alterações
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
