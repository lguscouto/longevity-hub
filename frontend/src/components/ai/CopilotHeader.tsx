import React from 'react';
import { Bot, Sparkles, Cpu, ShieldCheck, RefreshCw, Settings } from 'lucide-react';
import { Button, IconButton } from '../ui';
import { TimeWindow } from './types';

export interface CopilotHeaderProps {
  selectedModel: string;
  activeProvider: string;
  privacyModeLabel: string;
  privacyModeDescription: string;
  hasApiKey: boolean;
  isGenerating: boolean;
  generatingWindow: TimeWindow | null;
  onOpenSettings: () => void;
  onGenerateAnalysis: (win: TimeWindow) => void;
}

export const CopilotHeader: React.FC<CopilotHeaderProps> = ({
  selectedModel,
  activeProvider,
  privacyModeLabel,
  privacyModeDescription,
  hasApiKey,
  isGenerating,
  generatingWindow,
  onOpenSettings,
  onGenerateAnalysis,
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-radius-lg p-4 sm:p-6 shadow-sm relative overflow-hidden">
      <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
        <Bot className="h-64 w-64 text-cyan-400" />
      </div>

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 text-xs font-bold uppercase tracking-wider flex items-center gap-1 shrink-0">
              <Sparkles className="h-3 w-3" /> Copiloto Longevidade AI
            </span>
            <span className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1">
              <Cpu className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" /> Modelo:{' '}
              <strong className="text-slate-900 dark:text-white break-all">{selectedModel}</strong>{' '}
              ({activeProvider.toUpperCase()})
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Copiloto de Longevidade
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-xl">
            Análise integrativa de biomarcadores de sangue, idade biológica PhenoAge, HRV autonômica,
            curva glicêmica, Linha do Tempo de Saúde e padrões fisiológicos aprendidos.
          </p>
          <div
            role="status"
            aria-label="Aviso de envio para IA externa"
            className="mt-3 max-w-2xl rounded-radius-md border border-cyan-500/20 bg-cyan-500/5 p-3 text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2"
          >
            <ShieldCheck className="h-4 w-4 shrink-0 text-cyan-700 dark:text-cyan-300" />
            <div className="space-y-1">
              <p>
                Envio externo:{' '}
                <strong className="text-slate-900 dark:text-white">
                  {activeProvider.toUpperCase()}
                </strong>{' '}
                · <strong className="text-slate-900 dark:text-white">{selectedModel}</strong> ·{' '}
                <strong className="text-slate-900 dark:text-white">{privacyModeLabel}</strong>
              </p>
              <p className="text-slate-500 dark:text-slate-400">{privacyModeDescription}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <IconButton
            icon={Settings}
            onClick={onOpenSettings}
            aria-label="Configurar Chaves de API e Provedor"
            title="Configurar Chaves de API e Provedor"
            variant="secondary"
            size="md"
          />

          {/* Grupo de Análise Rápida: Hoje (24h) | Semana (7d) | Mês (30d) */}
          <div className="flex items-center gap-1.5 p-1 rounded-radius-md bg-slate-200/60 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700/60 shrink-0">
            <button
              type="button"
              onClick={() => onGenerateAnalysis('today')}
              disabled={isGenerating || !hasApiKey}
              className={`px-3 py-2 rounded-radius-sm font-bold flex items-center justify-center gap-1.5 transition text-xs ${
                !hasApiKey
                  ? 'text-slate-400 dark:text-slate-500 cursor-not-allowed'
                  : generatingWindow === 'today'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                  : 'bg-white dark:bg-slate-900/90 text-slate-800 dark:text-slate-200 hover:bg-amber-500/15 hover:text-amber-600 dark:hover:text-amber-400 border border-slate-200/80 dark:border-slate-700/60'
              }`}
              title="Prontidão diária, recuperação do sono da última noite e treino de hoje"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${generatingWindow === 'today' ? 'animate-spin' : ''}`}
              />
              {generatingWindow === 'today' ? 'Analisando...' : 'Hoje (24h)'}
            </button>

            <button
              type="button"
              onClick={() => onGenerateAnalysis('7d')}
              disabled={isGenerating || !hasApiKey}
              className={`px-3 py-2 rounded-radius-sm font-bold flex items-center justify-center gap-1.5 transition text-xs ${
                !hasApiKey
                  ? 'text-slate-400 dark:text-slate-500 cursor-not-allowed'
                  : generatingWindow === '7d'
                  ? 'bg-cyan-500 text-slate-950 font-black shadow-md'
                  : 'bg-white dark:bg-slate-900/90 text-slate-800 dark:text-slate-200 hover:bg-cyan-500/15 hover:text-cyan-600 dark:hover:text-cyan-400 border border-slate-200/80 dark:border-slate-700/60'
              }`}
              title="Médias dos últimos 7 dias, microciclo, balanço de fadiga e carga aguda de treinos"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${generatingWindow === '7d' ? 'animate-spin' : ''}`}
              />
              {generatingWindow === '7d' ? 'Analisando...' : 'Semana (7d)'}
            </button>

            <button
              type="button"
              onClick={() => onGenerateAnalysis('30d')}
              disabled={isGenerating || !hasApiKey}
              className={`px-3.5 py-2 rounded-radius-sm font-bold flex items-center justify-center gap-1.5 transition text-xs ${
                !hasApiKey
                  ? 'text-slate-400 dark:text-slate-500 cursor-not-allowed'
                  : generatingWindow === '30d'
                  ? 'bg-cyan-500 text-slate-950 font-black shadow-md'
                  : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black shadow-sm'
              }`}
              title="Visão geral de 30 dias com exames de sangue, idade biológica PhenoAge/KDM e hábitos"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${generatingWindow === '30d' ? 'animate-spin' : ''}`}
              />
              {generatingWindow === '30d' ? 'Analisando...' : 'Mês (30d)'}
            </button>
          </div>
        </div>
      </div>

      {!hasApiKey && (
        <div className="mt-4 p-3 rounded-radius-md bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 shrink-0" />
            <span>
              Nenhuma chave de API ativada para o provedor selecionado. Configure sua API Key para
              desbloquear as análises da IA.
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onOpenSettings}
            className="font-bold underline hover:text-slate-900 dark:hover:text-white p-0 min-h-0 h-auto"
          >
            Configurar Agora
          </Button>
        </div>
      )}
    </div>
  );
};
