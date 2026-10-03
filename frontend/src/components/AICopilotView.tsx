import React, { useState, useEffect, useRef } from 'react';
import { Bot, Sparkles, History, AlertCircle } from 'lucide-react';

import { ApiError, requestJson } from '../lib/api';
import { Button } from './ui';
import { CopilotHeader } from './ai/CopilotHeader';
import { AnalysisPanel } from './ai/AnalysisPanel';
import { CopilotChat } from './ai/CopilotChat';
import { ReportHistoryList } from './ai/ReportHistoryList';
import { AIPrivacyDialog } from './ai/AIPrivacyDialog';
import {
  AICopilotMode,
  AIResponseData,
  ActiveReportMeta,
  ChatMessage,
  PrivacyMode,
  SavedReportItem,
  TimeWindow,
  AISettingsResponse,
  PRIVACY_MODE_LABELS,
  PRIVACY_MODE_DESCRIPTIONS,
  TIME_WINDOW_LABELS,
  TIME_WINDOW_ACTION_TEXTS,
  normalizePrivacyMode,
} from './ai/types';

export type { AICopilotMode, TimeWindow };

export interface AICopilotViewProps {
  onOpenSettings: () => void;
  chatMessages: ChatMessage[];
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  initialMode?: AICopilotMode;
}

