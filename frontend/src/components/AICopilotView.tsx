import React, { useState, useEffect, useRef } from 'react';
import { Bot, Sparkles, RefreshCw, Send, Settings, ShieldCheck, Heart, Activity, Zap, Moon, FileText, ChevronRight, Cpu, Dumbbell, History, Clock, X, Calendar } from 'lucide-react';

import { ApiError, requestJson } from '../lib/api';

interface InsightItem {
  category: string;
  headline: string;
  insight_text: string;
  actionable_steps: string;
}

interface AIResponseData {
  summary?: string;
  insights?: InsightItem[];
}

export type TimeWindow = 'today' | '7d' | '30d';

interface SavedReportItem {
  id: number;
  created_at: string;
  provider: string;
  model: string;
  privacy_mode: string;
  time_window?: TimeWindow;
  summary: string;
  guardrail_applied?: boolean;
}

interface ActiveReportMeta {
  id?: number;
  created_at?: string;
  model?: string;
  provider?: string;
  time_window?: TimeWindow;
}

type PrivacyMode = 'minimal' | 'full';

interface AISettingsResponse {
  active_provider?: string;
  selected_model?: string;
  privacy_mode?: string;
  has_openai_key?: boolean;
  has_anthropic_key?: boolean;
  has_openrouter_key?: boolean;
}

const PRIVACY_MODE_LABELS: Record<PrivacyMode, string> = {
  minimal: 'privacidade mínima',
  full: 'privacidade completa',
};

const PRIVACY_MODE_DESCRIPTIONS: Record<PrivacyMode, string> = {
  minimal: 'Modo mínimo: não envia nome, nascimento ou histórico completo; usa apenas o contexto essencial.',
  full: 'Modo completo: opt-in para enviar contexto ampliado de perfil e histórico quando necessário.',
};

function normalizePrivacyMode(mode?: string): PrivacyMode {
  return mode === 'full' ? 'full' : 'minimal';
}

interface AICopilotViewProps {
  onOpenSettings: () => void;
  chatMessages: Array<{ sender: 'user' | 'ai'; text: string; time: string }>;
  setChatMessages: React.Dispatch<React.SetStateAction<Array<{ sender: 'user' | 'ai'; text: string; time: string }>>>;
}

