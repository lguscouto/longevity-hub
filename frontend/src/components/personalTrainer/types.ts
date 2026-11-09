import { LucideIcon, Calendar, Ruler, Percent, Camera, CheckCircle2 } from 'lucide-react';
import { Photo, PhysicalAssessment } from '../physicalAssessments/types';

export type PersonalTrainerTab = 'gallery' | 'compare' | 'composition' | 'labs' | 'notes';
export type GalleryViewMode = 'timeline' | 'by-angle';

export type TrainerFeedbackCategory =
  | 'general'
  | 'hypertrophy'
  | 'fat_loss'
  | 'posture'
  | 'target';

export interface TrainerFeedback {
  id: string;
  created_at: string;
  category: TrainerFeedbackCategory;
  author: 'Personal Trainer' | 'Aluno';
  title: string;
  content: string;
  target_date?: string;
}

export interface TrainerGoalItem {
  id: string;
  label: string;
  completed: boolean;
  target_date?: string;
}

export const FEEDBACK_CATEGORY_LABELS: Record<TrainerFeedbackCategory, string> = {
  general: 'Parecer Geral',
  hypertrophy: 'Foco em Hipertrofia',
  fat_loss: 'Definição & Queima',
  posture: 'Postura & Mobilidade',
  target: 'Meta para Próxima Avaliação',
};

export const TRAINER_STORAGE_KEY_FEEDBACKS = 'longevidade_personal_trainer_feedbacks_v1';
export const TRAINER_STORAGE_KEY_GOALS = 'longevidade_personal_trainer_goals_v1';

export function calcLeanAndFatMass(
  weight?: number | null,
  bfPct?: number | null
): { fatMass: number | null; leanMass: number | null } {
  if (
    typeof weight === 'number' &&
    typeof bfPct === 'number' &&
    weight > 0 &&
    bfPct >= 0 &&
    bfPct <= 100
  ) {
    const fatMass = Number((weight * (bfPct / 100)).toFixed(2));
    const leanMass = Number((weight - fatMass).toFixed(2));
    return { fatMass, leanMass };
  }
  return { fatMass: null, leanMass: null };
}

export function formatDateBr(dateStr?: string | null): string {
  if (!dateStr) return '—';
  try {
    const raw = dateStr.slice(0, 10);
    return new Date(raw + 'T00:00:00').toLocaleDateString('pt-BR');
  } catch {
    return dateStr;
  }
}

export interface PersonalTrainerSession {
  authenticated: boolean;
  username: string;
  name: string;
  role: string;
  token: string;
  expires_at?: string;
}

export const PERSONAL_SESSION_STORAGE_KEY = 'longevidade_personal_trainer_session_v1';

export function getPersonalTrainerSession(): PersonalTrainerSession | null {
  try {
    const raw =
      localStorage.getItem(PERSONAL_SESSION_STORAGE_KEY) ||
      sessionStorage.getItem(PERSONAL_SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.authenticated && parsed.username) {
      return parsed;
    }
  } catch {
    // ignore
  }
  return null;
}

export function savePersonalTrainerSession(
  session: PersonalTrainerSession,
  remember: boolean = true
): void {
  try {
    const serialized = JSON.stringify(session);
    sessionStorage.setItem(PERSONAL_SESSION_STORAGE_KEY, serialized);
    if (remember) {
      localStorage.setItem(PERSONAL_SESSION_STORAGE_KEY, serialized);
    } else {
      localStorage.removeItem(PERSONAL_SESSION_STORAGE_KEY);
    }
  } catch {
    // ignore
  }
}

export function clearPersonalTrainerSession(): void {
  try {
    localStorage.removeItem(PERSONAL_SESSION_STORAGE_KEY);
    sessionStorage.removeItem(PERSONAL_SESSION_STORAGE_KEY);
  } catch {
    // ignore
  }
}

