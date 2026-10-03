import React from 'react';
import { Sparkles, ShieldAlert, CheckCircle2, Info, Activity, Database, AlertCircle } from 'lucide-react';
import { InsightItem } from './types';

export interface EvidenceBlockProps {
  insight: InsightItem;
  sourceContext?: {
    timeWindowLabel?: string;
    sampleCountText?: string;
    sources?: string[];
  };
}

export const EvidenceBlock: React.FC<EvidenceBlockProps> = ({ insight, sourceContext }) => {
  // Parsing inteligente caso o insight_text traga observações em formato de tópicos
  const observationText =
    insight.observation ||
    insight.insight_text;

  const actionableText =
    insight.recommendation ||
    insight.actionable_steps;

  const limitationText =
    insight.limitation ||
    'Associação observacional sem inferência causal direta. Dados sujeitos a variáveis de confusão (alimentação, estresse agudo, artefatos de medição).';

  return (
    <article
      aria-label={`Insight: ${insight.headline}`}
      className="p-4 sm:p-5 rounded-radius-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-3.5 transition-all"
    >
      {/* Topo do Insight: Categoria, Selo IA e Headline */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/20">
            {insight.category.replace('_', ' ')}
          </span>
          <span
            className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
            title="Síntese gerada por inteligência artificial a partir de dados fisiológicos"
          >
            <Sparkles className="h-3 w-3 text-cyan-600 dark:text-cyan-400" />
            <span>Gerado por IA</span>
          </span>
        </div>

        {sourceContext && (
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            {sourceContext.timeWindowLabel || 'Últimos 30 dias'}
          </span>
        )}
      </div>

      <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-snug">
        {insight.headline}
      </h4>

      {/* Grid Epistemológico: Observação, Associação, Limitação e Recomendação */}
      <div className="space-y-2.5 text-xs text-slate-700 dark:text-slate-300">
        {/* 1. Observação Fisiológica (Fato Medido) */}
        <div className="p-3 rounded-radius-md bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80 space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-slate-100">
            <Activity className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>Observação Fisiológica (Dado Medido)</span>
          </div>
          <p className="leading-relaxed pl-5">{observationText}</p>
        </div>

        {/* 2. Recomendação Prática Acionável */}
        {actionableText && (
          <div className="p-3 rounded-radius-md bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Conduta Prática Recomendada</span>
            </div>
            <p className="leading-relaxed pl-5 text-emerald-900 dark:text-emerald-200">
              {actionableText}
            </p>
          </div>
        )}

        {/* 3. Limitação & Prudência Epistemológica */}
        <div className="p-2.5 rounded-radius-md bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 text-slate-600 dark:text-slate-400 space-y-0.5">
          <div className="flex items-center gap-1.5 font-semibold text-amber-800 dark:text-amber-300 text-xs">
            <ShieldAlert className="h-3 w-3 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>Limitação da Inferência</span>
          </div>
          <p className="text-xs leading-tight pl-4">{limitationText}</p>
        </div>
      </div>

      {/* Dados Considerados no Modelo */}
      {sourceContext?.sampleCountText && (
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1.5">
            <Database className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" />
            <span>Dados considerados:</span>
          </span>
          <span className="font-mono text-slate-700 dark:text-slate-300">
            {sourceContext.sampleCountText}
          </span>
        </div>
      )}
    </article>
  );
};
