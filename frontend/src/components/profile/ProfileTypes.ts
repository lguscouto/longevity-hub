import React from 'react';
import { PipelineRun } from '../PipelineStatusPanel';

export type ProfileSubTab = 'profile' | 'integrations' | 'system';

export interface ProfileData {
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
}
