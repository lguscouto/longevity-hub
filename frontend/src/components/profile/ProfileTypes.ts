import React from 'react';
import { PipelineRun } from '../PipelineStatusPanel';

export type ProfileSubTab = 'profile' | 'integrations' | 'system';

export interface ProtocolInfo {
  status: string;
  start_date?: string;
  streak_days?: number | null;
  longevity_goals?: string[];
}

export interface BiologicalAgeInfo {
  calculated_at?: string;
  biological_age?: number | null;
  chronological_age?: number | null;
  age_delta?: number | null;
  pace_of_aging?: number | null;
  status?: string;
  record_origin?: string;
}

export interface GoldenMetricsInfo {
  date_ref?: string;
  vo2_max?: number | null;
  vo2_max_percentile?: string | null;
  rhr_bpm?: number | null;
  hrv_ms?: number | null;
  body_fat_pct?: number | null;
  body_fat_date?: string | null;
  body_fat_source?: string | null;
  target_body_fat_pct?: number | null;
  waist_cm?: number | null;
  waist_date?: string | null;
  whtr?: number | null;
  grip_strength_kg?: number | null;
  spo2_avg_pct?: number | null;
}

export interface MedicalIdInfo {
  blood_type?: string | null;
  allergies?: string | null;
  family_history?: string | null;
  chronic_conditions?: string | null;
  emergency_contact?: {
    name?: string | null;
    phone?: string | null;
  } | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  primary_physician?: string | null;
}

export interface LifestyleInfo {
  fasting_window?: string | null;
  chronotype?: string | null;
  daily_water_target_ml?: number | null;
  target_sleep_hours?: number | null;
  target_body_fat_pct?: number | null;
  active_supplements_count?: number | null;
}

export interface ProfileData {
  name: string;
  email?: string;
  birthdate?: string;
  chronological_age?: number;
  height_cm?: number;
  current_weight_kg?: number;
  target_weight_kg?: number;
  bmi?: number;
  gender?: string;
  avatar_url?: string;
  google_connected?: boolean;
  source?: string;

  // Campos diretos clínicos e de estilo de vida
  blood_type?: string;
  allergies?: string;
  family_history?: string;
  chronic_conditions?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  primary_physician?: string;
  longevity_goals?: string[];
  protocol_start_date?: string;
  fasting_window?: string;
  chronotype?: string;
  daily_water_target_ml?: number;
  target_sleep_hours?: number;
  target_body_fat_pct?: number;

  // Objetos ricos agregados
  protocol?: ProtocolInfo;
  biological_age?: BiologicalAgeInfo | null;
  golden_metrics?: GoldenMetricsInfo;
  medical_id?: MedicalIdInfo;
  lifestyle?: LifestyleInfo;

  onboarding_completed?: boolean;
}

export interface ProfileViewProps {
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
  onOpenAISettings?: () => void;
  onOpenDoctorBriefing?: () => void;
}
