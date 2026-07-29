import React, { useState, useEffect } from 'react';
import { Bot, Key, ShieldCheck, CheckCircle2, AlertCircle, RefreshCw, Sparkles, Cpu } from 'lucide-react';

interface AISettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefreshSettings?: () => void;
}

export const AISettingsModal: React.FC<AISettingsModalProps> = ({ isOpen, onClose, onRefreshSettings }) => {
  const [activeProvider, setActiveProvider] = useState<'openai' | 'anthropic' | 'openrouter'>('openrouter');
  const [selectedModel, setSelectedModel] = useState('deepseek/deepseek-v4-pro');
  const [openaiKey, setOpenaiKey] = useState('');
  const [anthropicKey, setAnthropicKey] = useState('');
  const [openrouterKey, setOpenrouterKey] = useState('');

  const [hasOpenaiKey, setHasOpenaiKey] = useState(false);
  const [hasAnthropicKey, setHasAnthropicKey] = useState(false);
  const [hasOpenrouterKey, setHasOpenrouterKey] = useState(false);

  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/ai/settings').then(r => r.json());
      if (res) {
        setActiveProvider(res.active_provider || 'openrouter');
        setSelectedModel(res.selected_model || 'deepseek/deepseek-v4-pro');
        setHasOpenaiKey(res.has_openai_key);
        setHasAnthropicKey(res.has_anthropic_key);
        setHasOpenrouterKey(res.has_openrouter_key);

        if (res.openai_api_key_masked) setOpenaiKey(res.openai_api_key_masked);
        if (res.anthropic_api_key_masked) setAnthropicKey(res.anthropic_api_key_masked);
        if (res.openrouter_api_key_masked) setOpenrouterKey(res.openrouter_api_key_masked);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchSettings();
      setTestResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const getApiKeyForActiveProvider = () => {
    if (activeProvider === 'openai') return openaiKey;
    if (activeProvider === 'anthropic') return anthropicKey;
    return openrouterKey;
  };

  const handleTestConnection = async () => {
    const key = getApiKeyForActiveProvider();
    if (!key || key.includes('*')) {
      setTestResult({ success: false, message: 'Digite uma chave de API válida (não mascarada) para testar a conexão.' });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/ai/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: activeProvider,
          api_key: key,
          model: selectedModel
        })
      });
      const data = await res.json();
      if (res.ok) {
        setTestResult({ success: true, message: data.message });
      } else {
        setTestResult({ success: false, message: data.detail || 'Falha ao validar chave de API.' });
      }
    } catch (e) {
      setTestResult({ success: false, message: 'Erro de rede ao comunicar com o servidor backend.' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      await fetch('/api/ai/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          active_provider: activeProvider,
          selected_model: selectedModel,
          openai_api_key: openaiKey,
          anthropic_api_key: anthropicKey,
          openrouter_api_key: openrouterKey
        })
      });

      if (onRefreshSettings) onRefreshSettings();
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-white glow-cyan">
              <Bot className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Configurações de Inteligência Artificial</h3>
              <p className="text-xs text-slate-400">Gerenciador de Provedores & API Keys (OpenAI, Anthropic, OpenRouter)</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-lg">✕</button>
        </div>

        <form onSubmit={handleSave} className="space-y-4 text-xs">
          {/* Seletor de Provedor Ativo */}
          <div>
            <label className="block text-slate-300 font-bold mb-2">Selecione o Provedor Principal:</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setActiveProvider('openrouter');
                  setSelectedModel('deepseek/deepseek-v4-pro');
                }}
                className={`p-3 rounded-2xl border text-center font-bold transition flex flex-col items-center gap-1 ${
                  activeProvider === 'openrouter'
                    ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 shadow-md'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <Cpu className="h-4 w-4" /> OpenRouter
                {hasOpenrouterKey && <span className="text-[9px] text-emerald-400 font-bold">Chave Ativa</span>}
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveProvider('openai');
                  setSelectedModel('gpt-4o-mini');
                }}
                className={`p-3 rounded-2xl border text-center font-bold transition flex flex-col items-center gap-1 ${
                  activeProvider === 'openai'
                    ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 shadow-md'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <Sparkles className="h-4 w-4" /> OpenAI
                {hasOpenaiKey && <span className="text-[9px] text-emerald-400 font-bold">Chave Ativa</span>}
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveProvider('anthropic');
                  setSelectedModel('claude-3-5-sonnet-20241022');
                }}
                className={`p-3 rounded-2xl border text-center font-bold transition flex flex-col items-center gap-1 ${
                  activeProvider === 'anthropic'
                    ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 shadow-md'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <Bot className="h-4 w-4" /> Anthropic
                {hasAnthropicKey && <span className="text-[9px] text-emerald-400 font-bold">Chave Ativa</span>}
              </button>
            </div>
          </div>

          {/* Seletor de Modelos */}
          <div>
            <label className="block text-slate-300 font-bold mb-1">Modelo de IA Selecionado:</label>
            <select
              value={selectedModel}
              onChange={e => setSelectedModel(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-medium focus:border-cyan-500 focus:outline-none"
            >
              {activeProvider === 'openrouter' && (
                <>
                  <option value="deepseek/deepseek-v4-pro">DeepSeek v4 Pro (Recomendado - Raciocínio Clínico)</option>
                  <option value="google/gemini-2.5-flash">Google Gemini 2.5 Flash (Ultra Rápido)</option>
                  <option value="deepseek/deepseek-r1">DeepSeek R1 (Raciocínio Profundo)</option>
                  <option value="anthropic/claude-3.5-sonnet">Anthropic Claude 3.5 Sonnet (via OpenRouter)</option>
                  <option value="openai/gpt-4o">OpenAI GPT-4o (via OpenRouter)</option>
                </>
              )}

              {activeProvider === 'openai' && (
                <>
                  <option value="gpt-4o-mini">GPT-4o Mini (Rápido e Eficiente)</option>
                  <option value="gpt-4o">GPT-4o (Máxima Precisão)</option>
                  <option value="o3-mini">OpenAI o3 Mini (Raciocínio Matemático)</option>
                </>
              )}

              {activeProvider === 'anthropic' && (
                <>
                  <option value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet (Recomendado Anthropic)</option>
                  <option value="claude-3-5-haiku-20241022">Claude 3.5 Haiku (Mais Rápido)</option>
                </>
              )}
            </select>
          </div>

          {/* Chaves de API */}
          <div className="space-y-3 pt-2">
            <div>
              <label className="block text-slate-400 mb-1 flex items-center justify-between">
                <span>Chave API OpenRouter</span>
                {hasOpenrouterKey && <span className="text-emerald-400 font-semibold">Salva no Banco</span>}
              </label>
              <input
                type="password"
                placeholder="sk-or-v1-..."
                value={openrouterKey}
                onChange={e => setOpenrouterKey(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 flex items-center justify-between">
                <span>Chave API OpenAI</span>
                {hasOpenaiKey && <span className="text-emerald-400 font-semibold">Salva no Banco</span>}
              </label>
              <input
                type="password"
                placeholder="sk-proj-..."
                value={openaiKey}
                onChange={e => setOpenaiKey(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 flex items-center justify-between">
                <span>Chave API Anthropic</span>
                {hasAnthropicKey && <span className="text-emerald-400 font-semibold">Salva no Banco</span>}
              </label>
              <input
                type="password"
                placeholder="sk-ant-..."
                value={anthropicKey}
                onChange={e => setAnthropicKey(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono"
              />
            </div>
          </div>

          {/* Resultado do Teste */}
          {testResult && (
            <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
              testResult.success
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
            }`}>
              {testResult.success ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
              <span>{testResult.message}</span>
            </div>
          )}

          {/* Botões do Rodapé */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTesting}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold border border-slate-700 transition"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isTesting ? 'animate-spin' : ''}`} />
              {isTesting ? 'Validando...' : 'Testar Chave'}
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold glow-cyan transition"
              >
                {isSaving ? 'Salvando...' : 'Salvar Configurações'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
