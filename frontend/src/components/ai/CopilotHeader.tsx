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
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-radius-lg p-4 sm:p-6 shadow-xs relative overflow-hidden">
      <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
        <Bot className="h-64 w-64 text-cyan-400" aria-hidden="true" />
      </div>

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-radius-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 text-xs font-bold uppercase tracking-wider flex items-center gap-1 shrink-0">
              <Sparkles className="h-3 w-3" aria-hidden="true" /> Copiloto de IA
            </span>
            {/* Peso visual contido para o modelo (U22-P1-46) */}
            <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Cpu className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" aria-hidden="true" />
              Modelo: <span className="font-mono text-slate-700 dark:text-slate-300 break-all">{selectedModel.split('/')[1] || selectedModel}</span> ({activeProvider})
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Copiloto de Longevidade
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-xl">
            Visão integrada dos seus exames de sangue, estimativas de idade biológica, sono,
            recuperação, glicemia e rotina diária.
          </p>
          <div
            role="status"
            aria-label="Aviso de envio para IA externa"
            className="mt-3 max-w-2xl rounded-radius-md border border-cyan-500/20 bg-cyan-500/5 p-3 text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2"
          >
            <ShieldCheck className="h-4 w-4 shrink-0 text-cyan-700 dark:text-cyan-300" aria-hidden="true" />
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
            aria-label="Configurar chaves de API e provedores"
            title="Configurar chaves de API e provedores"
            variant="secondary"
            size="md"
          />

          {/* Grupo de Análise Rápida: Hoje (24h) | Semana (7d) | Mês (30d) com prevenção de concorrência (U22-P1-50) */}
          <div className="flex items-center gap-1.5 p-1 rounded-radius-md bg-slate-200/60 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700/60 shrink-0">
            <Button
              type="button"
              variant={generatingWindow === 'today' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => onGenerateAnalysis('today')}
              disabled={isGenerating || !hasApiKey}
              loading={generatingWindow === 'today'}
              loadingText="Analisando..."
              leftIcon={generatingWindow !== 'today' ? RefreshCw : undefined}
              title="Recuperação, sono da última noite e medições de hoje"
              className="text-xs font-bold min-h-0 h-auto py-1.5 px-3"
            >
              Hoje (24h)
            </Button>

            <Button
              type="button"
              variant={generatingWindow === '7d' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => onGenerateAnalysis('7d')}
              disabled={isGenerating || !hasApiKey}
              loading={generatingWindow === '7d'}
              loadingText="Analisando..."
              leftIcon={generatingWindow !== '7d' ? RefreshCw : undefined}
              title="Médias dos últimos 7 dias, recuperação semanal e carga de treinos"
              className="text-xs font-bold min-h-0 h-auto py-1.5 px-3"
            >
              Semana (7d)
            </Button>

            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => onGenerateAnalysis('30d')}
              disabled={isGenerating || !hasApiKey}
              loading={generatingWindow === '30d'}
              loadingText="Analisando..."
              leftIcon={generatingWindow !== '30d' ? RefreshCw : undefined}
              title="Visão geral dos últimos 30 dias com exames de sangue, estimativas de idade biológica e rotina"
              className="text-xs font-bold min-h-0 h-auto py-1.5 px-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black shadow-xs"
            >
              Mês (30d)
            </Button>
          </div>
        </div>
      </div>

      {!hasApiKey && (
        <div className="mt-4 p-3 rounded-radius-md bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              Nenhuma chave de API configurada para o provedor selecionado. Adicione sua chave para
              habilitar as análises com IA.
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onOpenSettings}
            className="font-bold underline hover:text-slate-900 dark:hover:text-white p-0 min-h-0 h-auto"
          >
            Configurar agora
          </Button>
        </div>
      )}
    </div>
  );
};
