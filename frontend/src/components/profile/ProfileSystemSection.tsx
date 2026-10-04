import React from 'react';
import {
  Database,
  Lock,
  Sparkles,
  Settings,
} from 'lucide-react';
import { PipelineStatusPanel, PipelineRun } from '../PipelineStatusPanel';
import { DataQualityPanel } from '../DataQualityPanel';
import { StatusBadge, Button } from '../ui';

export interface ProfileSystemSectionProps {
  pipelineRuns?: PipelineRun[];
  pipelineLoading?: boolean;
  onRefreshPipeline?: () => void;
  historySectionRef?: React.Ref<HTMLDivElement>;
  onOpenAISettings?: () => void;
}

export const ProfileSystemSection: React.FC<ProfileSystemSectionProps> = ({
  pipelineRuns = [],
  pipelineLoading = false,
  onRefreshPipeline = () => {},
  historySectionRef,
  onOpenAISettings,
}) => {
  return (
    <div className="space-y-6 animate-fadeIn" role="region" aria-label="Diagnóstico e Sistema">
      {/* Card de Infraestrutura Local-First */}
      <div className="p-5 rounded-radius-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-radius-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <Database className="h-6 w-6" aria-hidden="true" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Armazenamento local</h4>
                <StatusBadge variant="success">Armazenamento local ativo</StatusBadge>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Seus dados ficam salvos com segurança no seu dispositivo no arquivo <code>longevidade.db</code>.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800/80 px-3 py-2 rounded-radius-md border border-slate-200 dark:border-slate-700">
            <Lock className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            <span>Privacidade: seus dados não são enviados para serviços externos sem sua autorização.</span>
          </div>
        </div>
      </div>

      {/* Card Inteligência Artificial & Modelos (BYOK) - Configurações Técnicas e Privacidade (U22-P1-68, U22-P1-69) */}
      <div className="p-5 rounded-radius-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-radius-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <Sparkles className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">IA e provedores</h4>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  OpenAI, Anthropic, Gemini, Groq, Ollama (BYOK)
                </span>
              </div>
            </div>
            <StatusBadge variant="info">Configuração Local</StatusBadge>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 mb-4 leading-relaxed">
            Configure suas chaves de API, escolha provedores locais ou em nuvem e ajuste suas preferências de privacidade para as análises do Copiloto.
          </p>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
          <span className="text-slate-500 dark:text-slate-400">Chaves armazenadas localmente de forma isolada</span>
          {onOpenAISettings && (
            <Button
              variant="primary"
              size="sm"
              onClick={onOpenAISettings}
              leftIcon={Settings}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold"
            >
              Configurar IA e privacidade
            </Button>
          )}
        </div>
      </div>

      {/* Auditoria de Qualidade e Cobertura dos Dados */}
      <div>
        <DataQualityPanel />
      </div>

      {/* Histórico de Sincronizações na parte de baixo do perfil */}
      <div ref={historySectionRef}>
        <PipelineStatusPanel
          runs={pipelineRuns}
          loading={pipelineLoading}
          onRefresh={onRefreshPipeline}
        />
      </div>
    </div>
  );
};
