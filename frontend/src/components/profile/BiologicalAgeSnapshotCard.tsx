import React from 'react';
import {
  Dna,
  TrendingDown,
  TrendingUp,
  Clock,
  Sparkles,
  Info,
} from 'lucide-react';
import { BiologicalAgeInfo } from './ProfileTypes';
import { StatusBadge } from '../ui';

export interface BiologicalAgeSnapshotCardProps {
  biologicalAge?: BiologicalAgeInfo | null;
  chronologicalAge?: number | null;
}

export const BiologicalAgeSnapshotCard: React.FC<BiologicalAgeSnapshotCardProps> = ({
  biologicalAge,
  chronologicalAge,
}) => {
  const hasData =
    biologicalAge &&
    biologicalAge.biological_age !== undefined &&
    biologicalAge.biological_age !== null;

  if (!hasData) {
    return (
      <div
        className="p-6 rounded-radius-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs"
        role="region"
        aria-label="Resumo de Idade Biológica"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-radius-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Dna className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Idade Biológica & Velocidade de Envelhecimento
              </h3>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Modelo Phenotypic Age & KDM BioAge
              </span>
            </div>
          </div>
          <StatusBadge variant="neutral">Sem dados de exames</StatusBadge>
        </div>

        <div className="p-4 rounded-radius-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 flex items-start gap-3 text-xs text-slate-600 dark:text-slate-300">
          <Info className="h-5 w-5 text-indigo-500 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="space-y-1">
            <p className="font-semibold text-slate-800 dark:text-slate-200">
              Como funciona o cálculo da Idade Biológica?
            </p>
            <p className="leading-relaxed">
              O Longevidade Hub utiliza o algoritmo clínico validado <strong>PhenoAge</strong> (desenvolvido na Universidade de Yale), que cruza 9 biomarcadores laboratoriais de sangue (Albumina, Creatinina, Glicose, PCR-us, Linfócitos, VCM, RDW, Fosfatase Alcalina e Leucócitos) para determinar o desgaste fisiológico celular em comparação com a sua idade cronológica.
            </p>
            <p className="text-slate-500 dark:text-slate-400 pt-1">
              Registre seus exames na aba <em>Exames</em> para visualizar seu relatório biológico completo.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const bioAge = biologicalAge!.biological_age!;
  const chronoAge = biologicalAge!.chronological_age ?? chronologicalAge;
  const delta = biologicalAge!.age_delta ?? (chronoAge ? Number((bioAge - chronoAge).toFixed(1)) : 0);
  const isRejuvenated = delta < 0;
  const pace = biologicalAge!.pace_of_aging;

  return (
    <div
      className="p-6 rounded-radius-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-5"
      role="region"
      aria-label="Resumo de Idade Biológica"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-radius-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
            <Dna className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Idade Biológica Celular (PhenoAge)
              </h3>
              <StatusBadge variant={isRejuvenated ? 'success' : 'warning'}>
                {biologicalAge?.status || (isRejuvenated ? 'Otimização Celular' : 'Atenção Preventiva')}
              </StatusBadge>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Calculado a partir de 9 biomarcadores clínicos de sangue
              {biologicalAge?.calculated_at && ` • Atualizado em ${biologicalAge.calculated_at.slice(0, 10)}`}
            </p>
          </div>
        </div>
      </div>

      {/* Grid de Destaque da Idade e Ritmo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Idade Biológica */}
        <div className="p-4 rounded-radius-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 shadow-xs flex flex-col justify-between">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Idade Biológica Estimada
          </span>
          <div className="my-2">
            <div className="text-3xl font-extrabold text-indigo-600 dark:text-indigo-400">
              {bioAge.toFixed(1)}{' '}
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">anos</span>
            </div>
          </div>
          <span className="text-xs text-slate-600 dark:text-slate-400">
            Idade Cronológica: {chronoAge !== undefined && chronoAge !== null ? `${chronoAge} anos` : 'Não informada'}
          </span>
        </div>

        {/* Delta Biológico */}
        <div className="p-4 rounded-radius-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 shadow-xs flex flex-col justify-between">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Delta Biológico
          </span>
          <div className="my-2 flex items-center gap-2">
            <div
              className={`text-3xl font-extrabold ${
                isRejuvenated
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-amber-600 dark:text-amber-400'
              }`}
            >
              {delta > 0 ? `+${delta.toFixed(1)}` : delta.toFixed(1)}{' '}
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">anos</span>
            </div>
            {isRejuvenated ? (
              <span className="inline-flex items-center text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-radius-md">
                <TrendingDown className="h-3.5 w-3.5 mr-1" aria-hidden="true" /> Rejuvenescimento
              </span>
            ) : (
              <span className="inline-flex items-center text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-radius-md">
                <TrendingUp className="h-3.5 w-3.5 mr-1" aria-hidden="true" /> Aceleração
              </span>
            )}
          </div>
          <span className="text-xs text-slate-600 dark:text-slate-400">
            {isRejuvenated
              ? `Seu corpo apresenta reserva fisiológica de ${(Math.abs(delta)).toFixed(1)} anos mais jovem`
              : 'Desgaste celular acima do cronológico; priorize intervenções de sono e inflamação'}
          </span>
        </div>

        {/* Velocidade de Envelhecimento */}
        <div className="p-4 rounded-radius-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 shadow-xs flex flex-col justify-between">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Velocidade de Envelhecimento
          </span>
          <div className="my-2 flex items-center gap-2">
            <div className="text-3xl font-extrabold text-slate-900 dark:text-white">
              {pace !== undefined && pace !== null ? `${pace.toFixed(2)}x` : '1.00x'}
            </div>
            <Sparkles className="h-5 w-5 text-indigo-500" aria-hidden="true" />
          </div>
          <span className="text-xs text-slate-600 dark:text-slate-400">
            {pace !== undefined && pace !== null && pace < 1.0
              ? `Você envelhece ${Math.round((1 - pace) * 100)}% mais devagar que a média populacional`
              : 'Ritmo próximo ao padrão cronológico populacional (1.0x)'}
          </span>
        </div>
      </div>
    </div>
  );
};