const FormattedChatMessage: React.FC<{ text: string }> = ({ text }) => {
  if (!text) return null;

  // Processa linha a linha identificando tabelas, cabeçalhos, listas e negrito
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];

  let inTable = false;
  let tableHeader: string[] = [];
  let tableRows: string[][] = [];
  let currentKey = 0;

  const renderFormattedInlineText = (rawStr: string) => {
    // Substitui **texto** por <strong>
    const parts = rawStr.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, idx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={idx} className="text-cyan-700 dark:text-cyan-300 font-bold">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  const flushTable = () => {
    if (tableRows.length > 0 || tableHeader.length > 0) {
      elements.push(
        <div key={`table-${currentKey++}`} className="my-2 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80">
          <table className="w-full text-[11px] border-collapse">
            {tableHeader.length > 0 && (
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold text-left">
                  {tableHeader.map((col, cIdx) => (
                    <th key={cIdx} className="p-2 border-r last:border-r-0 border-slate-200 dark:border-slate-800">
                      {renderFormattedInlineText(col.trim())}
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              {tableRows.map((row, rIdx) => (
                <tr key={rIdx} className="border-b last:border-b-0 border-slate-200 dark:border-slate-800/60 hover:bg-slate-100/50 dark:hover:bg-slate-900/50">
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="p-2 border-r last:border-r-0 border-slate-200 dark:border-slate-800/60 text-slate-700 dark:text-slate-300">
                      {renderFormattedInlineText(cell.trim())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    inTable = false;
    tableHeader = [];
    tableRows = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Detecta tabela Markdown (ex: | Métrica | Valor |)
    if (line.startsWith('|') && line.endsWith('|')) {
      const cells = line.split('|').filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
      // Ignora linha divisória Markdown (ex: |---|---|)
      if (line.includes('---')) {
        continue;
      }
      if (!inTable) {
        inTable = true;
        tableHeader = cells;
      } else {
        tableRows.push(cells);
      }
      continue;
    } else if (inTable) {
      flushTable();
    }

    if (!line) {
      elements.push(<div key={`sp-${currentKey++}`} className="h-1.5" />);
      continue;
    }

    // Cabeçalhos (### Título)
    if (line.startsWith('### ')) {
      elements.push(
        <h4 key={`h3-${currentKey++}`} className="font-extrabold text-slate-900 dark:text-white text-xs mt-3 mb-1.5 border-b border-slate-200 dark:border-slate-800 pb-1">
          {renderFormattedInlineText(line.replace('### ', ''))}
        </h4>
      );
      continue;
    }

    if (line.startsWith('## ')) {
      elements.push(
        <h3 key={`h2-${currentKey++}`} className="font-black text-cyan-700 dark:text-cyan-300 text-sm mt-3 mb-1.5 border-b border-cyan-500/20 pb-1">
          {renderFormattedInlineText(line.replace('## ', ''))}
        </h3>
      );
      continue;
    }

    // Tópicos com lista (- item ou * item)
    if (line.startsWith('- ') || line.startsWith('* ') || /^\d+\.\s/.test(line)) {
      const cleanLine = line.replace(/^[-*]\s+|\d+\.\s+/, '');
      elements.push(
        <div key={`li-${currentKey++}`} className="flex items-start gap-1.5 ml-2 my-0.5 text-slate-700 dark:text-slate-300">
          <span className="text-cyan-600 dark:text-cyan-400 font-bold">•</span>
          <span>{renderFormattedInlineText(cleanLine)}</span>
        </div>
      );
      continue;
    }

    // Parágrafo normal
    elements.push(
      <p key={`p-${currentKey++}`} className="my-1 leading-relaxed text-slate-700 dark:text-slate-300">
        {renderFormattedInlineText(line)}
      </p>
    );
  }

  if (inTable) {
    flushTable();
  }

  return <div className="space-y-0.5">{elements}</div>;
};

const TIME_WINDOW_LABELS: Record<TimeWindow, string> = {
  today: 'Hoje (24h)',
  '7d': 'Semana (7d)',
  '30d': 'Mês (30d)',
};

const TIME_WINDOW_ACTION_TEXTS: Record<TimeWindow, string> = {
  today: 'a análise de prontidão de hoje (últimas 24h)',
  '7d': 'os insights de média semanal (últimos 7 dias)',
  '30d': 'os insights de saúde dos últimos 30 dias',
};

export const AICopilotView: React.FC<AICopilotViewProps> = ({ onOpenSettings, chatMessages, setChatMessages }) => {
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
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [chatInput, setChatInput] = useState<string>('');
  const [isSendingChat, setIsSendingChat] = useState<boolean>(false);

  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isGenerating) {
      setElapsedSeconds(0);
      interval = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
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

  const getGeneratingStage = (sec: number, win: TimeWindow = '30d') => {
    const windowName = win === 'today' ? 'de prontidão de hoje (24h)' : win === '7d' ? 'da média semanal (7d)' : 'de 30 dias';
    if (sec < 5) {
      return {
        step: 1,
        title: `Consolidando dados clínicos ${windowName}...`,
        detail: win === 'today'
          ? 'Analisando sono da última noite, HRV basal, FC de repouso e prontidão fisiológica.'
          : win === '7d'
          ? 'Calculando médias semanais de HRV, sono, carga de treinos e balanço de fadiga.'
          : 'Extraindo biomarcadores, exames laboratoriais, sono, HRV, CGM e 14 dias de linha do tempo.'
      };
    }
    if (sec < 18) {
      return {
        step: 2,
        title: `Analisando seus dados com ${selectedModel}...`,
        detail: 'Estabelecendo conexão segura via OpenRouter e preparando análise de longevidade.'
      };
    }
    if (sec < 45) {
      return {
        step: 3,
        title: 'Raciocínio clínico profundo em andamento...',
        detail: 'O modelo está ponderando correlações cruzadas entre sono, estresse, HRV e biomarcadores.'
      };
    }
    return {
      step: 4,
      title: 'Sintetizando insights acionáveis e gerando relatório...',
      detail: 'Finalizando formulação de recomendações práticas e formatação estruturada dos insights.'
    };
  };

  const loadSettingsAndHistory = async () => {
    try {
      const [resSettings, resHistory, resLatest, resReports] = await Promise.all([
        requestJson<AISettingsResponse>('/api/ai/settings'),
        requestJson<any[]>('/api/ai/history'),
        requestJson<{ id?: number; created_at?: string; model?: string; provider?: string; time_window?: TimeWindow; result?: AIResponseData }>('/api/ai/reports/latest').catch(() => null),
        requestJson<SavedReportItem[]>('/api/ai/reports').catch(() => [])
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
        const loaded: Array<{ sender: 'user' | 'ai'; text: string; time: string }> = [chatMessages[0]];
        [...resHistory].reverse().forEach((item: any) => {
          const t = item.created_at ? new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
          const isAutomatedReport = !item.user_prompt || item.user_prompt.startsWith("Análise geral automatizada") || item.user_prompt.startsWith("Análise automatizada");
          if (!isAutomatedReport) {
            loaded.push({ sender: 'user', text: item.user_prompt, time: t });
            if (item.insight_text) {
              loaded.push({ sender: 'ai', text: item.insight_text, time: t });
            }
          }
        });
        if (loaded.length > 1) {
          setChatMessages(loaded);
        }
      }
    } catch (caught) {
      setErrorMsg(caught instanceof ApiError ? caught.message : 'Falha ao carregar configurações e histórico da IA.');
    }
  };

  useEffect(() => {
    loadSettingsAndHistory();
  }, []);

  const privacyModeLabel = PRIVACY_MODE_LABELS[privacyMode];
  const privacyModeDescription = PRIVACY_MODE_DESCRIPTIONS[privacyMode];

  const confirmExternalAIRequest = (actionLabel: string) => window.confirm(
    `Antes de ${actionLabel}, confirme o envio de contexto para IA externa.\n\n` +
    `Provedor: ${activeProvider.toUpperCase()}\n` +
    `Modelo: ${selectedModel}\n` +
    `Modo: ${privacyModeLabel}\n\n` +
    `${privacyModeDescription}\n\nDeseja continuar?`
  );

  const handleSelectReport = async (reportId: number) => {
    try {
      const rep = await requestJson<{ id?: number; created_at?: string; model?: string; provider?: string; time_window?: TimeWindow; result?: AIResponseData }>(
        `/api/ai/reports/${reportId}`
      );
      if (rep?.result) {
        setData(rep.result);
        setActiveReportMeta({
          id: rep.id,
          created_at: rep.created_at,
          model: rep.model,
          provider: rep.provider,
          time_window: rep.time_window || '30d',
        });
        setShowHistoryModal(false);
      }
    } catch {
      setErrorMsg('Não foi possível carregar o relatório selecionado.');
    }
  };

  const handleGenerateAnalysis = async (win: TimeWindow = '30d') => {
    const actionText = TIME_WINDOW_ACTION_TEXTS[win] || 'os insights de saúde';
    if (!confirmExternalAIRequest(actionText)) return;

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
        setErrorMsg(caught instanceof ApiError ? caught.message : 'Erro de conexão ao comunicar com a IA.');
      }
    } finally {
      abortControllerRef.current = null;
      setGeneratingWindow(null);
    }
  };

  const handleSendChatMessage = async (promptText?: string) => {
    const textToSend = (promptText ?? chatInput).trim();
    if (!textToSend) return;
    if (!confirmExternalAIRequest('enviar sua mensagem ao chat do Copiloto')) return;

    const userTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setChatMessages(prev => [...prev, { sender: 'user', text: textToSend, time: userTime }]);
    if (!promptText) setChatInput('');
    setIsSendingChat(true);

    try {
      const body = await requestJson<{ reply?: string; detail?: string }>('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: textToSend })
      });

      const aiTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setChatMessages(prev => [
        ...prev,
        { sender: 'ai', text: body.reply ?? '⚠️ Resposta vazia do servidor.', time: aiTime }
      ]);
    } catch (caught) {
      const aiTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const detail = caught instanceof ApiError ? caught.message : 'Erro de conexão com o servidor.';
      setChatMessages(prev => [
        ...prev,
        { sender: 'ai', text: `⚠️ Erro: ${detail}`, time: aiTime }
      ]);
    } finally {
      setIsSendingChat(false);
    }
  };

  const categoryIcons: Record<string, React.ReactNode> = {
    sono_hrv: <Moon className="h-5 w-5 text-indigo-400" />,
    metabolismo: <Zap className="h-5 w-5 text-amber-400" />,
    laboratorios: <Activity className="h-5 w-5 text-emerald-400" />,
    estresse_pressao: <Heart className="h-5 w-5 text-rose-400" />,
    treino_estilo_vida: <Dumbbell className="h-5 w-5 text-cyan-400" />,
  };

  const categoryTitles: Record<string, string> = {
    sono_hrv: 'Sono & Recuperação Autonômica (HRV)',
    metabolismo: 'Controle Metabólico & Glicemia (CGM)',
    laboratorios: 'Exames & Biomarcadores de Longevidade',
    estresse_pressao: 'Estresse & Saúde Cardiovascular',
    treino_estilo_vida: 'Treinamento, Carga & Contexto da Linha do Tempo',
  };

  return (
    <div className="space-y-6">
      {/* Banner de Topo */}
      <div className="bg-gradient-to-r from-slate-100 dark:from-slate-900 via-slate-100 dark:via-slate-900 to-cyan-50/40 dark:to-cyan-950/40 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-6 shadow-xl relative overflow-hidden">
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
                <Cpu className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" /> Modelo: <strong className="text-slate-900 dark:text-white break-all">{selectedModel}</strong> ({activeProvider.toUpperCase()})
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">Copiloto de Longevidade</h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-xl">
              Análise integrativa de biomarcadores de sangue, idade biológica PhenoAge, HRV autonômica, curva glicêmica, Linha do Tempo de Saúde e padrões fisiológicos aprendidos.
            </p>
            <div
              role="status"
              aria-label="Aviso de envio para IA externa"
              className="mt-3 max-w-2xl rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-3 text-[11px] text-slate-700 dark:text-slate-300 flex items-start gap-2"
            >
              <ShieldCheck className="h-4 w-4 shrink-0 text-cyan-700 dark:text-cyan-300" />
              <div className="space-y-1">
                <p>
                  Envio externo: <strong className="text-slate-900 dark:text-white">{activeProvider.toUpperCase()}</strong> · <strong className="text-slate-900 dark:text-white">{selectedModel}</strong> · <strong className="text-slate-900 dark:text-white">{privacyModeLabel}</strong>
                </p>
                <p className="text-slate-500 dark:text-slate-400">{privacyModeDescription}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <button
              onClick={onOpenSettings}
              className="p-2.5 sm:p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition shrink-0"
              title="Configurar Chaves de API e Provedor"
            >
              <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>

            {/* Grupo de Análise Rápida: Hoje (24h) | Semana (7d) | Mês (30d) */}
            <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-200/60 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700/60 shrink-0">
              <button
                onClick={() => handleGenerateAnalysis('today')}
                disabled={isGenerating || !hasApiKey}
                className={`px-3 py-2 rounded-xl font-bold flex items-center justify-center gap-1.5 transition text-xs ${
                  !hasApiKey
                    ? 'text-slate-400 dark:text-slate-500 cursor-not-allowed'
                    : generatingWindow === 'today'
                    ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                    : 'bg-white dark:bg-slate-900/90 text-slate-800 dark:text-slate-200 hover:bg-amber-500/15 hover:text-amber-600 dark:hover:text-amber-400 border border-slate-200/80 dark:border-slate-700/60'
                }`}
                title="Prontidão diária, recuperação do sono da última noite e treino de hoje"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${generatingWindow === 'today' ? 'animate-spin' : ''}`} />
                {generatingWindow === 'today' ? 'Analisando...' : '⚡ Hoje (24h)'}
              </button>

              <button
                onClick={() => handleGenerateAnalysis('7d')}
                disabled={isGenerating || !hasApiKey}
                className={`px-3 py-2 rounded-xl font-bold flex items-center justify-center gap-1.5 transition text-xs ${
                  !hasApiKey
                    ? 'text-slate-400 dark:text-slate-500 cursor-not-allowed'
                    : generatingWindow === '7d'
                    ? 'bg-cyan-500 text-slate-950 font-black shadow-md'
                    : 'bg-white dark:bg-slate-900/90 text-slate-800 dark:text-slate-200 hover:bg-cyan-500/15 hover:text-cyan-600 dark:hover:text-cyan-400 border border-slate-200/80 dark:border-slate-700/60'
                }`}
                title="Médias dos últimos 7 dias, microciclo, balanço de fadiga e carga aguda de treinos"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${generatingWindow === '7d' ? 'animate-spin' : ''}`} />
                {generatingWindow === '7d' ? 'Analisando...' : '⚡ Semana (7d)'}
              </button>

              <button
                onClick={() => handleGenerateAnalysis('30d')}
                disabled={isGenerating || !hasApiKey}
                className={`px-3.5 py-2 rounded-xl font-bold flex items-center justify-center gap-1.5 transition text-xs ${
                  !hasApiKey
                    ? 'text-slate-400 dark:text-slate-500 cursor-not-allowed'
                    : generatingWindow === '30d'
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-black shadow-lg shadow-cyan-500/25'
                    : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black shadow-md shadow-cyan-500/20'
                }`}
                title="Visão geral de 30 dias com exames de sangue, idade biológica PhenoAge/KDM e hábitos"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${generatingWindow === '30d' ? 'animate-spin' : ''}`} />
                {generatingWindow === '30d' ? 'Analisando...' : '⚡ Mês (30d)'}
              </button>
            </div>
          </div>
        </div>

        {!hasApiKey && (
          <div className="mt-4 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 shrink-0" />
              <span>Nenhuma chave de API ativada para o provedor selecionado. Configure sua API Key para desbloquear as análises da IA.</span>
            </div>
            <button onClick={onOpenSettings} className="font-bold underline hover:text-slate-900 dark:hover:text-white">Configurar Agora</button>
          </div>
        )}
      </div>

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-800 dark:text-rose-300 text-sm">
          ⚠️ {errorMsg}
        </div>
      )}

      {/* Grid Principal: Insights + Chat Interativo */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Coluna Esquerda: Análise de Insights (2 Cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-cyan-600 dark:text-cyan-400" /> Relatório de Insights Médicos
              </h3>
              {activeReportMeta?.created_at && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-medium text-slate-600 dark:text-slate-300">
                  <Clock className="h-3 w-3 text-cyan-500" />
                  {new Date(activeReportMeta.created_at).toLocaleDateString([], { day: '2-digit', month: '2-digit' })} às {new Date(activeReportMeta.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  <span className="text-slate-400">·</span>
                  <span className="font-semibold text-cyan-600 dark:text-cyan-400">{activeReportMeta.model?.split('/')[1] || activeReportMeta.model}</span>
                </span>
              )}
              {activeReportMeta?.time_window && (
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                  activeReportMeta.time_window === 'today'
                    ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                    : activeReportMeta.time_window === '7d'
                    ? 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30'
                    : 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30'
                }`}>
                  {TIME_WINDOW_LABELS[activeReportMeta.time_window] || '30 Dias'}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {reports.length > 0 && (
                <button
                  onClick={() => setShowHistoryModal(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 transition"
                  title="Visualizar relatórios anteriores salvos"
                >
                  <History className="h-3.5 w-3.5 text-cyan-500" />
                  Histórico de Relatórios ({reports.length})
                </button>
              )}
            </div>
          </div>

          {data?.summary && (
            <div className="p-3.5 rounded-2xl bg-cyan-500/5 border border-cyan-500/20 text-xs text-slate-700 dark:text-slate-300 italic font-medium">
              "{data.summary}"
            </div>
          )}

          {!data && !isGenerating && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center space-y-4 shadow-sm">
              <Bot className="h-12 w-12 text-slate-400 dark:text-slate-600 mx-auto" />
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">Nenhuma Análise Ativa na Tela</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                  Clique em um dos botões acima (<strong>Hoje (24h)</strong>, <strong>Semana (7d)</strong> ou <strong>Mês (30d)</strong>) para sintetizar seus exames de sangue, HRV, sono e curva de glicemia CGM usando a IA.
                </p>
              </div>
              {reports.length > 0 && (
                <div className="pt-2">
                  <button
                    onClick={() => handleSelectReport(reports[0].id)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-700 dark:text-cyan-300 text-xs font-bold transition shadow-sm"
                  >
                    <History className="h-4 w-4" />
                    Carregar Relatório Mais Recente ({new Date(reports[0].created_at).toLocaleDateString([], { day: '2-digit', month: '2-digit' })})
                  </button>
                </div>
              )}
            </div>
          )}

          {isGenerating && (() => {
            const stage = getGeneratingStage(elapsedSeconds, generatingWindow || '30d');
            return (
              <div className="bg-white dark:bg-slate-900 border border-cyan-500/30 rounded-3xl p-8 sm:p-10 text-center space-y-6 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 transition-all duration-1000 ease-out"
                    style={{ width: `${Math.min(95, Math.max(10, elapsedSeconds * 2.2))}%` }}
                  />
                </div>

                <div className="relative inline-block mx-auto">
                  <div className="absolute -inset-2 rounded-full bg-cyan-500/20 blur-lg animate-pulse" />
                  <div className="relative p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-600 dark:text-cyan-400">
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
                  {[1, 2, 3, 4].map(s => (
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
                  <span className="text-[11px] text-slate-400 max-w-xs text-center">
                    💡 Modelos com raciocínio clínico (DeepSeek Flash) analisam dezenas de variáveis e levam em média de 30 a 60 segundos.
                  </span>
                  <button
                    onClick={handleCancelAnalysis}
                    className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-rose-500/10 hover:border-rose-500/30 hover:text-rose-600 dark:hover:text-rose-400 text-xs text-slate-500 dark:text-slate-400 transition font-medium"
                  >
                    Cancelar Análise
                  </button>
                </div>
              </div>
            );
          })()}

          {data?.insights && data.insights.map((item, idx) => (
            <div key={idx} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition rounded-3xl p-5 space-y-3 shadow-lg">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800/80 pb-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    {categoryIcons[item.category] || <Sparkles className="h-5 w-5 text-cyan-400" />}
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400">
                      {categoryTitles[item.category] || item.category}
                    </span>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">{item.headline}</h4>
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-normal">
                {item.insight_text}
              </p>

              {item.actionable_steps && (
                <div className="p-3 rounded-2xl bg-cyan-500/5 border border-cyan-500/15 text-xs space-y-1">
                  <span className="font-bold text-cyan-700 dark:text-cyan-300 text-[11px] uppercase tracking-wide flex items-center gap-1">
                    <Zap className="h-3 w-3 text-cyan-600 dark:text-cyan-400" /> Padrão identificado nos seus dados:
                  </span>
                  <p className="text-slate-700 dark:text-slate-300 font-medium">{item.actionable_steps}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Coluna Direita: Chat Interativo com o Copiloto (1 Col) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 flex flex-col h-[650px] shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Chat com Copiloto</h3>
            </div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">{activeProvider.toUpperCase()}</span>
          </div>

          {/* Sugestões Rápidas de Perguntas */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            <button
              onClick={() => handleSendChatMessage('Como foi meu sono e recuperação nos últimos 3 dias?')}
              className="text-[11px] px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-cyan-500/50 text-slate-700 dark:text-slate-300 transition"
            >
              🌙 Sono & Recuperação
            </button>
            <button
              onClick={() => handleSendChatMessage('Quais padrões e correlações pessoais foram detectados no meu histórico?')}
              className="text-[11px] px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-cyan-500/50 text-slate-700 dark:text-slate-300 transition"
            >
              🎯 Padrões Aprendidos
            </button>
            <button
              onClick={() => handleSendChatMessage('Como minha carga de treino dos últimos 14 dias impactou minha recuperação e sono?')}
              className="text-[11px] px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-cyan-500/50 text-slate-700 dark:text-slate-300 transition"
            >
              🏋️ Carga de Treino & HRV
            </button>
            <button
              onClick={() => handleSendChatMessage('Qual o impacto dos eventos recentes da minha Linha do Tempo (como viagens ou álcool) na minha saúde?')}
              className="text-[11px] px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-cyan-500/50 text-slate-700 dark:text-slate-300 transition"
            >
              📅 Linha do Tempo & Hábitos
            </button>
            <button
              onClick={() => handleSendChatMessage('Qual a relação do meu ApoB e exames laboratoriais com longevidade?')}
              className="text-[11px] px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-cyan-500/50 text-slate-700 dark:text-slate-300 transition"
            >
              🩸 Analisar ApoB & Labs
            </button>
          </div>

          {/* Mensagens do Chat */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
            {chatMessages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`p-3.5 rounded-2xl max-w-[95%] leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-cyan-500 text-slate-950 font-semibold rounded-br-none shadow-md'
                      : 'bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-none shadow-inner'
                  }`}
                >
                  <FormattedChatMessage text={msg.text} />
                </div>
                <span className="text-[9px] text-slate-500 mt-1 px-1">{msg.time}</span>
              </div>
            ))}
            {isSendingChat && (
              <div className="flex items-center gap-2 text-slate-400 text-xs italic">
                <Bot className="h-4 w-4 animate-bounce text-cyan-400" /> Copiloto pensando...
              </div>
            )}
          </div>

          {/* Form de Envio */}
          <form
            onSubmit={e => {
              e.preventDefault();
              handleSendChatMessage();
            }}
            className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2"
          >
            <input
              type="text"
              placeholder={hasApiKey ? "Faça uma pergunta sobre seus exames, treinos ou eventos..." : "Configure a API Key para conversar..."}
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              disabled={!hasApiKey || isSendingChat}
              className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
            />
            <button
              type="submit"
              aria-label="Enviar mensagem ao copiloto"
              disabled={!hasApiKey || isSendingChat || !chatInput.trim()}
              className="p-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-600 text-slate-950 font-bold transition shadow-md glow-cyan"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>

      {/* Modal de Histórico de Relatórios */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-cyan-500" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Histórico de Relatórios de Longevidade
                </h3>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-y-auto space-y-3 flex-1 pr-1">
              {reports.length === 0 ? (
                <div className="text-center py-8 text-sm text-slate-500">
                  Nenhum relatório salvo no histórico ainda.
                </div>
              ) : (
                reports.map(rep => {
                  const isCurrent = activeReportMeta?.id === rep.id;
                  const dateFormatted = new Date(rep.created_at).toLocaleString([], {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  });
                  return (
                    <div
                      key={rep.id}
                      className={`p-4 rounded-2xl border transition text-left space-y-2 ${
                        isCurrent
                          ? 'bg-cyan-500/10 border-cyan-500/40 shadow-sm'
                          : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Calendar className="h-3.5 w-3.5 text-cyan-500 shrink-0" />
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            {dateFormatted}
                          </span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                            rep.time_window === 'today'
                              ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                              : rep.time_window === '7d'
                              ? 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30'
                              : 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30'
                          }`}>
                            {TIME_WINDOW_LABELS[rep.time_window || '30d']}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
                            {rep.model?.split('/')[1] || rep.model}
                          </span>
                        </div>
                        {isCurrent ? (
                          <span className="text-[11px] font-bold text-cyan-600 dark:text-cyan-400">
                            Ativo na tela
                          </span>
                        ) : (
                          <button
                            onClick={() => handleSelectReport(rep.id)}
                            className="px-3 py-1 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition shadow-sm"
                          >
                            Visualizar
                          </button>
                        )}
                      </div>
                      {rep.summary && (
                        <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 italic">
                          "{rep.summary}"
                        </p>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setShowHistoryModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 transition"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
