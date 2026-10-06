import React from 'react';
import {
  Edit3,
  Flame,
  Heart,
  Dumbbell,
  Sparkles,
  Moon,
  Zap,
  Printer,
  Stethoscope,
} from 'lucide-react';
import { ProfileData } from './ProfileTypes';
import { StatusBadge, Button } from '../ui';

export interface ProfileHeroCardProps {
  profile: ProfileData;
  isEditing: boolean;
  onToggleEdit: () => void;
  onOpenDoctorBriefing?: () => void;
}

const GOAL_LABELS: Record<string, { label: string; icon: React.ElementType }> = {
  cardiovascular: { label: 'Saúde Cardiovascular', icon: Heart },
  hypertrophy: { label: 'Hipertrofia & Força', icon: Dumbbell },
  phenoage: { label: 'Rejuvenescimento Celular', icon: Sparkles },
  metabolism: { label: 'Otimização Metabólica', icon: Flame },
  sleep: { label: 'Sono Reparador', icon: Moon },
  default: { label: 'Longevidade Saudável', icon: Zap },
};

export const ProfileHeroCard: React.FC<ProfileHeroCardProps> = ({
  profile,
  isEditing,
  onToggleEdit,
  onOpenDoctorBriefing,
}) => {
  const protocol = profile.protocol || {
    status: 'Protocolo Ativo',
    streak_days: null,
    longevity_goals: profile.longevity_goals || [],
  };

  const initial = profile.name ? profile.name[0].toUpperCase() : 'P';
  const goals = protocol.longevity_goals && protocol.longevity_goals.length > 0
    ? protocol.longevity_goals
    : profile.longevity_goals && profile.longevity_goals.length > 0
    ? profile.longevity_goals
    : [];

  return (
    <div
      className="p-6 rounded-radius-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 relative overflow-hidden shadow-xs"
      role="region"
      aria-label="Identidade do Usuário e Protocolo"
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        {/* Identidade / Avatar / Informações Principais */}
        <div className="flex items-start sm:items-center gap-5">
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={profile.name}
              className="h-20 w-20 rounded-radius-xl object-cover border border-slate-200 dark:border-slate-700 shadow-md"
            />
          ) : (
            <div className="h-20 w-20 rounded-radius-xl bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center text-white text-3xl font-extrabold shadow-md shrink-0">
              {initial}
            </div>
          )}

          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {profile.name}
              </h2>
              <StatusBadge variant="success" dot>
                {protocol.status || 'Protocolo Ativo'}
              </StatusBadge>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400">
              {profile.email || 'Sem e-mail'} • Perfil do Longevidade Hub
              {protocol.streak_days !== undefined && protocol.streak_days !== null && protocol.streak_days > 0 && (
                <span className="ml-2 font-medium text-emerald-600 dark:text-emerald-400">
                  • Dia {protocol.streak_days} contínuo
                </span>
              )}
            </p>

            {/* Metas Prioritárias de Longevidade */}
            {goals.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mr-1">
                  Foco:
                </span>
                {goals.map((goalKey) => {
                  const item = GOAL_LABELS[goalKey.toLowerCase()] || {
                    label: goalKey,
                    icon: Zap,
                  };
                  const IconComponent = item.icon;
                  return (
                    <span
                      key={goalKey}
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-radius-md text-[11px] font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60"
                    >
                      <IconComponent className="h-3 w-3" aria-hidden="true" />
                      <span>{item.label}</span>
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Barra de Ações Rápidas */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 self-start lg:self-center">
          {onOpenDoctorBriefing && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={onOpenDoctorBriefing}
              leftIcon={Stethoscope}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
            >
              Briefing Médico
            </Button>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            leftIcon={Printer}
          >
            Imprimir Ficha
          </Button>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onToggleEdit}
            leftIcon={Edit3}
            aria-expanded={isEditing}
          >
            {isEditing ? 'Cancelar Edição' : 'Editar Perfil'}
          </Button>
        </div>
      </div>
    </div>
  );
};