export const AICopilotView: React.FC<AICopilotViewProps> = ({
  onOpenSettings,
  chatMessages,
  setChatMessages,
  initialMode = 'analyze',
}) => {
  const [mode, setMode] = useState<AICopilotMode>(initialMode);
  const [activeProvider, setActiveProvider] = useState<string>('openrouter');
  const [selectedModel, setSelectedModel] = useState<string>('deepseek/deepseek-v4-flash-0731');
  const [privacyMode, setPrivacyMode] = useState<PrivacyMode>('minimal');
  const [hasApiKey, setHasApiKey] = useState<boolean>(false);

  const [generatingWindow, setGeneratingWindow] = useState<TimeWindow | null>(null);
  const isGenerating = generatingWindow !== null;
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [data, setData] = useState<AIResponseData | null>(null);
  const [reports, setReports] = useState<SavedReportItem[]>([]);
  const [activeReportMeta, setActiveReportMeta] = useState<ActiveReportMeta | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [chatInput, setChatInput] = useState<string>('');
  const [isSendingChat, setIsSendingChat] = useState<boolean>(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isGenerating) {
      setElapsedSeconds(0);
      interval = setInterval(() => setElapsedSeconds((prev) => prev + 1), 1000);
    } else {
      setElapsedSeconds(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isGenerating]);

  const handleCancelAnalysis = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setGeneratingWindow(null);
    setErrorMsg('Análise interrompida pelo usuário.');
  };

  const loadSettingsAndHistory = async () => {
    try {
      const [resSettings, resHistory, resLatest, resReports] = await Promise.all([
        requestJson<AISettingsResponse>('/api/ai/settings'),
        requestJson<any[]>('/api/ai/history'),
        requestJson<{
          id?: number;
          created_at?: string;
          model?: string;
          provider?: string;
          time_window?: TimeWindow;
          result?: AIResponseData;
        }>('/api/ai/reports/latest').catch(() => null),
        requestJson<SavedReportItem[]>('/api/ai/reports').catch(() => []),
      ]);

      if (resSettings) {
        setActiveProvider(resSettings.active_provider || 'openrouter');
        setSelectedModel(resSettings.selected_model || 'deepseek/deepseek-v4-flash-0731');
        setPrivacyMode(normalizePrivacyMode(resSettings.privacy_mode));
        const keyConfigured =
          (resSettings.active_provider === 'openai' && resSettings.has_openai_key) ||
          (resSettings.active_provider === 'anthropic' && resSettings.has_anthropic_key) ||
          (resSettings.active_provider === 'openrouter' && resSettings.has_openrouter_key);
        setHasApiKey(Boolean(keyConfigured));
      }

      if (resLatest?.result) {
        setData(resLatest.result);
        setActiveReportMeta({
          id: resLatest.id,
          created_at: resLatest.created_at,
          model: resLatest.model,
          provider: resLatest.provider,
          time_window: resLatest.time_window || '30d',
        });
      }

      if (Array.isArray(resReports)) {
        setReports(resReports);
      }

      if (Array.isArray(resHistory) && resHistory.length > 0 && chatMessages.length <= 1) {
        const loaded: ChatMessage[] = [chatMessages[0]];
        [...resHistory].reverse().forEach((item: any) => {
          const t = item.created_at
            ? new Date(item.created_at).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })
            : '';
          const isAutomated =
            !item.user_prompt ||
            item.user_prompt.startsWith('Análise geral automatizada') ||
            item.user_prompt.startsWith('Análise automatizada');
          if (!isAutomated) {
            loaded.push({ sender: 'user', text: item.user_prompt, time: t });
            if (item.insight_text) {
              loaded.push({ sender: 'ai', text: item.insight_text, time: t });
            }
          }
        });
        if (loaded.length > 1) setChatMessages(loaded);
      }
    } catch (caught) {
      setErrorMsg(
        caught instanceof ApiError
          ? caught.message
          : 'Falha ao carregar configurações e histórico da IA.'
      );
    }
  };

  useEffect(() => {
    loadSettingsAndHistory();
  }, []);

  const privacyModeLabel = PRIVACY_MODE_LABELS[privacyMode];
  const privacyModeDescription = PRIVACY_MODE_DESCRIPTIONS[privacyMode];

  const [pendingConfirm, setPendingConfirm] = useState<{
    actionLabel: string;
    resolve: (ok: boolean) => void;
  } | null>(null);

  const confirmExternalAIRequest = (actionLabel: string): Promise<boolean> => {
    return new Promise((resolve) => setPendingConfirm({ actionLabel, resolve }));
  };

  const handleSelectReport = async (reportId: number) => {
    try {
      const rep = await requestJson<{
        id?: number;
        created_at?: string;
        model?: string;
        provider?: string;
        time_window?: TimeWindow;
        result?: AIResponseData;
      }>(`/api/ai/reports/${reportId}`);
      if (rep?.result) {
        setData(rep.result);
        setActiveReportMeta({
          id: rep.id,
          created_at: rep.created_at,
          model: rep.model,
          provider: rep.provider,
          time_window: rep.time_window || '30d',
        });
        setMode('analyze');
      }
    } catch {
      setErrorMsg('Não foi possível carregar o relatório selecionado.');
    }
  };

  const handleGenerateAnalysis = async (win: TimeWindow = '30d') => {
    const actionText = TIME_WINDOW_ACTION_TEXTS[win] || 'os insights de saúde';
    const confirmed = await confirmExternalAIRequest(actionText);
    if (!confirmed) return;

    const controller = new AbortController();
    abortControllerRef.current = controller;
    setGeneratingWindow(win);
    setErrorMsg(null);

    try {
      const body = await requestJson<{
        result?: AIResponseData;
        id?: number;
        model?: string;
        provider?: string;
        time_window?: TimeWindow;
        detail?: string;
      }>('/api/ai/generate-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ time_window: win }),
        signal: controller.signal,
      });
      if (body.result) {
        setData(body.result);
        setMode('analyze');
        setActiveReportMeta({
          id: body.id,
          created_at: new Date().toISOString(),
          model: body.model || selectedModel,
          provider: body.provider || activeProvider,
          time_window: body.time_window || win,
        });
        try {
          const freshReports = await requestJson<SavedReportItem[]>('/api/ai/reports');
          if (Array.isArray(freshReports)) setReports(freshReports);
        } catch {
          // ignore
        }
      } else {
        setErrorMsg(body.detail || 'Falha ao gerar insights de IA.');
      }
    } catch (caught: any) {
      if (caught?.name === 'AbortError' || controller.signal.aborted) {
        setErrorMsg('Análise interrompida pelo usuário.');
      } else {
        setErrorMsg(
          caught instanceof ApiError ? caught.message : 'Erro de conexão ao comunicar com a IA.'
        );
      }
    } finally {
      abortControllerRef.current = null;
      setGeneratingWindow(null);
    }
  };

  const handleSendChatMessage = async (promptText?: string) => {
    const textToSend = (promptText ?? chatInput).trim();
    if (!textToSend) return;
    const confirmed = await confirmExternalAIRequest('enviar sua mensagem ao chat do Copiloto');
    if (!confirmed) return;

    const userTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setChatMessages((prev) => [...prev, { sender: 'user', text: textToSend, time: userTime }]);
    if (!promptText) setChatInput('');
    setIsSendingChat(true);

    try {
      const body = await requestJson<{ reply?: string; detail?: string }>('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: textToSend }),
      });

      const aiTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setChatMessages((prev) => [
        ...prev,
        { sender: 'ai', text: body.reply ?? '[Aviso] Resposta vazia do servidor.', time: aiTime },
      ]);
    } catch (caught) {
      const aiTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const detail =
        caught instanceof ApiError ? caught.message : 'Erro de conexão com o servidor.';
      setChatMessages((prev) => [
        ...prev,
        { sender: 'ai', text: `[Erro] ${detail}`, time: aiTime },
      ]);
    } finally {
      setIsSendingChat(false);
    }
  };

  return (
    <div className="space-y-6">
      <CopilotHeader
        selectedModel={selectedModel}
        activeProvider={activeProvider}
        privacyModeLabel={privacyModeLabel}
        privacyModeDescription={privacyModeDescription}
        hasApiKey={hasApiKey}
        isGenerating={isGenerating}
        generatingWindow={generatingWindow}
        onOpenSettings={onOpenSettings}
        onGenerateAnalysis={handleGenerateAnalysis}
      />

      {errorMsg && (
        <div className="p-4 rounded-radius-md bg-rose-500/10 border border-rose-500/20 text-rose-800 dark:text-rose-300 text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-rose-500 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Navegação entre as 3 Tarefas Principais */}
      <div className="flex flex-wrap items-center p-1 rounded-radius-md bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 w-full sm:w-fit">
        {[
          { key: 'analyze', label: 'Analisar Tendências', icon: Sparkles },
          { key: 'chat', label: 'Conversar com Copiloto', icon: Bot },
          { key: 'history', label: `Histórico de Relatórios (${reports.length})`, icon: History },
        ].map(({ key, label, icon: Icon }) => (
          <Button
            key={key}
            type="button"
            variant={mode === key ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setMode(key as AICopilotMode)}
            leftIcon={Icon}
            className={`text-xs font-bold min-h-0 h-auto py-1.5 px-3 flex-1 sm:flex-initial transition ${
              mode === key
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {label}
          </Button>
        ))}
      </div>

      {/* Conteúdo da Tarefa Ativa */}
      {mode === 'analyze' && (
        <AnalysisPanel
          data={data}
          activeReportMeta={activeReportMeta}
          reports={reports}
          isGenerating={isGenerating}
          generatingWindow={generatingWindow}
          elapsedSeconds={elapsedSeconds}
          selectedModel={selectedModel}
          timeWindowLabels={TIME_WINDOW_LABELS}
          onGenerateAnalysis={handleGenerateAnalysis}
          onCancelAnalysis={handleCancelAnalysis}
          onSelectReport={handleSelectReport}
          onGoToHistory={() => setMode('history')}
          onGoToChat={() => setMode('chat')}
        />
      )}

      {mode === 'chat' && (
        <CopilotChat
          chatMessages={chatMessages}
          chatInput={chatInput}
          setChatInput={setChatInput}
          isSendingChat={isSendingChat}
          hasApiKey={hasApiKey}
          activeProvider={activeProvider}
          selectedModel={selectedModel}
          onSendMessage={handleSendChatMessage}
        />
      )}

      {mode === 'history' && (
        <ReportHistoryList
          reports={reports}
          activeReportMeta={activeReportMeta}
          onSelectReport={handleSelectReport}
          onGoToAnalyze={() => setMode('analyze')}
          timeWindowLabels={TIME_WINDOW_LABELS}
        />
      )}

      {/* Diálogo Acessível de Confirmação de Envio para IA Externa */}
      <AIPrivacyDialog
        pendingConfirm={pendingConfirm}
        onClose={() => {
          pendingConfirm?.resolve(false);
          setPendingConfirm(null);
        }}
        onConfirm={() => {
          pendingConfirm?.resolve(true);
          setPendingConfirm(null);
        }}
        activeProvider={activeProvider}
        selectedModel={selectedModel}
        privacyModeLabel={privacyModeLabel}
        privacyModeDescription={privacyModeDescription}
      />
    </div>
  );
};
