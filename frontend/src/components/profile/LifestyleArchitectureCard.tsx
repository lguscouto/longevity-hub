import React from 'react';
import {
  Compass,
  Utensils,
  Droplets,
  Moon,
  Pill,
  Target,
  Sparkles,
} from 'lucide-react';
import { LifestyleInfo } from './ProfileTypes';

export interface LifestyleArchitectureCardProps {
  lifestyle?: LifestyleInfo;
  fastingWindowDirect?: string;
  chronotypeDirect?: string;
  waterTargetDirect?: number;
  sleepTargetDirect?: number;
  targetBodyFatDirect?: number;
}

export const LifestyleArchitectureCard: React.FC<LifestyleArchitectureCardProps> = ({
  lifestyle,
  fastingWindowDirect,
  chronotypeDirect,
  waterTargetDirect,
  sleepTargetDirect,
  targetBodyFatDirect,
}) => {
  const data = lifestyle || {};
  const fasting = data.fasting_window || fastingWindowDirect;
  const chronotype = data.chronotype || chronotypeDirect;
  const waterMl = data.daily_water_target_ml || waterTargetDirect;
  const sleepHours = data.target_sleep_hours || sleepTargetDirect;
  const targetFat = data.target_body_fat_pct || targetBodyFatDirect;
  const activeSupps = data.active_supplements_count;

  const waterInLiters = waterMl ? (waterMl / 1000).toFixed(1) : null;

  return (
    <div
      className="p-5 rounded-radius-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex flex-col justify-between"
      role="region"
      aria-label="Arquitetura de Estilo de Vida e Hábitos"
    >
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-radius-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Compass className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                Arquitetura de Estilo de Vida & Rotina
                <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-radius-sm">
                  Hábitos
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Diretrizes de restrição alimentar temporal, sono e metas operacionais.
              </p>
            </div>
          </div>
          <Sparkles className="h-4 w-4 text-emerald-500" aria-hidden="true" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {/* Janela de Jejum */}
          <div className="p-3 rounded-radius-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-start gap-2.5">
            <div className="p-1.5 rounded-radius-md bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
              <Utensils className="h-4 w-4" aria-hidden="true" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
                Janela de Jejum
              </span>
              <span className="font-bold text-slate-900 dark:text-white">
                {fasting || 'Sem restrição temporal definida'}
              </span>
            </div>
          </div>

          {/* Cronotipo Circadiano */}
          <div className="p-3 rounded-radius-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-start gap-2.5">
            <div className="p-1.5 rounded-radius-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5">
              <Moon className="h-4 w-4" aria-hidden="true" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
                Cronotipo Circadiano
              </span>
              <span className="font-bold text-slate-900 dark:text-white">
                {chronotype || 'Não classificado'}
              </span>
            </div>
          </div>

          {/* Meta de Hidratação */}
          <div className="p-3 rounded-radius-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-start gap-2.5">
            <div className="p-1.5 rounded-radius-md bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 shrink-0 mt-0.5">
              <Droplets className="h-4 w-4" aria-hidden="true" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
                Meta de Hidratação
              </span>
              <span className="font-bold text-cyan-600 dark:text-cyan-400">
                {waterInLiters ? `${waterInLiters} L / dia` : 'Não definida'}
              </span>
            </div>
          </div>

          {/* Meta de Sono */}
          <div className="p-3 rounded-radius-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-start gap-2.5">
            <div className="p-1.5 rounded-radius-md bg-violet-500/10 text-violet-600 dark:text-violet-400 shrink-0 mt-0.5">
              <Moon className="h-4 w-4" aria-hidden="true" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
                Meta de Sono Noturno
              </span>
              <span className="font-bold text-violet-600 dark:text-violet-400">
                {sleepHours ? `${sleepHours} horas / noite` : 'Não definida'}
              </span>
            </div>
          </div>

          {/* Meta de Gordura Corporal */}
          <div className="p-3 rounded-radius-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-start gap-2.5">
            <div className="p-1.5 rounded-radius-md bg-rose-500/10 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5">
              <Target className="h-4 w-4" aria-hidden="true" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
                Meta de Gordura Alvo
              </span>
              <span className="font-bold text-slate-900 dark:text-white">
                {targetFat ? `${targetFat}% gordura` : 'Não definida'}
              </span>
            </div>
          </div>

          {/* Suplementação Ativa */}
          <div className="p-3 rounded-radius-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-start gap-2.5">
            <div className="p-1.5 rounded-radius-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5">
              <Pill className="h-4 w-4" aria-hidden="true" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
                Stack de Suplementos
              </span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                {activeSupps !== undefined && activeSupps !== null && activeSupps > 0
                  ? `${activeSupps} compostos ativos`
                  : 'Nenhum ativo'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="pt-3 mt-4 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
        <span>Parâmetros de base para o Copiloto de IA</span>
        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">● Protocolo Ativo</span>
      </div>
    </div>
  );
};
