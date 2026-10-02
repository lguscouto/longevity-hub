import { LucideIcon, Calendar, Ruler, Percent, Camera, CheckCircle2 } from 'lucide-react';

export interface Photo {
  id: string;
  assessment_id: string;
  angle: 'front' | 'back' | 'left_side' | 'right_side' | 'other';
  body_state?: 'relaxed' | 'flexed' | 'unspecified';
  description?: string;
  original_filename?: string;
  stored_filename: string;
  relative_path: string;
  mime_type: string;
  file_size: number;
  sha256: string;
  width?: number;
  height?: number;
  display_order: number;
  created_at: string;
  content_url: string;
}

export interface PhysicalAssessment {
  id: string;
  assessment_date: string;
  title?: string;
  weight_kg?: number;
  body_fat_percentage?: number;
  waist_cm?: number;
  abdomen_cm?: number;
  hip_cm?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  photos: Photo[];
}

export interface ComparisonManifest {
  previous_assessment: Partial<PhysicalAssessment>;
  current_assessment: Partial<PhysicalAssessment>;
  days_between: number;
  deltas: {
    weight_kg?: number | null;
    body_fat_percentage?: number | null;
    waist_cm?: number | null;
    abdomen_cm?: number | null;
    hip_cm?: number | null;
  };
  matched_photos: {
    angle: string;
    previous_photo?: Photo | null;
    current_photo?: Photo | null;
  }[];
}

export interface NewPhotoDraft {
  file: File;
  previewUrl: string;
  angle: 'front' | 'back' | 'left_side' | 'right_side' | 'other';
  body_state: 'relaxed' | 'flexed' | 'unspecified';
  description: string;
}

export const DRAFT_STORAGE_KEY = 'longevidade_physical_assessment_draft';

export const ANGLE_LABELS: Record<string, string> = {
  front: 'Frente',
  back: 'Costas',
  left_side: 'Lado Esquerdo',
  right_side: 'Lado Direito',
  other: 'Outro',
};

export const BODY_STATE_LABELS: Record<string, string> = {
  relaxed: 'Relaxado',
  flexed: 'Contraído',
  unspecified: 'Não informado',
};

export interface WizardStep {
  id: number;
  label: string;
  icon: LucideIcon;
  description: string;
}

export const WIZARD_STEPS: WizardStep[] = [
  { id: 1, label: 'Dados Básicos', icon: Calendar, description: 'Data, título e peso' },
  { id: 2, label: 'Medidas', icon: Ruler, description: 'Cintura, abdômen e quadril' },
  { id: 3, label: 'Composição', icon: Percent, description: '% Gordura corporal' },
  { id: 4, label: 'Fotos', icon: Camera, description: 'Registro fotográfico' },
  { id: 5, label: 'Revisão', icon: CheckCircle2, description: 'Notas e conferência final' },
];
