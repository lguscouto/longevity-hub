import React from 'react';
import {
  Sparkles,
  Bot,
  RefreshCw,
  Clock,
  History,
  ShieldCheck,
  Info,
} from 'lucide-react';
import { Button, EmptyState } from '../ui';
import { EvidenceBlock } from './EvidenceBlock';
import { AIResponseData, ActiveReportMeta, SavedReportItem, TimeWindow } from './types';

export interface AnalysisPanelProps {
  data: AIResponseData | null;
  activeReportMeta: ActiveReportMeta | null;
  reports: SavedReportItem[];
  isGenerating: boolean;
  generatingWindow: TimeWindow | null;
  elapsedSeconds: number;
  selectedModel: string;
  timeWindowLabels: Record<TimeWindow, string>;
  onGenerateAnalysis: (win: TimeWindow) => void;
  onCancelAnalysis: () => void;
  onSelectReport: (id: number) => void;
  onGoToHistory: () => void;
  onGoToChat: () => void;
}

export const AnalysisPanel: React.FC<AnalysisPanelProps> = ({
  data,
  activeReportMeta,
  reports,
  isGenerating,
  generatingWindow,
  elapsedSeconds,
  selectedModel,
  timeWindowLabels,
  onGenerateAnalysis,
  onCancelAnalysis,
  onSelectReport,
  onGoToHistory,
  onGoToChat,
}) => {
  const getGeneratingStage = (sec: number, win: TimeWindow = '30d') => {
    const windowName =
      win === 'today'
        ? 'de hoje (24h)'
        : win === '7d'
        ? 'da semana (7d)'
        : 'dos últimos 30 dias';
    if (sec < 5) {
      return {
        step: 1,
        title: `Consolidando dados ${windowName}...`,
        detail:
          win === 'today'
            ? 'Analisando sono da última noite, HRV, frequência cardíaca e medições de hoje.'
            : win === '7d'
            ? 'Calculando médias semanais de sono, HRV, treinos e recuperação.'
            : 'Reunindo seus exames de sangue, sono, HRV, glicemia e linha do tempo.',
      };
    }
    if (sec < 18) {
      return {
        step: 2,
        title: `Analisando seus dados com ${selectedModel}...`,
        detail:
          'Conectando com segurança e preparando a análise de longevidade.',
      };
    }
    if (sec < 45) {
      return {
        step: 3,
        title: 'Análise detalhada em andamento...',
        detail:
          'O modelo está cruzando dados de sono, treinos, HRV e exames.',
      };
    }
    return {
      step: 4,
      title: 'Sintetizando recomendações e preparando a análise...',
      detail:
        'Finalizando sugestões práticas e formatando os pontos principais.',
    };
  };

  const sampleCount =
    activeReportMeta?.time_window === 'today'
      ? '1 noite de sono · HRV · glicemia 24h'
      : activeReportMeta?.time_window === '7d'
      ? '7 noites de sono · médias de HRV · treinos'
      : 'Painel 30d · exames laboratoriais · HRV';

  return (
    <div className="space-y-6">
      {/* Header do Painel de Análise */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-cyan-600 dark:text-cyan-400" aria-hidden="true" />{' '}
            Síntese de tendências de saúde
          </h3>
          {activeReportMeta?.created_at && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-radius-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300">
              <Clock className="h-3 w-3 text-cyan-500" aria-hidden="true" />
              {new Date(activeReportMeta.created_at).toLocaleDateString([], {
                day: '2-digit',
                month: '2-digit',
              })}{' '}
              às{' '}
              {new Date(activeReportMeta.created_at).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
              <span className="text-slate-400">·</span>
              <span className="font-semibold text-cyan-600 dark:text-cyan-400">
                {activeReportMeta.model?.split('/')[1] || activeReportMeta.model}
              </span>
            </span>
          )}
          {activeReportMeta?.time_window && (
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-radius-full text-xs font-black uppercase tracking-wider ${
                activeReportMeta.time_window === 'today'
                  ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                  : activeReportMeta.time_window === '7d'
                  ? 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30'
                  : 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30'
              }`}
            >
              {timeWindowLabels[activeReportMeta.time_window] || '30 Dias'}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {reports.length > 0 && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onGoToHistory}
              leftIcon={History}
              title="Ver análises anteriores"
            >
              Ver histórico ({reports.length})
            </Button>
          )}
        </div>
      </div>

      {/* Quadro de Transparência e Confiança dos Dados Fisiológicos (UX-P1-14) */}
      {data && (
        <div className="bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-radius-lg p-5 space-y-3.5 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                Origem e transparência dos dados
              </span>
            </div>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs font-semibold border border-emerald-500/20">
              Dados consolidados
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-radius-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5 shadow-xs">
              <div className="flex items-center justify-between gap-1">
                <div className="flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-400 text-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  Dados medidos
                </div>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-radius-sm border border-emerald-500/20">
                  {activeReportMeta?.time_window === 'today'
                    ? '24h consolidadas'
                    : activeReportMeta?.time_window === '7d'
                    ? '7 dias consolidados'
                    : '30 dias consolidados'}
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {activeReportMeta?.time_window === 'today'
                  ? '1 noite de sono, HRV noturna, frequência cardíaca e curva glicêmica CGM.'
                  : activeReportMeta?.time_window === '7d'
                  ? '7 noites de sono, médias de HRV, 4 treinos analisados e CGM contínuo.'
                  : '14 exames de sangue, 30 noites de sono, 12 treinos analisados e glicemia CGM.'}
              </p>
            </div>

            <div className="p-3 rounded-radius-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5 shadow-xs">
              <div className="flex items-center justify-between gap-1">
                <div className="flex items-center gap-1.5 font-bold text-cyan-700 dark:text-cyan-400 text-xs">
                  <span className="w-2 h-2 rounded-full bg-cyan-500 shrink-0" />
                  Modelos e estimativas
                </div>
                <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded-radius-sm border border-cyan-500/20">
                  PhenoAge + KDM
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Estimativas de idade biológica (PhenoAge, KDM) e proporções de colesterol.
              </p>
            </div>

            <div className="p-3 rounded-radius-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5 shadow-xs">
              <div className="flex items-center justify-between gap-1">
                <div className="flex items-center gap-1.5 font-bold text-indigo-700 dark:text-indigo-400 text-xs">
                  <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                  Tendências e hábitos
                </div>
                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded-radius-sm border border-indigo-500/20">
                  Análise do experimento
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Padrões observados entre sua rotina diária, qualidade do sono e recuperação.
              </p>
            </div>
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 pt-0.5">
            <Info className="h-4 w-4 text-amber-500 shrink-0" />
            <span>
              Esta análise foi gerada por IA a partir dos dados disponíveis no seu histórico e serve como apoio para acompanhar sua saúde.
            </span>
          </div>
        </div>
      )}

      {/* Resumo da Síntese */}
      {data?.summary && (
        <div className="p-4 rounded-radius-md bg-cyan-500/5 border border-cyan-500/20 text-xs text-slate-700 dark:text-slate-300 italic font-medium leading-relaxed">
          "{data.summary}"
        </div>
      )}

      {/* Estado Vazio */}
      {!data && !isGenerating && (
        <EmptyState
          title="Nenhuma análise gerada recentemente"
          description="Escolha um período acima (Hoje 24h, Semana 7d ou Mês 30d) para gerar uma análise integrada dos seus exames, sono, treinos e medições com o Copiloto."
          icon={Bot}
          action={{
            label: 'Gerar análise',
            onClick: () => onGenerateAnalysis('30d'),
          }}
          secondaryAction={
            reports.length > 0
              ? {
                  label: `Abrir análise mais recente (${new Date(
                    reports[0].created_at
                  ).toLocaleDateString([], { day: '2-digit', month: '2-digit' })})`,
                  onClick: () => onSelectReport(reports[0].id),
                }
              : undefined
          }
        />
      )}

      {/* Progresso de Geração */}
      {isGenerating && (() => {
        const stage = getGeneratingStage(elapsedSeconds, generatingWindow || '30d');
        return (
          <div className="bg-white dark:bg-slate-900 border border-cyan-500/30 rounded-radius-lg p-8 sm:p-10 text-center space-y-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-cyan-500 transition-all duration-1000 ease-out"
                style={{ width: `${Math.min(95, Math.max(10, elapsedSeconds * 2.2))}%` }}
              />
            </div>

            <div className="relative inline-block mx-auto">
              <div className="p-4 rounded-radius-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-600 dark:text-cyan-400">
                <RefreshCw className="h-8 w-8 animate-spin" />
              </div>
            </div>

            <div className="space-y-2 max-w-lg mx-auto">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-700 dark:text-cyan-300 text-xs font-semibold">
                <Clock className="h-3.5 w-3.5 animate-pulse" />
                <span>Tempo decorrido: {elapsedSeconds}s</span>
                <span className="text-slate-400">|</span>
                <span>Etapa {stage.step} de 4</span>
              </div>
              <h4 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white transition-all duration-300">
                {stage.title}
              </h4>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                {stage.detail}
              </p>
            </div>

            <div className="grid grid-cols-4 gap-2 max-w-md mx-auto pt-1">
              {[1, 2, 3, 4].map((s) => (
                <div
                  key={s}
                  className={`h-1.5 rounded-full transition-all duration-500 ${
                    s <= stage.step
                      ? 'bg-cyan-500 shadow-sm shadow-cyan-500/50'
                      : 'bg-slate-200 dark:bg-slate-800'
                  }`}
                />
              ))}
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <span className="text-xs text-slate-400 max-w-xs text-center flex items-center justify-center gap-1">
                <Sparkles className="h-3 w-3 text-cyan-400 shrink-0 inline" />
                <span>
                  Modelos de IA analisam dezenas de medições e podem levar de 30 a 60 segundos.
                </span>
              </span>
              <Button variant="outline" size="sm" onClick={onCancelAnalysis}>
                Cancelar análise
              </Button>
            </div>
          </div>
        );
      })()}

      {/* Lista de Insights com EvidenceBlock */}
      {data?.insights && data.insights.length > 0 && (
        <div className="space-y-4">
          {data.insights.map((item, idx) => (
            <EvidenceBlock
              key={idx}
              insight={item}
              sourceContext={{
                timeWindowLabel:
                  timeWindowLabels[activeReportMeta?.time_window || '30d'],
                sampleCountText: sampleCount,
              }}
            />
          ))}

          {/* Botão de Transição para o Chat */}
          <div className="p-4 rounded-radius-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
            <div className="text-xs text-slate-600 dark:text-slate-400">
              Deseja aprofundar algum ponto desta análise ou tirar dúvidas sobre seus resultados?
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={onGoToChat}
              leftIcon={Bot}
              className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold shrink-0"
            >
              Conversar com o Copiloto
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
