import React, { useState, useEffect } from 'react';
import { Bot, Sparkles, RefreshCw, Send, Settings, ShieldCheck, Heart, Activity, Zap, Moon, FileText, ChevronRight, Cpu } from 'lucide-react';

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
        return <strong key={idx} className="text-cyan-300 font-bold">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  const flushTable = () => {
    if (tableRows.length > 0 || tableHeader.length > 0) {
      elements.push(
        <div key={`table-${currentKey++}`} className="my-2 overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/80">
          <table className="w-full text-[11px] border-collapse">
            {tableHeader.length > 0 && (
              <thead>
                <tr className="bg-slate-900 border-b border-slate-800 text-slate-300 font-bold text-left">
                  {tableHeader.map((col, cIdx) => (
                    <th key={cIdx} className="p-2 border-r last:border-r-0 border-slate-800">
                      {renderFormattedInlineText(col.trim())}
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              {tableRows.map((row, rIdx) => (
                <tr key={rIdx} className="border-b last:border-b-0 border-slate-800/60 hover:bg-slate-900/50">
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="p-2 border-r last:border-r-0 border-slate-800/60 text-slate-300">
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
        <h4 key={`h3-${currentKey++}`} className="font-extrabold text-white text-xs mt-3 mb-1.5 border-b border-slate-800 pb-1">
          {renderFormattedInlineText(line.replace('### ', ''))}
        </h4>
      );
      continue;
    }

    if (line.startsWith('## ')) {
      elements.push(
        <h3 key={`h2-${currentKey++}`} className="font-black text-cyan-300 text-sm mt-3 mb-1.5 border-b border-cyan-500/20 pb-1">
          {renderFormattedInlineText(line.replace('## ', ''))}
        </h3>
      );
      continue;
    }

    // Tópicos com lista (- item ou * item)
    if (line.startsWith('- ') || line.startsWith('* ') || /^\d+\.\s/.test(line)) {
      const cleanLine = line.replace(/^[-*]\s+|\d+\.\s+/, '');
      elements.push(
        <div key={`li-${currentKey++}`} className="flex items-start gap-1.5 ml-2 my-0.5 text-slate-300">
          <span className="text-cyan-400 font-bold">•</span>
          <span>{renderFormattedInlineText(cleanLine)}</span>
        </div>
      );
      continue;
    }

    // Parágrafo normal
    elements.push(
      <p key={`p-${currentKey++}`} className="my-1 leading-relaxed text-slate-300">
        {renderFormattedInlineText(line)}
      </p>
    );
  }

  if (inTable) {
    flushTable();
  }

  return <div className="space-y-0.5">{elements}</div>;
};

export const AICopilotView: React.FC<AICopilotViewProps> = ({ onOpenSettings, chatMessages, setChatMessages }) => {
  const [activeProvider, setActiveProvider] = useState<string>('openrouter');
  const [selectedModel, setSelectedModel] = useState<string>('deepseek/deepseek-v4-pro');
  const [hasApiKey, setHasApiKey] = useState<boolean>(false);

  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [data, setData] = useState<AIResponseData | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [chatInput, setChatInput] = useState<string>('');
  const [isSendingChat, setIsSendingChat] = useState<boolean>(false);

  const loadSettingsAndHistory = async () => {
    try {
      const [resSettings, resHistory] = await Promise.all([
        fetch('/api/ai/settings').then(r => r.json()),
        fetch('/api/ai/history').then(r => r.json())
      ]);

      if (resSettings) {
        setActiveProvider(resSettings.active_provider || 'openrouter');
        setSelectedModel(resSettings.selected_model || 'deepseek/deepseek-v4-pro');
        const keyConfigured =
          (resSettings.active_provider === 'openai' && resSettings.has_openai_key) ||
          (resSettings.active_provider === 'anthropic' && resSettings.has_anthropic_key) ||
          (resSettings.active_provider === 'openrouter' && resSettings.has_openrouter_key);
        setHasApiKey(keyConfigured);
      }

      if (resHistory && Array.isArray(resHistory) && resHistory.length > 0 && chatMessages.length <= 1) {
        const loaded: Array<{ sender: 'user' | 'ai'; text: string; time: string }> = [chatMessages[0]];
        [...resHistory].reverse().forEach((item: any) => {
          const t = item.created_at ? new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
          if (item.user_prompt && item.user_prompt !== "Análise geral automatizada de 30 dias") {
            loaded.push({ sender: 'user', text: item.user_prompt, time: t });
          }
          if (item.insight_text) {
            loaded.push({ sender: 'ai', text: item.insight_text, time: t });
          }
        });
        if (loaded.length > 1) {
          setChatMessages(loaded);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadSettingsAndHistory();
  }, []);

  const handleGenerateAnalysis = async () => {
    setIsGenerating(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/ai/generate-insights', { method: 'POST' });
      const body = await res.json();
      if (!res.ok) {
        setErrorMsg(body.detail || 'Falha ao gerar insights de IA.');
      } else {
        setData(body.result);
      }
    } catch (err) {
      setErrorMsg('Erro de conexão ao comunicar com a IA.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendChatMessage = async (promptText?: string) => {
    const textToSend = promptText || chatInput;
    if (!textToSend.trim()) return;

    const userTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setChatMessages(prev => [...prev, { sender: 'user', text: textToSend, time: userTime }]);
    if (!promptText) setChatInput('');
    setIsSendingChat(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: textToSend })
      });
      const body = await res.json();

      const aiTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      if (!res.ok) {
        setChatMessages(prev => [
          ...prev,
          { sender: 'ai', text: `⚠️ Erro: ${body.detail || 'Falha na resposta do Copiloto.'}`, time: aiTime }
        ]);
      } else {
        setChatMessages(prev => [
          ...prev,
          { sender: 'ai', text: body.reply, time: aiTime }
        ]);
      }
    } catch (e) {
      const aiTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setChatMessages(prev => [
        ...prev,
        { sender: 'ai', text: '⚠️ Erro de conexão com o servidor.', time: aiTime }
      ]);
    } finally {
      setIsSendingChat(false);
    }
  };

  const categoryIcons: Record<string, React.ReactNode> = {
    sono_hrv: <Moon className="h-5 w-5 text-indigo-400" />,
    metabolismo: <Zap className="h-5 w-5 text-amber-400" />,
    laboratorios: <Activity className="h-5 w-5 text-emerald-400" />,
    estresse_pressao: <Heart className="h-5 w-5 text-rose-400" />
  };

  const categoryTitles: Record<string, string> = {
    sono_hrv: 'Sono & Recuperação Autonômica (HRV)',
    metabolismo: 'Controle Metabólico & Glicemia (CGM)',
    laboratorios: 'Exames & Biomarcadores de Longevidade',
    estresse_pressao: 'Estresse & Saúde Cardiovascular'
  };

  return (
    <div className="space-y-6">
      {/* Banner de Topo */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-cyan-950/40 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Bot className="h-64 w-64 text-cyan-400" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> Copiloto Longevidade AI
              </span>
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Cpu className="h-3.5 w-3.5 text-cyan-400" /> Modelo: <strong className="text-white">{selectedModel}</strong> ({activeProvider.toUpperCase()})
              </span>
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">Inteligência Médica de Precisão</h2>
            <p className="text-sm text-slate-400 max-w-xl">
              Análise integrativa de biomarcadores de sangue, idade biológica PhenoAge, HRV autonômica e curva glicêmica baseada nos princípios do Protocolo Blueprint.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onOpenSettings}
              className="p-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
              title="Configurar Chaves de API e Provedor"
            >
              <Settings className="h-5 w-5" />
            </button>

            <button
              onClick={handleGenerateAnalysis}
              disabled={isGenerating || !hasApiKey}
              className={`px-5 py-3 rounded-2xl font-bold flex items-center gap-2 transition ${
                !hasApiKey
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black shadow-lg shadow-cyan-500/25 glow-cyan'
              }`}
            >
              <RefreshCw className={`h-4 w-4 ${isGenerating ? 'animate-spin' : ''}`} />
              {isGenerating ? 'Analisando Dados...' : '⚡ Analisar Saúde 30 Dias'}
            </button>
          </div>
        </div>

        {!hasApiKey && (
          <div className="mt-4 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 shrink-0" />
              <span>Nenhuma chave de API ativada para o provedor selecionado. Configure sua API Key para desbloquear as análises da IA.</span>
            </div>
            <button onClick={onOpenSettings} className="font-bold underline hover:text-white">Configurar Agora</button>
          </div>
        )}
      </div>

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm">
          ⚠️ {errorMsg}
        </div>
      )}

      {/* Grid Principal: Insights + Chat Interativo */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Coluna Esquerda: Análise de Insights (2 Cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-cyan-400" /> Relatório de Insights Médicos
            </h3>
            {data?.summary && (
              <span className="text-xs text-slate-400 italic font-medium max-w-xs truncate">
                "{data.summary}"
              </span>
            )}
          </div>

          {!data && !isGenerating && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-3">
              <Bot className="h-12 w-12 text-slate-600 mx-auto" />
              <h4 className="text-sm font-bold text-slate-300">Nenhuma Análise Gerada Ainda</h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Clique no botão <strong>"Analisar Saúde 30 Dias"</strong> acima para sintetizar seus exames de sangue, HRV, sono e curva de glicemia CGM usando a IA.
              </p>
            </div>
          )}

          {isGenerating && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center space-y-4">
              <RefreshCw className="h-10 w-10 text-cyan-400 animate-spin mx-auto" />
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-white">Processando Dados no {selectedModel}...</h4>
                <p className="text-xs text-slate-400">Cruzando biomarcadores com a fórmula Morgan Levine PhenoAge e Protocolo Blueprint...</p>
              </div>
            </div>
          )}

          {data?.insights && data.insights.map((item, idx) => (
            <div key={idx} className="bg-slate-900 border border-slate-800 hover:border-slate-700 transition rounded-3xl p-5 space-y-3 shadow-lg">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                    {categoryIcons[item.category] || <Sparkles className="h-5 w-5 text-cyan-400" />}
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
                      {categoryTitles[item.category] || item.category}
                    </span>
                    <h4 className="text-sm font-bold text-white">{item.headline}</h4>
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed font-normal">
                {item.insight_text}
              </p>

              {item.actionable_steps && (
                <div className="p-3 rounded-2xl bg-cyan-500/5 border border-cyan-500/15 text-xs space-y-1">
                  <span className="font-bold text-cyan-300 text-[11px] uppercase tracking-wide flex items-center gap-1">
                    <Zap className="h-3 w-3 text-cyan-400" /> Recomendação Prática Blueprint:
                  </span>
                  <p className="text-slate-300 font-medium">{item.actionable_steps}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Coluna Direita: Chat Interativo com o Copiloto (1 Col) */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 flex flex-col h-[650px] shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <h3 className="text-sm font-bold text-white">Chat com Copiloto</h3>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">{activeProvider.toUpperCase()}</span>
          </div>

          {/* Sugestões Rápidas de Perguntas */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            <button
              onClick={() => handleSendChatMessage('Como foi meu sono nos últimos 3 dias?')}
              className="text-[11px] px-2.5 py-1 rounded-full bg-slate-950 border border-slate-800 hover:border-cyan-500/50 text-slate-300 transition"
            >
              🌙 Sono últimos 3 dias
            </button>
            <button
              onClick={() => handleSendChatMessage('Como posso melhorar minha HRV noturna nos próximos 7 dias?')}
              className="text-[11px] px-2.5 py-1 rounded-full bg-slate-950 border border-slate-800 hover:border-cyan-500/50 text-slate-300 transition"
            >
              💡 Otimizar HRV
            </button>
            <button
              onClick={() => handleSendChatMessage('Qual a relação do meu ApoB de exames com longevidade?')}
              className="text-[11px] px-2.5 py-1 rounded-full bg-slate-950 border border-slate-800 hover:border-cyan-500/50 text-slate-300 transition"
            >
              🩸 Analisar ApoB
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
                      : 'bg-slate-950 border border-slate-800 text-slate-200 rounded-bl-none shadow-inner'
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
            className="mt-3 pt-3 border-t border-slate-800 flex items-center gap-2"
          >
            <input
              type="text"
              placeholder={hasApiKey ? "Faça uma pergunta sobre seus exames ou sono..." : "Configure a API Key para conversar..."}
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              disabled={!hasApiKey || isSendingChat}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!hasApiKey || isSendingChat || !chatInput.trim()}
              className="p-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 font-bold transition shadow-md glow-cyan"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
