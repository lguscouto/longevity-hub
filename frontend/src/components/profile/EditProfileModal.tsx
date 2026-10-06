import React, { useState, useEffect } from 'react';
import {
  User,
  HeartPulse,
  Compass,
  Target,
} from 'lucide-react';
import { ProfileData } from './ProfileTypes';
import { Modal, FormField, Input, Select, Button } from '../ui';

export interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: ProfileData;
  onUpdateProfile: (updated: any) => void;
}

type EditTab = 'basic' | 'medical' | 'lifestyle' | 'goals';

const LONGEVITY_GOAL_OPTIONS = [
  { id: 'cardiovascular', label: 'Saúde Cardiovascular (ApoB < 70, VO2 Max alto)' },
  { id: 'hypertrophy', label: 'Hipertrofia & Força Muscular (Prevenção de Sarcopenia)' },
  { id: 'phenoage', label: 'Rejuvenescimento Celular (Redução do PhenoAge)' },
  { id: 'metabolism', label: 'Sensibilidade à Insulina & Otimização Metabólica' },
  { id: 'sleep', label: 'Sono Profundo & Recuperação Autonômica' },
];

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  onClose,
  profile,
  onUpdateProfile,
}) => {
  const [activeTab, setActiveTab] = useState<EditTab>('basic');

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

    // Ficha Médica
    blood_type: profile.medical_id?.blood_type || profile.blood_type || '',
    allergies: profile.medical_id?.allergies || profile.allergies || '',
    family_history: profile.medical_id?.family_history || profile.family_history || '',
    chronic_conditions: profile.medical_id?.chronic_conditions || profile.chronic_conditions || '',
    emergency_contact_name:
      profile.medical_id?.emergency_contact?.name ||
      profile.medical_id?.emergency_contact_name ||
      profile.emergency_contact_name ||
      '',
    emergency_contact_phone:
      profile.medical_id?.emergency_contact?.phone ||
      profile.medical_id?.emergency_contact_phone ||
      profile.emergency_contact_phone ||
      '',
    primary_physician: profile.medical_id?.primary_physician || profile.primary_physician || '',

    // Estilo de Vida
    fasting_window: profile.lifestyle?.fasting_window || profile.fasting_window || '',
    chronotype: profile.lifestyle?.chronotype || profile.chronotype || '',
    daily_water_target_ml:
      profile.lifestyle?.daily_water_target_ml || profile.daily_water_target_ml || 2500,
    target_sleep_hours:
      profile.lifestyle?.target_sleep_hours || profile.target_sleep_hours || 8.0,
    target_body_fat_pct:
      profile.golden_metrics?.target_body_fat_pct ||
      profile.lifestyle?.target_body_fat_pct ||
      profile.target_body_fat_pct ||
      15.0,

    // Metas & Protocolo
    protocol_start_date: profile.protocol?.start_date || profile.protocol_start_date || '',
    longevity_goals:
      profile.protocol?.longevity_goals || profile.longevity_goals || [],
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

      blood_type: profile.medical_id?.blood_type || profile.blood_type || '',
      allergies: profile.medical_id?.allergies || profile.allergies || '',
      family_history: profile.medical_id?.family_history || profile.family_history || '',
      chronic_conditions: profile.medical_id?.chronic_conditions || profile.chronic_conditions || '',
      emergency_contact_name:
        profile.medical_id?.emergency_contact?.name ||
        profile.medical_id?.emergency_contact_name ||
        profile.emergency_contact_name ||
        '',
      emergency_contact_phone:
        profile.medical_id?.emergency_contact?.phone ||
        profile.medical_id?.emergency_contact_phone ||
        profile.emergency_contact_phone ||
        '',
      primary_physician: profile.medical_id?.primary_physician || profile.primary_physician || '',

      fasting_window: profile.lifestyle?.fasting_window || profile.fasting_window || '',
      chronotype: profile.lifestyle?.chronotype || profile.chronotype || '',
      daily_water_target_ml:
        profile.lifestyle?.daily_water_target_ml || profile.daily_water_target_ml || 2500,
      target_sleep_hours:
        profile.lifestyle?.target_sleep_hours || profile.target_sleep_hours || 8.0,
      target_body_fat_pct:
        profile.golden_metrics?.target_body_fat_pct ||
        profile.lifestyle?.target_body_fat_pct ||
        profile.target_body_fat_pct ||
        15.0,

      protocol_start_date: profile.protocol?.start_date || profile.protocol_start_date || '',
      longevity_goals:
        profile.protocol?.longevity_goals || profile.longevity_goals || [],
    });
  }, [profile]);

  const handleGoalToggle = (goalId: string) => {
    const current = formData.longevity_goals || [];
    if (current.includes(goalId)) {
      setFormData({
        ...formData,
        longevity_goals: current.filter((g) => g !== goalId),
      });
    } else {
      setFormData({
        ...formData,
        longevity_goals: [...current, goalId],
      });
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

    if (payload.height_cm) payload.height_cm = Number(payload.height_cm);
    if (payload.target_weight_kg) payload.target_weight_kg = Number(payload.target_weight_kg);
    if (payload.daily_water_target_ml) payload.daily_water_target_ml = Number(payload.daily_water_target_ml);
    if (payload.target_sleep_hours) payload.target_sleep_hours = Number(payload.target_sleep_hours);
    if (payload.target_body_fat_pct) payload.target_body_fat_pct = Number(payload.target_body_fat_pct);

    onUpdateProfile(payload);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="2xl"
      title="Editar Informações do Perfil"
      description="Gerencie seus dados pessoais, ficha médica, estilo de vida e metas de longevidade."
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Seletor de Abas Interno */}
        <div
          role="tablist"
          aria-label="Seções de Edição do Perfil"
          className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-radius-lg border border-slate-200 dark:border-slate-700 overflow-x-auto no-scrollbar"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'basic'}
            onClick={() => setActiveTab('basic')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-radius-md text-xs font-semibold whitespace-nowrap transition ${
              activeTab === 'basic'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <User className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Dados Básicos</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'medical'}
            onClick={() => setActiveTab('medical')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-radius-md text-xs font-semibold whitespace-nowrap transition ${
              activeTab === 'medical'
                ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <HeartPulse className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Ficha Médica</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'lifestyle'}
            onClick={() => setActiveTab('lifestyle')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-radius-md text-xs font-semibold whitespace-nowrap transition ${
              activeTab === 'lifestyle'
                ? 'bg-white dark:bg-slate-900 text-cyan-600 dark:text-cyan-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Compass className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Estilo de Vida</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'goals'}
            onClick={() => setActiveTab('goals')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-radius-md text-xs font-semibold whitespace-nowrap transition ${
              activeTab === 'goals'
                ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Target className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Metas & Protocolo</span>
          </button>
        </div>

        {/* 1. ABA DADOS BÁSICOS */}
        {activeTab === 'basic' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs animate-fadeIn">
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
                placeholder="Ex: 83.9"
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
          </div>
        )}

        {/* 2. ABA FICHA MÉDICA */}
        {activeTab === 'medical' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs animate-fadeIn">
            <FormField id="profile-blood-type" label="Tipo Sanguíneo & Fator Rh">
              <Select
                id="profile-blood-type"
                value={formData.blood_type}
                onChange={(e) => setFormData({ ...formData, blood_type: e.target.value })}
              >
                <option value="">Não informado</option>
                <option value="A+">A+ (Rh Positivo)</option>
                <option value="A-">A- (Rh Negativo)</option>
                <option value="B+">B+ (Rh Positivo)</option>
                <option value="B-">B- (Rh Negativo)</option>
                <option value="AB+">AB+ (Rh Positivo)</option>
                <option value="AB-">AB- (Rh Negativo)</option>
                <option value="O+">O+ (Rh Positivo)</option>
                <option value="O-">O- (Rh Negativo)</option>
              </Select>
            </FormField>

            <FormField id="profile-allergies" label="Alergias & Intolerâncias">
              <Input
                id="profile-allergies"
                type="text"
                value={formData.allergies}
                onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
                placeholder="Ex: Penicilina, Glúten, Frutos do mar"
              />
            </FormField>

            <FormField id="profile-ice-name" label="Contato de Emergência (Nome)">
              <Input
                id="profile-ice-name"
                type="text"
                value={formData.emergency_contact_name}
                onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })}
                placeholder="Ex: Juliana (Esposa)"
              />
            </FormField>

            <FormField id="profile-ice-phone" label="Contato de Emergência (Telefone)">
              <Input
                id="profile-ice-phone"
                type="tel"
                value={formData.emergency_contact_phone}
                onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
                placeholder="Ex: +55 11 98765-4321"
              />
            </FormField>

            <FormField id="profile-family-history" label="Histórico Familiar Relevante">
              <Input
                id="profile-family-history"
                type="text"
                value={formData.family_history}
                onChange={(e) => setFormData({ ...formData, family_history: e.target.value })}
                placeholder="Ex: Doença cardiovascular precoce paterna"
              />
            </FormField>

            <FormField id="profile-physician" label="Médico de Referência">
              <Input
                id="profile-physician"
                type="text"
                value={formData.primary_physician}
                onChange={(e) => setFormData({ ...formData, primary_physician: e.target.value })}
                placeholder="Ex: Dr. Roberto Santos (Cardiologista)"
              />
            </FormField>
          </div>
        )}

        {/* 3. ABA ESTILO DE VIDA */}
        {activeTab === 'lifestyle' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs animate-fadeIn">
            <FormField id="profile-fasting" label="Janela de Jejum Intermitente">
              <Select
                id="profile-fasting"
                value={formData.fasting_window}
                onChange={(e) => setFormData({ ...formData, fasting_window: e.target.value })}
              >
                <option value="">Sem restrição definida</option>
                <option value="12:12">12:12 (Padrão circadiano)</option>
                <option value="14:10">14:10 (Jejum moderado)</option>
                <option value="16:8 (12:00 às 20:00)">16:8 (12:00 às 20:00)</option>
                <option value="18:6">18:6 (Jejum avançado)</option>
                <option value="20:4">20:4 (Warrior Diet)</option>
              </Select>
            </FormField>

            <FormField id="profile-chronotype" label="Cronotipo Circadiano">
              <Select
                id="profile-chronotype"
                value={formData.chronotype}
                onChange={(e) => setFormData({ ...formData, chronotype: e.target.value })}
              >
                <option value="">Não classificado</option>
                <option value="Matutino (Cotovia)">Matutino (Cotovia - acorda cedo com pico matinal)</option>
                <option value="Intermediário Matutino">Intermediário Matutino</option>
                <option value="Intermediário Neutro">Intermediário Neutro</option>
                <option value="Noturno (Coruja)">Noturno (Coruja - pico de alerta no fim do dia)</option>
              </Select>
            </FormField>

            <FormField id="profile-water" label="Meta Diária de Água (ml)">
              <Input
                id="profile-water"
                type="number"
                step="100"
                value={formData.daily_water_target_ml}
                onChange={(e) => setFormData({ ...formData, daily_water_target_ml: +e.target.value })}
                placeholder="Ex: 3200"
              />
            </FormField>

            <FormField id="profile-sleep" label="Meta de Sono Noturno (horas)">
              <Input
                id="profile-sleep"
                type="number"
                step="0.5"
                value={formData.target_sleep_hours}
                onChange={(e) => setFormData({ ...formData, target_sleep_hours: +e.target.value })}
                placeholder="Ex: 8.0"
              />
            </FormField>

            <FormField id="profile-body-fat" label="Meta de Gordura Corporal (%)">
              <Input
                id="profile-body-fat"
                type="number"
                step="0.5"
                value={formData.target_body_fat_pct}
                onChange={(e) => setFormData({ ...formData, target_body_fat_pct: +e.target.value })}
                placeholder="Ex: 15.0"
              />
            </FormField>
          </div>
        )}

        {/* 4. ABA METAS & PROTOCOLO */}
        {activeTab === 'goals' && (
          <div className="space-y-4 text-xs animate-fadeIn">
            <FormField id="profile-protocol-start" label="Data de Início do Protocolo">
              <Input
                id="profile-protocol-start"
                type="date"
                value={formData.protocol_start_date}
                onChange={(e) => setFormData({ ...formData, protocol_start_date: e.target.value })}
              />
            </FormField>

            <div>
              <span className="font-semibold text-slate-800 dark:text-slate-200 block mb-2">
                Metas Prioritárias de Longevidade (Selecione até 3 principais):
              </span>
              <div className="space-y-2">
                {LONGEVITY_GOAL_OPTIONS.map((goal) => {
                  const isChecked = (formData.longevity_goals || []).includes(goal.id);
                  return (
                    <label
                      key={goal.id}
                      className={`flex items-center gap-2.5 p-3 rounded-radius-lg border cursor-pointer transition ${
                        isChecked
                          ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 text-slate-900 dark:text-white'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleGoalToggle(goal.id)}
                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                      />
                      <span className="font-medium">{goal.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Rodapé com Ações */}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
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
    </Modal>
  );
};
