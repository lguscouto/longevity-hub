import React, { useState } from 'react';
import {
  Dumbbell,
  Scale,
  Percent,
  Calendar,
  Ruler,
  Camera,
  Copy,
  Check,
  Printer,
  Maximize2,
  Minimize2,
  Share2,
  ArrowRight,
  User,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Activity,
} from 'lucide-react';
import { Button, useToast } from '../ui';
import { PhysicalAssessment } from '../physicalAssessments/types';
import { calcLeanAndFatMass, formatDateBr } from './types';

export interface PersonalTrainerHeaderProps {
  profile: any;
  assessments: PhysicalAssessment[];
  isPresentationMode: boolean;
  onTogglePresentationMode: () => void;
}

export const PersonalTrainerHeader: React.FC<PersonalTrainerHeaderProps> = ({
  profile,
  assessments,
  isPresentationMode,
  onTogglePresentationMode,
}) => {
  const { showToast } = useToast();
  const [copiedLink, setCopiedLink] = useState(false);

  const clientName = profile?.name || 'Aluno Longevidade';
  const age = profile?.chronological_age ? `${Math.round(profile.chronological_age)} anos` : null;
  const height = profile?.height_cm ? `${profile.height_cm} cm` : null;

  const latest = assessments[0];
  const oldest = assessments.length > 0 ? assessments[assessments.length - 1] : null;

  // Calculos de deltas
  const currentWeight = latest?.weight_kg ?? profile?.current_weight_kg ?? null;
  const initialWeight = oldest?.weight_kg ?? null;
  const weightDelta =
    currentWeight !== null && initialWeight !== null && assessments.length > 1
      ? Number((currentWeight - initialWeight).toFixed(1))
      : null;

  const currentBf = latest?.body_fat_percentage ?? null;
  const initialBf = oldest?.body_fat_percentage ?? null;
  const bfDelta =
    currentBf !== null && initialBf !== null && assessments.length > 1
      ? Number((currentBf - initialBf).toFixed(1))
      : null;

  const currentComp = calcLeanAndFatMass(currentWeight, currentBf);
  const initialComp = calcLeanAndFatMass(initialWeight, initialBf);
  const leanDelta =
    currentComp.leanMass !== null && initialComp.leanMass !== null && assessments.length > 1
      ? Number((currentComp.leanMass - initialComp.leanMass).toFixed(1))
      : null;

  const totalPhotos = assessments.reduce((acc, curr) => acc + (curr.photos?.length || 0), 0);

  // Intervalo em dias desde a última avaliação
  const daysSinceLatest = latest?.assessment_date
    ? Math.max(
        0,
        Math.floor(
          (new Date().getTime() - new Date(latest.assessment_date.slice(0, 10) + 'T00:00:00').getTime()) /
            (1000 * 60 * 60 * 24)
        )
      )
    : null;

  const handleCopyShareLink = async () => {
    try {
      const isLoopback =
        typeof window !== 'undefined' &&
        (window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost');
      const origin = isLoopback
        ? 'http://whitexp.ddns.net:8887'
        : window.location.origin.replace(/^https:/, 'http:');
      const path = window.location.pathname === '/' ? '' : window.location.pathname;
      const shareUrl = `${origin}${path}#personal`;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        throw new Error('Clipboard API unavailable');
      }
      setCopiedLink(true);
      showToast({
        title: 'Link copiado!',
        message: 'Link direto (HTTP) para o Portal do Personal copiado para a área de transferência.',
        type: 'success',
      });
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      showToast({
        title: 'Não foi possível copiar',
        message: 'Copie a URL do seu navegador: http://whitexp.ddns.net:8887/#personal',
        type: 'error',
      });
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4">
      {/* Top Banner & Title Bar */}
      <div className="glass-panel p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          {/* Identity & Client Info */}
          <div className="flex items-start gap-3.5 sm:gap-4 min-w-0">
            <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-cyan-600 dark:bg-cyan-500 text-white flex items-center justify-center shrink-0 shadow-sm">
              <Dumbbell className="h-6 w-6 sm:h-7 sm:w-7" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                  Portal do Personal Trainer
                </span>
                <span className="text-xs text-slate-400 dark:text-slate-500">•</span>
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Evolução Físico-Corporal
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white truncate">
                {clientName}
              </h1>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1">
                {age && <span className="font-medium">{age}</span>}
                {age && height && <span>•</span>}
                {height && <span className="font-medium">{height}</span>}
                {profile?.target_weight_kg && (
                  <>
                    <span>•</span>
                    <span>
                      Meta de peso: <strong className="text-slate-700 dark:text-slate-300">{profile.target_weight_kg} kg</strong>
                    </span>
                  </>
                )}
                {profile?.target_body_fat_pct && (
                  <>
                    <span>•</span>
                    <span>
                      Meta de gordura: <strong className="text-slate-700 dark:text-slate-300">{profile.target_body_fat_pct}%</strong>
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-200 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopyShareLink}
              leftIcon={copiedLink ? Check : Copy}
              className="text-xs font-semibold"
            >
              {copiedLink ? 'Link Copiado!' : 'Copiar Link'}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePrint}
              leftIcon={Printer}
              className="text-xs font-semibold"
            >
              Imprimir / PDF
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onTogglePresentationMode}
              leftIcon={isPresentationMode ? Minimize2 : Maximize2}
              className="text-xs font-semibold"
            >
              {isPresentationMode ? 'Sair do Modo Foco' : 'Modo Apresentação'}
            </Button>
          </div>
        </div>

        {/* Quick KPI Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6 pt-5 border-t border-slate-200 dark:border-slate-800/80">
          {/* KPI 1: Última Avaliação */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80">
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
              <Calendar className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
              <span>Última Coleta</span>
            </div>
            <div className="text-base font-bold text-slate-900 dark:text-white truncate">
              {latest ? formatDateBr(latest.assessment_date) : '—'}
            </div>
            <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 truncate">
              {daysSinceLatest !== null
                ? daysSinceLatest === 0
                  ? 'Hoje'
                  : `Há ${daysSinceLatest} ${daysSinceLatest === 1 ? 'dia' : 'dias'}`
                : 'Sem registros'}
            </div>
          </div>

          {/* KPI 2: Peso Atual & Delta */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80">
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
              <Scale className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Peso Atual</span>
            </div>
            <div className="text-base font-bold text-slate-900 dark:text-white">
              {currentWeight !== null ? `${currentWeight} kg` : '—'}
            </div>
            <div className="text-xs mt-0.5 font-medium flex items-center gap-1">
              {weightDelta !== null ? (
                <>
                  <span
                    className={
                      weightDelta < 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : weightDelta > 0
                        ? 'text-cyan-600 dark:text-cyan-400'
                        : 'text-slate-400'
                    }
                  >
                    {weightDelta > 0 ? `+${weightDelta} kg` : `${weightDelta} kg`}
                  </span>
                  <span className="text-slate-400 dark:text-slate-500">total</span>
                </>
              ) : (
                <span className="text-slate-400 dark:text-slate-500">ponto de partida</span>
              )}
            </div>
          </div>

          {/* KPI 3: % Gordura Corporal */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80">
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
              <Percent className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
              <span>Gordura</span>
            </div>
            <div className="text-base font-bold text-slate-900 dark:text-white">
              {currentBf !== null ? `${currentBf}%` : '—'}
            </div>
            <div className="text-xs mt-0.5 font-medium flex items-center gap-1">
              {bfDelta !== null ? (
                <>
                  <span
                    className={
                      bfDelta < 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : bfDelta > 0
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-slate-400'
                    }
                  >
                    {bfDelta > 0 ? `+${bfDelta}%` : `${bfDelta}%`}
                  </span>
                  <span className="text-slate-400 dark:text-slate-500">total</span>
                </>
              ) : (
                <span className="text-slate-400 dark:text-slate-500">linha de base</span>
              )}
            </div>
          </div>

          {/* KPI 4: Massa Magra Estimada */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80">
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
              <Activity className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Massa Magra</span>
            </div>
            <div className="text-base font-bold text-slate-900 dark:text-white">
              {currentComp.leanMass !== null ? `${currentComp.leanMass} kg` : '—'}
            </div>
            <div className="text-xs mt-0.5 font-medium flex items-center gap-1">
              {leanDelta !== null ? (
                <>
                  <span
                    className={
                      leanDelta > 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : leanDelta < 0
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-slate-400'
                    }
                  >
                    {leanDelta > 0 ? `+${leanDelta} kg` : `${leanDelta} kg`}
                  </span>
                  <span className="text-slate-400 dark:text-slate-500">músculo</span>
                </>
              ) : (
                <span className="text-slate-400 dark:text-slate-500">estimativa bioimp.</span>
              )}
            </div>
          </div>

          {/* KPI 5: Cintura & Abdômen */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80">
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
              <Ruler className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
              <span>Cintura / Abdômen</span>
            </div>
            <div className="text-base font-bold text-slate-900 dark:text-white truncate">
              {latest?.waist_cm ? `${latest.waist_cm} cm` : latest?.abdomen_cm ? `${latest.abdomen_cm} cm` : '—'}
            </div>
            <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 truncate">
              {latest?.waist_cm && latest?.abdomen_cm
                ? `Abd: ${latest.abdomen_cm} cm`
                : latest?.hip_cm
                ? `Quadril: ${latest.hip_cm} cm`
                : 'Antropometria'}
            </div>
          </div>

          {/* KPI 6: Total de Fotos e Avaliações */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80">
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
              <Camera className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
              <span>Acervo Visual</span>
            </div>
            <div className="text-base font-bold text-slate-900 dark:text-white">
              {totalPhotos} {totalPhotos === 1 ? 'foto' : 'fotos'}
            </div>
            <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 truncate">
              {assessments.length} {assessments.length === 1 ? 'avaliação' : 'avaliações'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
