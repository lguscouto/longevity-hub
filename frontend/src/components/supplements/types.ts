import React from 'react';
import { Sun, Utensils, Dumbbell, Moon, Clock } from 'lucide-react';

export interface Supplement {
  id: number;
  name: string;
  dosage: string;
  category?: string;
  frequency: string;
  timing: string;
  start_date: string;
  notes?: string;
}

export interface AuditLog {
  id: number;
  supplement_id: number;
  compound_name: string;
  category: string;
  action_type: string;
  old_value?: string;
  new_value?: string;
  created_at: string;
}

export interface SupplementsViewProps {
  selectedDate: string;
}

export type SupplementTab = 'today' | 'protocol' | 'audit' | 'analysis';

export type ChronoPeriodKey = 'morning' | 'lunch' | 'afternoon' | 'night' | 'other';

export interface ChronoPeriodDef {
  key: ChronoPeriodKey;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
}

export const CHRONO_PERIODS: ChronoPeriodDef[] = [
  {
    key: 'morning',
    label: 'Manhã / Jejum',
    description: 'Ao acordar ou primeiro horário',
    icon: Sun,
    accentColor: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
  },
  {
    key: 'lunch',
    label: 'Almoço',
    description: 'Junto à principal refeição diurna',
    icon: Utensils,
    accentColor: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
  },
  {
    key: 'afternoon',
    label: 'Tarde / Treino',
    description: 'Janela da tarde ou pré/pós-treino',
    icon: Dumbbell,
    accentColor: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
  },
  {
    key: 'night',
    label: 'Noite / Antes de Dormir',
    description: 'Jantar ou rotina de indução ao sono',
    icon: Moon,
    accentColor: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20',
  },
  {
    key: 'other',
    label: 'Outros Horários',
    description: 'Horários flexíveis ou não categorizados',
    icon: Clock,
    accentColor: 'text-slate-500 bg-slate-500/10 border-slate-500/20',
  },
];

export const getPeriodForTiming = (timing: string = ''): ChronoPeriodKey => {
  const t = timing.toLowerCase();
  if (t.includes('manhã') || t.includes('manha') || t.includes('jejum')) return 'morning';
  if (t.includes('almoço') || t.includes('almoco')) return 'lunch';
  if (t.includes('tarde') || t.includes('treino')) return 'afternoon';
  if (t.includes('noite') || t.includes('jantar') || t.includes('dormir') || t.includes('ceia')) return 'night';
  return 'other';
};
