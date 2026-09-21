import React, { useEffect, useState } from 'react'
import {
  Bot,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Cpu,
  Moon,
  Sun,
  Dumbbell,
  Activity,
  Key,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react'

import { ApiError, requestJson } from '../lib/api'
import { useTheme } from '../context/ThemeContext'
import { HevyStatus } from '../types'

interface AISettingsModalProps {
  isOpen: boolean
  onClose: () => void
  onRefreshSettings?: () => void
}

type Provider = 'openai' | 'anthropic' | 'openrouter'
type PrivacyMode = 'minimal' | 'full'
type ModalTab = 'ai' | 'integrations'

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
  const [modalTab, setModalTab] = useState<ModalTab>('ai')

  // Estado de IA
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

  // Estado de Integrações (Hevy)
  const [hevyKey, setHevyKey] = useState('')
  const [hevyStatus, setHevyStatus] = useState<HevyStatus | null>(null)
  const [isTestingHevy, setIsTestingHevy] = useState(false)
  const [isSavingHevy, setIsSavingHevy] = useState(false)
  const [hevyFeedback, setHevyFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  useEffect(() => {
    if (!isOpen) return

    setTestResult(null)
    setSaveError(null)
    setHevyFeedback(null)

    // Carrega configurações de IA
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

    // Carrega status da API do Hevy
    void requestJson<HevyStatus>('/api/workouts/hevy/status')
      .then((res) => {
        setHevyStatus(res)
        if (res.masked_api_key) {
          setHevyKey(res.masked_api_key)
        }
      })
      .catch(() => {})
  }, [isOpen])

  if (!isOpen) return null

  // Testar conexão de IA
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

  // Salvar IA
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

  // Testar ou Salvar Chave Hevy
  const handleSaveHevy = async () => {
    if (!hevyKey.trim()) {
      setHevyFeedback({ type: 'error', message: 'Por favor, informe uma chave de API válida.' })
      return
    }

    setIsSavingHevy(true)
    setHevyFeedback(null)

    try {
      const res = await requestJson<{ status: string; message: string; user: any; masked_api_key: string }>(
        '/api/workouts/hevy/credentials',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ api_key: hevyKey.trim() }),
        }
      )

      setHevyFeedback({
        type: 'success',
        message: `Conexão bem-sucedida! Conta conectada: ${res.user?.name || 'Usuário Hevy'} (${res.user?.id || ''})`,
      })
      setHevyKey(res.masked_api_key)
      setHevyStatus({
        connected: true,
        has_api_key: true,
        masked_api_key: res.masked_api_key,
        user: res.user,
      })
    } catch (err: any) {
      setHevyFeedback({
        type: 'error',
        message: err?.message || 'Falha ao validar a chave da API do Hevy.',
      })
    } finally {
      setIsSavingHevy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 dark:bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
      <div
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-5 text-slate-900 dark:text-slate-100 max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-settings-title"
      >
        {/* Cabeçalho */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-white glow-cyan">
              <Bot className="h-6 w-6" />
            </div>
            <div>
              <h3 id="ai-settings-title" className="text-base font-bold text-slate-900 dark:text-white">
                Configurações & Chaves
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Gerenciador de Inteligência Artificial, Hevy e Wearables
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-900 dark:hover:text-white text-lg font-bold" aria-label="Fechar">
            ✕
          </button>
        </div>

        {/* Alternador de Abas */}
        <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-2xl border border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setModalTab('ai')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
              modalTab === 'ai'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5 text-cyan-500" /> Inteligência Artificial
          </button>
          <button
            type="button"
            onClick={() => setModalTab('integrations')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
              modalTab === 'integrations'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Dumbbell className="h-3.5 w-3.5 text-purple-500" /> Integrações & Hevy
          </button>
        </div>

        {/* Conteúdo Aba IA */}
        {modalTab === 'ai' && (
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

            {/* Provedor de IA */}
            <div>
              <label className="block text-slate-800 dark:text-slate-300 font-bold mb-1">Provedor de LLM</label>
              <div className="grid grid-cols-3 gap-2">
                {(['openrouter', 'openai', 'anthropic'] as Provider[]).map((prov) => (
                  <button
                    key={prov}
                    type="button"
                    onClick={() => {
                      setActiveProvider(prov)
                      if (prov === 'openrouter') setSelectedModel('deepseek/deepseek-v4-pro')
                      if (prov === 'openai') setSelectedModel('gpt-4o')
                      if (prov === 'anthropic') setSelectedModel('claude-3-5-sonnet-20241022')
                    }}
                    className={`p-2 rounded-xl border text-center font-semibold capitalize transition ${
                      activeProvider === prov
                        ? 'bg-cyan-500/10 border-cyan-500 text-cyan-600 dark:text-cyan-400 ring-1 ring-cyan-500/40'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    {prov}
                  </button>
                ))}
              </div>
            </div>

            {/* Chaves de API */}
            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-slate-800 dark:text-slate-300 font-bold mb-1">
                  OpenRouter API Key {hasOpenrouterKey && <span className="text-emerald-500 text-[10px]">● Salva</span>}
                </label>
                <input
                  type="password"
                  placeholder="sk-or-v1-..."
                  value={openrouterKey}
                  onChange={(event) => setOpenrouterKey(event.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-800 dark:text-slate-300 font-bold mb-1">
                  OpenAI API Key {hasOpenaiKey && <span className="text-emerald-500 text-[10px]">● Salva</span>}
                </label>
                <input
                  type="password"
                  placeholder="sk-proj-..."
                  value={openaiKey}
                  onChange={(event) => setOpenaiKey(event.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-800 dark:text-slate-300 font-bold mb-1">
                  Anthropic API Key {hasAnthropicKey && <span className="text-emerald-500 text-[10px]">● Salva</span>}
                </label>
                <input
                  type="password"
                  placeholder="sk-ant-..."
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
                {isTesting ? 'Validando...' : 'Testar Chave IA'}
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
                  {isSaving ? 'Salvando...' : 'Salvar IA'}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Conteúdo Aba Integrações & Wearables */}
        {modalTab === 'integrations' && (
          <div className="space-y-5 text-xs">
            {/* Card Hevy */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    <Dumbbell className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">Hevy Public API</h4>
                    <p className="text-[11px] text-slate-500">Sincronização de treinos de força, séries, repetições e cargas.</p>
                  </div>
                </div>

                {hevyStatus?.connected ? (
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 font-bold text-[10px]">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                    Conectado
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 font-bold text-[10px]">
                    Pendente
                  </span>
                )}
              </div>

              {hevyStatus?.user && (
                <div className="p-2.5 rounded-xl bg-purple-500/5 border border-purple-500/20 text-[11px] text-purple-300 flex items-center justify-between">
                  <span>Atleta conectado: <strong>{hevyStatus.user.name}</strong></span>
                  {hevyStatus.user.url && (
                    <a
                      href={hevyStatus.user.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-purple-400 hover:underline flex items-center gap-1 font-semibold"
                    >
                      Perfil Hevy <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              )}

              {/* Input Hevy API Key */}
              <div>
                <label className="block text-slate-800 dark:text-slate-300 font-bold mb-1 flex items-center justify-between">
                  <span>Chave de API do Hevy (UUID)</span>
                  <a
                    href="https://hevy.com/settings?developer"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-purple-400 hover:underline flex items-center gap-1"
                  >
                    Obter Chave no Hevy Pro <ExternalLink className="h-3 w-3" />
                  </a>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="c10ddad3-e147-496b-ba35-..."
                    value={hevyKey}
                    onChange={(e) => setHevyKey(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-slate-900 dark:text-white font-mono text-xs focus:border-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              {hevyFeedback && (
                <div
                  className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                    hevyFeedback.type === 'success'
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-400'
                  }`}
                >
                  {hevyFeedback.type === 'success' ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                  ) : (
                    <AlertCircle className="h-4 w-4 shrink-0" />
                  )}
                  <span>{hevyFeedback.message}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleSaveHevy}
                  disabled={isSavingHevy}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold transition shadow-md disabled:opacity-50"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isSavingHevy ? 'animate-spin' : ''}`} />
                  {isSavingHevy ? 'Testando & Salvando...' : 'Testar & Salvar Hevy'}
                </button>
              </div>
            </div>

            {/* Outras Integrações */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-emerald-500" />
                  <span className="font-bold text-slate-800 dark:text-slate-200">Zepp / Amazfit</span>
                </div>
                <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  Pronto para Sincronização
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Os dados de corrida, cardio e métricas diárias são importados diretamente dos snapshots do Zepp Life / Amazfit.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
