import React, { useEffect, useState } from 'react'
import { Bot, Sparkles, RefreshCw, CheckCircle2, AlertCircle, Cpu, Moon, Sun } from 'lucide-react'

import { ApiError, requestJson } from '../lib/api'
import { useTheme } from '../context/ThemeContext'

interface AISettingsModalProps {
  isOpen: boolean
  onClose: () => void
  onRefreshSettings?: () => void
}

type Provider = 'openai' | 'anthropic' | 'openrouter'
type PrivacyMode = 'minimal' | 'full'

type SettingsPayload = {
  active_provider?: Provider
  selected_model?: string
  privacy_mode?: PrivacyMode
  has_openai_key?: boolean
  has_anthropic_key?: boolean
  has_openrouter_key?: boolean
  openai_api_key_masked?: string
  anthropic_api_key_masked?: string
  openrouter_api_key_masked?: string
}

const PRIVACY_MODE_DESCRIPTIONS: Record<PrivacyMode, string> = {
  minimal: 'Modo mínimo: não envia nome, nascimento ou histórico completo; usa apenas o contexto essencial para responder.',
  full: 'Modo completo: opt-in para enviar contexto ampliado de perfil e histórico quando você precisar de uma análise mais abrangente.',
}

function normalizePrivacyMode(mode?: string): PrivacyMode {
  return mode === 'full' ? 'full' : 'minimal'
}

