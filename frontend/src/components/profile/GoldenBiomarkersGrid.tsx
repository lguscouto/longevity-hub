import React from 'react';
import {
  Activity,
  Heart,
  Zap,
  Scale,
  Dumbbell,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
} from 'lucide-react';
import { GoldenMetricsInfo } from './ProfileTypes';

export interface GoldenBiomarkersGridProps {
  goldenMetrics?: GoldenMetricsInfo;
  heightCm?: number;
  currentWeightKg?: number;
}

const formatShortDate = (isoStr?: string | null): string | null => {
  if (!isoStr) return null;
  try {
    const parts = isoStr.slice(0, 10).split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}`;
    }
  } catch {
    return isoStr;
  }
  return isoStr;
};

interface InfoTooltipProps {
  title: string;
  description: string;
  formula?: string;
  optimalTarget?: string;
  currentCalculation?: string;
  align?: 'left' | 'right' | 'center';
  children?: React.ReactNode;
}

const InfoTooltip: React.FC<InfoTooltipProps> = ({
  title,
  description,
  formula,
  optimalTarget,
  currentCalculation,
  align = 'right',
  children,
}) => {
  const alignClass =
    align === 'left'
      ? 'left-0'
      : align === 'center'
      ? 'left-1/2 -translate-x-1/2'
      : 'right-0';

  const arrowClass =
    align === 'left'
      ? 'left-3'
      : align === 'center'
      ? 'left-1/2 -translate-x-1/2'
      : 'right-3';

  return (
    <span
      className="relative inline-flex items-center group cursor-help focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500 rounded-radius-sm"
      tabIndex={0}
      role="button"
      aria-label={`Informações sobre ${title}`}
      title={`${title}: ${description}`}
    >
      {children || (
        <HelpCircle className="h-3.5 w-3.5 text-slate-400 group-hover:text-amber-500 dark:group-hover:text-amber-400 transition-colors ml-1" />
      )}

      {/* Popover flutuante */}
      <span
        className={`absolute bottom-full mb-2 hidden group-hover:flex group-focus:flex flex-col w-72 p-3 bg-slate-900 dark:bg-slate-950 text-white text-xs rounded-radius-lg shadow-xl border border-slate-700/80 z-50 pointer-events-none transition-all duration-150 animate-in fade-in zoom-in-95 text-left font-normal normal-case ${alignClass}`}
      >
        <span className="font-bold text-slate-100 flex items-center justify-between pb-1 border-b border-slate-800">
          <span>{title}</span>
        </span>

        <span className="text-slate-300 text-xs leading-relaxed mt-1.5 block">
          {description}
        </span>

        {currentCalculation && (
          <span className="mt-2 p-1.5 rounded-radius-sm bg-slate-800/80 font-mono text-xs text-amber-300 block">
            {currentCalculation}
          </span>
        )}

        {formula && (
          <span className="mt-1 text-xs text-slate-400 block">
            <strong className="text-slate-300">Fórmula:</strong> {formula}
          </span>
        )}

        {optimalTarget && (
          <span className="mt-1.5 pt-1 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <span className="text-slate-400">Alvo Ótimo:</span>
            <span className="font-bold text-emerald-400">{optimalTarget}</span>
          </span>
        )}

        {/* Seta do tooltip */}
        <span
          className={`absolute top-full border-4 border-transparent border-t-slate-900 ${arrowClass}`}
        />
      </span>
    </span>
  );
};

export const GoldenBiomarkersGrid: React.FC<GoldenBiomarkersGridProps> = ({
  goldenMetrics,
  heightCm,
}) => {
  const metrics = goldenMetrics || {};

  // Formatação segura de WHtR
  const whtrValue = metrics.whtr;
  const isWhtrOptimal = whtrValue !== undefined && whtrValue !== null && whtrValue < 0.50;

  return (
    <div className="space-y-3" role="region" aria-label="Biomarcadores Padrão-Ouro de Longevidade">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            Biomarcadores Padrão-Ouro (Pilares de Longevidade)
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Métricas de reserva fisiológica e proteção cardiometabólica recomendadas na medicina preventiva.
          </p>
        </div>
        {metrics.date_ref && (
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Última medição: {metrics.date_ref}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Aptidão Cardiorrespiratória (VO2 Max & RHR) */}
        <div className="p-4 rounded-radius-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 inline-flex items-center">
                Aptidão Cardiorrespiratória
                <InfoTooltip
                  title="VO2 Max & Capacidade Aeróbica"
                  description="Capacidade máxima de oxigenação celular durante esforço. Na medicina da longevidade (Peter Attia / Outlive), é o indicador isolado com maior correlação inversa com mortalidade por todas as causas."
                  optimalTarget="Top 10% a 20% para a sua faixa etária"
                  align="left"
                />
              </span>
              <div className="p-1.5 rounded-radius-md bg-rose-500/10 text-rose-600 dark:text-rose-400">
                <Activity className="h-4 w-4" aria-hidden="true" />
              </div>
            </div>

            <div className="flex items-baseline gap-2">
              <div className="text-2xl font-extrabold text-slate-900 dark:text-white">
                {metrics.vo2_max !== undefined && metrics.vo2_max !== null
                  ? metrics.vo2_max
                  : '-'}
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                ml/kg/min (VO2 Max)
              </span>
            </div>

            {metrics.vo2_max_percentile && (
              <div className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                <span>{metrics.vo2_max_percentile}</span>
              </div>
            )}
          </div>

          <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
            <span>FC Repouso (RHR):</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">
              {metrics.rhr_bpm !== undefined && metrics.rhr_bpm !== null
                ? `${metrics.rhr_bpm} bpm`
                : 'Não medido'}
            </span>
          </div>
        </div>

        {/* 2. Recuperação Autonômica (HRV & SpO2) */}
        <div className="p-4 rounded-radius-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 inline-flex items-center">
                Tônus Autonômico
                <InfoTooltip
                  title="Variabilidade Cardíaca (HRV rMSSD)"
                  description="Mede as variações milissegundo a milissegundo entre batimentos sucessivos. Reflete o tônus vagal e a capacidade adaptativa do sistema nervoso autônomo ao estresse físico e mental."
                  optimalTarget="> 40-50 ms basal noturno"
                  align="left"
                />
              </span>
              <div className="p-1.5 rounded-radius-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <Zap className="h-4 w-4" aria-hidden="true" />
              </div>
            </div>

            <div className="flex items-baseline gap-2">
              <div className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400">
                {metrics.hrv_ms !== undefined && metrics.hrv_ms !== null
                  ? metrics.hrv_ms
                  : '-'}
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                ms (HRV rMSSD)
              </span>
            </div>

            <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 block">
              Variabilidade Cardíaca Basal
            </span>
          </div>

          <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
            <span>SpO2 Média:</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">
              {metrics.spo2_avg_pct !== undefined && metrics.spo2_avg_pct !== null
                ? `${metrics.spo2_avg_pct}%`
                : 'Não medido'}
            </span>
          </div>
        </div>

        {/* 3. Composição Corporal (% Gordura & WHtR) */}
        <div className="p-4 rounded-radius-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 inline-flex items-center">
                Composição Corporal
                <InfoTooltip
                  title="Composição Corporal (Bioimpedância)"
                  description="Percentual de massa gorda aferido por balança de bioimpedância (Fitdays via Google Health API). Mede a proporção entre tecido adiposo e muscular."
                  optimalTarget="Homens: 10% a 18% | Mulheres: 18% a 24%"
                  align="right"
                />
              </span>
              <div className="p-1.5 rounded-radius-md bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Scale className="h-4 w-4" aria-hidden="true" />
              </div>
            </div>

            <div className="flex items-baseline gap-2">
              <div className="text-2xl font-extrabold text-amber-600 dark:text-amber-400">
                {metrics.body_fat_pct !== undefined && metrics.body_fat_pct !== null
                  ? `${metrics.body_fat_pct}%`
                  : '-'}
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Gordura Corporal
              </span>
            </div>

            {metrics.body_fat_date ? (
              <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 block">
                Última pesagem: {formatShortDate(metrics.body_fat_date)}
                {metrics.body_fat_source && metrics.body_fat_source.toLowerCase().includes('google')
                  ? ' (Google Health)'
                  : ''}
              </span>
            ) : metrics.target_body_fat_pct ? (
              <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 block">
                Meta de Gordura: {metrics.target_body_fat_pct}%
              </span>
            ) : null}

            {metrics.body_fat_date && metrics.target_body_fat_pct ? (
              <span className="text-xs text-slate-400 dark:text-slate-500 block">
                Meta: {metrics.target_body_fat_pct}%
              </span>
            ) : null}
          </div>

          <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
            <span className="inline-flex items-center">
              <span>Relação Cint/Est (WHtR):</span>
              <InfoTooltip
                title="Relação Cintura / Estatura (WHtR)"
                description="Métrica padrão-ouro de distribuição de gordura visceral e risco cardiometabólico. Avalia a adiposidade intra-abdominal de forma mais precisa que o IMC."
                formula="Cintura (cm) ÷ Estatura (cm)"
                optimalTarget="< 0.50 (Faixa Ótima de Longevidade)"
                currentCalculation={
                  metrics.waist_cm && heightCm
                    ? `Cintura: ${metrics.waist_cm} cm ÷ Altura: ${heightCm} cm = ${whtrValue ? whtrValue.toFixed(2) : '-'}`
                    : undefined
                }
                align="right"
              />
            </span>
            <span
              className={`font-bold inline-flex items-center gap-1 ${
                whtrValue !== undefined && whtrValue !== null
                  ? isWhtrOptimal
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-amber-600 dark:text-amber-400'
                  : 'text-slate-800 dark:text-slate-200'
              }`}
            >
              {whtrValue !== undefined && whtrValue !== null ? (
                <InfoTooltip
                  title={isWhtrOptimal ? 'WHtR na Faixa Ótima' : 'WHtR em Atenção Clínica'}
                  description={
                    isWhtrOptimal
                      ? 'Excelente! Seu índice está abaixo de 0.50, indicando baixo acúmulo de gordura visceral intra-abdominal.'
                      : `Com índice em ${whtrValue.toFixed(2)}, há indicativo de acúmulo de gordura visceral. O alvo recomendado para longevidade preventiva (Peter Attia / Diretrizes Cardiometabólicas) é manter abaixo de 0.50.`
                  }
                  optimalTarget="< 0.50"
                  align="right"
                >
                  <span className="inline-flex items-center gap-1 cursor-help">
                    {whtrValue.toFixed(2)}
                    {isWhtrOptimal ? (
                      <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                    ) : (
                      <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                    )}
                  </span>
                </InfoTooltip>
              ) : (
                'Sem medição'
              )}
            </span>
          </div>
        </div>

        {/* 4. Força Funcional & Reserva Muscular */}
        <div className="p-4 rounded-radius-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 inline-flex items-center">
                Força Funcional
                <InfoTooltip
                  title="Força de Preensão Manual (Grip Strength)"
                  description="Biomarcador substituto de reserva muscular, densidade mineral óssea e integridade neuromuscular. Níveis elevados correlacionam-se diretamente com proteção contra sarcopenia e fragilidade na velhice."
                  optimalTarget="> 45 kg (Homens) | > 30 kg (Mulheres)"
                  align="right"
                />
              </span>
              <div className="p-1.5 rounded-radius-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Dumbbell className="h-4 w-4" aria-hidden="true" />
              </div>
            </div>

            <div className="flex items-baseline gap-2">
              <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
                {metrics.grip_strength_kg !== undefined && metrics.grip_strength_kg !== null
                  ? metrics.grip_strength_kg
                  : '-'}
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                kg (Grip Strength)
              </span>
            </div>

            <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 block">
              Dinamometria de Preensão
            </span>
          </div>

          <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
            <span>Prevenção de Sarcopenia:</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">
              {metrics.grip_strength_kg && metrics.grip_strength_kg >= 40 ? 'Excelente' : 'Monitorada'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