export const AISettingsModal: React.FC<AISettingsModalProps> = ({ isOpen, onClose, onRefreshSettings }) => {
  const { theme, setTheme } = useTheme()
  const [activeProvider, setActiveProvider] = useState<Provider>('openrouter')
  const [selectedModel, setSelectedModel] = useState('deepseek/deepseek-v4-pro')
  const [privacyMode, setPrivacyMode] = useState<PrivacyMode>('minimal')
  const [openaiKey, setOpenaiKey] = useState('')
  const [anthropicKey, setAnthropicKey] = useState('')
  const [openrouterKey, setOpenrouterKey] = useState('')
  const [hasOpenaiKey, setHasOpenaiKey] = useState(false)
  const [hasAnthropicKey, setHasAnthropicKey] = useState(false)
  const [hasOpenrouterKey, setHasOpenrouterKey] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [isTesting, setIsTesting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!isOpen) return

    setTestResult(null)
    setSaveError(null)

    void requestJson<SettingsPayload>('/api/ai/settings')
      .then((res) => {
        setActiveProvider(res.active_provider || 'openrouter')
        setSelectedModel(res.selected_model || 'deepseek/deepseek-v4-pro')
        setPrivacyMode(normalizePrivacyMode(res.privacy_mode))

        setHasOpenaiKey(Boolean(res.has_openai_key))
        setHasAnthropicKey(Boolean(res.has_anthropic_key))
        setHasOpenrouterKey(Boolean(res.has_openrouter_key))

        setOpenaiKey(res.openai_api_key_masked || '')
        setAnthropicKey(res.anthropic_api_key_masked || '')
        setOpenrouterKey(res.openrouter_api_key_masked || '')
      })
      .catch((caught) => {
        setSaveError(caught instanceof ApiError ? caught.message : 'Falha ao carregar as configurações de IA.')
      })
  }, [isOpen])

  if (!isOpen) return null

  const handleTestConnection = async () => {
    setIsTesting(true)
    setTestResult(null)

    try {
      const res = await requestJson<{ success?: boolean; message?: string }>('/api/ai/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: activeProvider,
          model: selectedModel,
          api_key:
            activeProvider === 'openrouter'
              ? openrouterKey
              : activeProvider === 'openai'
                ? openaiKey
                : anthropicKey,
        }),
      })

      setTestResult({
        success: Boolean(res.success),
        message: res.message || (res.success ? 'Conexão estabelecida com sucesso!' : 'Falha ao validar chave.'),
      })
    } catch (caught) {
      setTestResult({
        success: false,
        message: caught instanceof ApiError ? caught.message : 'Erro de rede ao comunicar com o servidor backend.',
      })
    } finally {
      setIsTesting(false)
    }
  }

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault()
    setIsSaving(true)
    setSaveError(null)

    try {
      await requestJson('/api/ai/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          active_provider: activeProvider,
          selected_model: selectedModel,
          privacy_mode: privacyMode,
          openai_api_key: openaiKey,
          anthropic_api_key: anthropicKey,
          openrouter_api_key: openrouterKey,
        }),
      })
      onRefreshSettings?.()
      onClose()
    } catch (caught) {
      setSaveError(caught instanceof ApiError ? caught.message : 'Falha ao salvar as configurações.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 dark:bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
      <div
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-5 text-slate-900 dark:text-slate-100"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-settings-title"
      >
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-white glow-cyan">
              <Bot className="h-6 w-6" />
            </div>
            <div>
              <h3 id="ai-settings-title" className="text-base font-bold text-slate-900 dark:text-white">Configurações de Inteligência Artificial</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400">Gerenciador de Provedores & API Keys (OpenAI, Anthropic, OpenRouter)</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-900 dark:hover:text-white text-lg" aria-label="Fechar">
            ✕
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4 text-xs">
          {/* Seção de Aparência / Tema Visual */}
          <div className="border-b border-slate-200 dark:border-slate-800/80 pb-4">
            <label className="block text-slate-800 dark:text-slate-300 font-bold mb-1">Aparência</label>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 mb-2.5">
              Escolha o tema visual utilizado pelo Longevidade Hub.
            </p>
            <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Tema visual">
              <button
                type="button"
                role="radio"
                aria-checked={theme === 'dark'}
                onClick={() => setTheme('dark')}
                className={`p-3 rounded-2xl border text-center font-bold transition flex items-center justify-center gap-2 ${
                  theme === 'dark'
                    ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 shadow-md ring-1 ring-cyan-500/50'
                    : 'bg-slate-100 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <Moon className="h-4 w-4 text-cyan-600 dark:text-cyan-400" /> Escuro
              </button>

              <button
                type="button"
                role="radio"
                aria-checked={theme === 'light'}
                onClick={() => setTheme('light')}
                className={`p-3 rounded-2xl border text-center font-bold transition flex items-center justify-center gap-2 ${
                  theme === 'light'
                    ? 'bg-amber-500/20 border-amber-500 text-amber-700 dark:text-amber-300 shadow-md ring-1 ring-amber-500/50'
                    : 'bg-slate-100 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <Sun className="h-4 w-4 text-amber-600 dark:text-amber-400" /> Claro
              </button>
            </div>
          </div>

          <div>
            <label className="block text-slate-800 dark:text-slate-300 font-bold mb-2">Selecione o Provedor Principal:</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setActiveProvider('openrouter')
                  setSelectedModel('deepseek/deepseek-v4-pro')
                }}
                className={`p-3 rounded-2xl border text-center font-bold transition flex flex-col items-center gap-1 ${
                  activeProvider === 'openrouter'
                    ? 'bg-cyan-500/20 border-cyan-500 text-cyan-700 dark:text-cyan-300 shadow-md'
                    : 'bg-slate-100 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <Cpu className="h-4 w-4" /> OpenRouter
                {hasOpenrouterKey && <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold">Chave Ativa</span>}
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveProvider('openai')
                  setSelectedModel('gpt-4o-mini')
                }}
                className={`p-3 rounded-2xl border text-center font-bold transition flex flex-col items-center gap-1 ${
                  activeProvider === 'openai'
                    ? 'bg-cyan-500/20 border-cyan-500 text-cyan-700 dark:text-cyan-300 shadow-md'
                    : 'bg-slate-100 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <Sparkles className="h-4 w-4" /> OpenAI
                {hasOpenaiKey && <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold">Chave Ativa</span>}
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveProvider('anthropic')
                  setSelectedModel('claude-3-5-sonnet-20241022')
                }}
                className={`p-3 rounded-2xl border text-center font-bold transition flex flex-col items-center gap-1 ${
                  activeProvider === 'anthropic'
                    ? 'bg-cyan-500/20 border-cyan-500 text-cyan-700 dark:text-cyan-300 shadow-md'
                    : 'bg-slate-100 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <Bot className="h-4 w-4" /> Anthropic
                {hasAnthropicKey && <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold">Chave Ativa</span>}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="ai-model-select" className="block text-slate-800 dark:text-slate-300 font-bold mb-1">Modelo de IA Selecionado:</label>
            <select
              id="ai-model-select"
              value={selectedModel}
              onChange={(event) => setSelectedModel(event.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-slate-900 dark:text-white font-medium focus:border-cyan-500 focus:outline-none"
            >
              {activeProvider === 'openrouter' && (
                <>
                  <option value="deepseek/deepseek-v4-pro">DeepSeek v4 Pro (Recomendado - Raciocínio Clínico)</option>
                  <option value="google/gemini-2.5-flash">Google Gemini 2.5 Flash (Ultra Rápido)</option>
                  <option value="deepseek/deepseek-r1">DeepSeek R1 (Raciocínio Profundo)</option>
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

          <div>
            <label htmlFor="ai-privacy-mode" className="block text-slate-800 dark:text-slate-300 font-bold mb-1">Modo de privacidade do contexto IA:</label>
            <select
              id="ai-privacy-mode"
              value={privacyMode}
              onChange={(event) => setPrivacyMode(normalizePrivacyMode(event.target.value))}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-slate-900 dark:text-white font-medium focus:border-cyan-500 focus:outline-none"
            >
              <option value="minimal">Mínimo (padrão)</option>
              <option value="full">Completo (opt-in)</option>
            </select>
            <p className="mt-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 p-3 text-[11px] leading-relaxed text-slate-700 dark:text-slate-300">
              {PRIVACY_MODE_DESCRIPTIONS[privacyMode]}
            </p>
            {privacyMode === 'full' && (
              <div role="alert" className="mt-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-[11px] leading-relaxed text-amber-900 dark:text-amber-200 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-300" />
                <span>Modo completo é opt-in: revise antes de enviar, pois pode incluir contexto ampliado nas chamadas de IA externa.</span>
              </div>
            )}
          </div>

          <div className="space-y-3 pt-2">
            <p className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 p-3 text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
              As chaves ficam no cofre de credenciais local do Windows. Campos vazios ou valores mascarados preservam o estado atual no backend.
            </p>
            <div>
              <label htmlFor="openrouter-api-key" className="block text-slate-600 dark:text-slate-400 mb-1 flex items-center justify-between">
                <span>Chave API OpenRouter</span>
                {hasOpenrouterKey && <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Cofre do Windows</span>}
              </label>
              <input
                id="openrouter-api-key"
                type="password"
                placeholder="Cole a chave OpenRouter aqui ou mantenha mascarada"
                value={openrouterKey}
                onChange={(event) => setOpenrouterKey(event.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-slate-900 dark:text-white font-mono"
              />
            </div>

            <div>
              <label htmlFor="openai-api-key" className="block text-slate-600 dark:text-slate-400 mb-1 flex items-center justify-between">
                <span>Chave API OpenAI</span>
                {hasOpenaiKey && <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Cofre do Windows</span>}
              </label>
              <input
                id="openai-api-key"
                type="password"
                placeholder="Cole a chave OpenAI aqui ou mantenha mascarada"
                value={openaiKey}
                onChange={(event) => setOpenaiKey(event.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-slate-900 dark:text-white font-mono"
              />
            </div>

            <div>
              <label htmlFor="anthropic-api-key" className="block text-slate-600 dark:text-slate-400 mb-1 flex items-center justify-between">
                <span>Chave API Anthropic</span>
                {hasAnthropicKey && <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Cofre do Windows</span>}
              </label>
              <input
                id="anthropic-api-key"
                type="password"
                placeholder="Cole a chave Anthropic aqui ou mantenha mascarada"
                value={anthropicKey}
                onChange={(event) => setAnthropicKey(event.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-slate-900 dark:text-white font-mono"
              />
            </div>
          </div>

          {testResult && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                testResult.success
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-400'
              }`}
            >
              {testResult.success ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
              <span>{testResult.message}</span>
            </div>
          )}

          {saveError && (
            <div className="p-3 rounded-xl border text-xs flex items-center gap-2 bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-400" role="alert">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{saveError}</span>
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTesting}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold border border-slate-200 dark:border-slate-700 transition"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isTesting ? 'animate-spin' : ''}`} />
              {isTesting ? 'Validando...' : 'Testar Chave'}
            </button>

            <div className="flex items-center gap-2">
              <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold border border-slate-200 dark:border-slate-700 transition">
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold glow-cyan transition shadow-md"
              >
                {isSaving ? 'Salvando...' : 'Salvar Configurações'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
