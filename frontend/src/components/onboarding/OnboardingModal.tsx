import React, { useState, useEffect, useMemo } from 'react'
import {
  Sparkles,
  Activity,
  ShieldCheck,
  Dumbbell,
  User,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Bot,
  HeartPulse,
  Scale,
  Ruler,
  Calendar,
  Key,
  ExternalLink,
  Target,
  RefreshCw,
  AlertCircle,
  HelpCircle,
} from 'lucide-react'

import { Modal, FormField, Input, Select, Button, StatusBadge } from '../ui'
import { ProfileData } from '../profile/ProfileTypes'
import { HevyStatus, ZeppStatus } from '../../types'
import { requestJson, ApiError } from '../../lib/api'

export interface OnboardingModalProps {
  isOpen: boolean
  onClose: () => void
  profile: ProfileData
  onComplete: (updatedProfile?: any, startSync?: boolean) => void
  onOpenGoogleHealthModal?: () => void
}

type ProviderAI = 'openrouter' | 'openai' | 'anthropic'
type PrivacyMode = 'minimal' | 'full'

const LONGEVITY_GOAL_OPTIONS = [
  { id: 'cardiovascular', label: 'Saúde Cardiovascular & VO₂ Max', desc: 'ApoB reduzido e maior capacidade aeróbica' },
  { id: 'hypertrophy', label: 'Hipertrofia & Força Muscular', desc: 'Prevenção de sarcopenia e massa magra' },
  { id: 'phenoage', label: 'Rejuvenescimento Celular (PhenoAge)', desc: 'Desaceleração da idade biológica' },
  { id: 'metabolism', label: 'Sensibilidade à Insulina', desc: 'Controle glicêmico e flexibilidade metabólica' },
  { id: 'sleep', label: 'Otimização do Sono & HRV', desc: 'Recuperação do sistema nervoso autônomo' },
]

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onClose,
  profile,
  onComplete,
  onOpenGoogleHealthModal,
}) => {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1)

  // ── Etapa 1: Perfil Clínico & Biometria ─────────────────────────────────
  const [name, setName] = useState(profile.name && profile.name !== 'Paciente' ? profile.name : '')
  const [birthdate, setBirthdate] = useState(profile.birthdate || '')
  const [gender, setGender] = useState(profile.gender || 'Masculino')
  const [heightCm, setHeightCm] = useState<string>(profile.height_cm ? String(profile.height_cm) : '')
  const [currentWeightKg, setCurrentWeightKg] = useState<string>(profile.current_weight_kg ? String(profile.current_weight_kg) : '')
  const [targetWeightKg, setTargetWeightKg] = useState<string>(profile.target_weight_kg ? String(profile.target_weight_kg) : '')
  const [selectedGoals, setSelectedGoals] = useState<string[]>(profile.longevity_goals || ['cardiovascular', 'sleep'])

  // ── Etapa 2: Provedores (Zepp, Hevy, Google Health) ────────────────────
  const [zeppStatus, setZeppStatus] = useState<ZeppStatus | null>(null)
  const [zeppToken, setZeppToken] = useState('')
  const [zeppUserId, setZeppUserId] = useState('')
  const [zeppHost, setZeppHost] = useState('api-mifit-us3.zepp.com')
  const [isSavingZepp, setIsSavingZepp] = useState(false)
  const [zeppFeedback, setZeppFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const [hevyStatus, setHevyStatus] = useState<HevyStatus | null>(null)
  const [hevyKey, setHevyKey] = useState('')
  const [isSavingHevy, setIsSavingHevy] = useState(false)
  const [hevyFeedback, setHevyFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const [googleConnected, setGoogleConnected] = useState<boolean>(Boolean(profile.google_connected))

  // ── Etapa 3: Configuração de IA ────────────────────────────────────────
  const [activeProviderAI, setActiveProviderAI] = useState<ProviderAI>('openrouter')
  const [selectedModel, setSelectedModel] = useState('deepseek/deepseek-v4-flash-0731')
  const [openrouterKey, setOpenrouterKey] = useState('')
  const [openaiKey, setOpenaiKey] = useState('')
  const [anthropicKey, setAnthropicKey] = useState('')
  const [privacyMode, setPrivacyMode] = useState<PrivacyMode>('minimal')
  const [isTestingAI, setIsTestingAI] = useState(false)
  const [aiTestResult, setAiTestResult] = useState<{ success: boolean; message: string } | null>(null)

  // ── Etapa 4: Finalização ───────────────────────────────────────────────
  const [autoSyncOnComplete, setAutoSyncOnComplete] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [globalError, setGlobalError] = useState<string | null>(null)

  // Inicializa dados e carrega status dos provedores ao abrir
  useEffect(() => {
    if (!isOpen) return

    setGlobalError(null)

    // 1. Carrega status Zepp
    void requestJson<ZeppStatus>('/api/zepp/status')
      .then((res) => {
        setZeppStatus(res)
        if (res.user_id) setZeppUserId(res.user_id)
        if (res.masked_app_token) setZeppToken(res.masked_app_token)
        if (res.host) setZeppHost(res.host)
      })
      .catch(() => {})

    // 2. Carrega status Hevy
    void requestJson<HevyStatus>('/api/workouts/hevy/status')
      .then((res) => {
        setHevyStatus(res)
        if (res.masked_api_key) setHevyKey(res.masked_api_key)
      })
      .catch(() => {})

    // 3. Carrega status Google Health
    void requestJson<{ connected?: boolean }>('/api/google-health/status')
      .then((res) => {
        if (res && typeof res.connected === 'boolean') {
          setGoogleConnected(res.connected)
        }
      })
      .catch(() => {})

    // 4. Carrega configurações de IA
    void requestJson<any>('/api/ai/settings')
      .then((res) => {
        if (res.active_provider) setActiveProviderAI(res.active_provider)
        if (res.selected_model) setSelectedModel(res.selected_model)
        if (res.privacy_mode) setPrivacyMode(res.privacy_mode === 'full' ? 'full' : 'minimal')
        if (res.openrouter_api_key_masked) setOpenrouterKey(res.openrouter_api_key_masked)
        if (res.openai_api_key_masked) setOpenaiKey(res.openai_api_key_masked)
        if (res.anthropic_api_key_masked) setAnthropicKey(res.anthropic_api_key_masked)
      })
      .catch(() => {})
  }, [isOpen])

  // Cálculo reativo de idade cronológica
  const calculatedAge = useMemo(() => {
    if (!birthdate) return null
    try {
      const birth = new Date(birthdate)
      if (Number.isNaN(birth.getTime())) return null
      const today = new Date()
      let age = today.getFullYear() - birth.getFullYear()
      const m = today.getMonth() - birth.getMonth()
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        age--
      }
      return age >= 0 && age < 130 ? age : null
    } catch {
      return null
    }
  }, [birthdate])

  // Cálculo reativo de IMC
  const calculatedBmi = useMemo(() => {
    const w = parseFloat(currentWeightKg)
    const h = parseFloat(heightCm)
    if (!Number.isNaN(w) && !Number.isNaN(h) && w > 20 && h > 80) {
      const hm = h / 100
      return (w / (hm * hm)).toFixed(1)
    }
    return null
  }, [currentWeightKg, heightCm])

  const toggleGoal = (id: string) => {
    setSelectedGoals((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]
    )
  }

  // ── Salvar Zepp ────────────────────────────────────────────────────────
  const handleSaveZepp = async () => {
    if (!zeppToken.trim() || !zeppUserId.trim()) {
      setZeppFeedback({ type: 'error', message: 'Preencha o app_token e o user_id do Zepp.' })
      return
    }
    setIsSavingZepp(true)
    setZeppFeedback(null)
    try {
      const res = await requestJson<{ status: string; message: string; masked_app_token: string; user_id: string }>(
        '/api/zepp/credentials',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            app_token: zeppToken.trim(),
            user_id: zeppUserId.trim(),
            host: zeppHost.trim() || 'api-mifit-us3.zepp.com',
          }),
        }
      )
      setZeppFeedback({ type: 'success', message: 'Credenciais Zepp salvas com sucesso!' })
      setZeppToken(res.masked_app_token)
      setZeppStatus({
        configured: true,
        connected: true,
        user_id: res.user_id,
        masked_app_token: res.masked_app_token,
        has_app_token: true,
      })
    } catch (err: any) {
      setZeppFeedback({ type: 'error', message: err?.message || 'Falha ao salvar credenciais do Zepp.' })
    } finally {
      setIsSavingZepp(false)
    }
  }

  // ── Salvar Hevy ────────────────────────────────────────────────────────
  const handleSaveHevy = async () => {
    if (!hevyKey.trim()) {
      setHevyFeedback({ type: 'error', message: 'Informe a API Key do Hevy.' })
      return
    }
    setIsSavingHevy(true)
    setHevyFeedback(null)
    try {
      const res = await requestJson<{ status: string; user: any; masked_api_key: string }>(
        '/api/workouts/hevy/credentials',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ api_key: hevyKey.trim() }),
        }
      )
      setHevyFeedback({
        type: 'success',
        message: `Hevy conectado! Conta: ${res.user?.name || 'Usuário Hevy'}.`,
      })
      setHevyKey(res.masked_api_key)
      setHevyStatus({
        connected: true,
        has_api_key: true,
        masked_api_key: res.masked_api_key,
        user: res.user,
      })
    } catch (err: any) {
      setHevyFeedback({ type: 'error', message: err?.message || 'Chave do Hevy inválida ou erro na conexão.' })
    } finally {
      setIsSavingHevy(false)
    }
  }

  // ── Testar IA ──────────────────────────────────────────────────────────
  const handleTestAI = async () => {
    setIsTestingAI(true)
    setAiTestResult(null)
    const keyToTest =
      activeProviderAI === 'openrouter'
        ? openrouterKey
        : activeProviderAI === 'openai'
        ? openaiKey
        : anthropicKey

    try {
      const res = await requestJson<{ success?: boolean; message?: string }>('/api/ai/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: activeProviderAI,
          model: selectedModel,
          api_key: keyToTest,
        }),
      })
      setAiTestResult({
        success: Boolean(res.success),
        message: res.message || 'Conexão validada com sucesso!',
      })
    } catch (err: any) {
      setAiTestResult({
        success: false,
        message: err?.message || 'Não foi possível validar a chave da IA.',
      })
    } finally {
      setIsTestingAI(false)
    }
  }

  // ── Finalizar Onboarding ───────────────────────────────────────────────
  const handleFinishOnboarding = async (skip: boolean = false) => {
    setIsSubmitting(true)
    setGlobalError(null)

    try {
      if (!skip) {
        // 1. Salva dados de perfil se informados
        const profilePayload: Record<string, any> = {
          onboarding_completed: true,
        }
        if (name.trim()) profilePayload.name = name.trim()
        if (birthdate) profilePayload.birthdate = birthdate
        if (gender) profilePayload.gender = gender
        if (heightCm) profilePayload.height_cm = parseFloat(heightCm)
        if (currentWeightKg) profilePayload.current_weight_kg = parseFloat(currentWeightKg)
        if (targetWeightKg) profilePayload.target_weight_kg = parseFloat(targetWeightKg)
        if (selectedGoals.length > 0) profilePayload.longevity_goals = selectedGoals

        await requestJson('/api/profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(profilePayload),
        })

        // 2. Salva configurações de IA se informadas
        const hasAnyAIKey = Boolean(openrouterKey.trim() || openaiKey.trim() || anthropicKey.trim())
        if (hasAnyAIKey) {
          await requestJson('/api/ai/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              active_provider: activeProviderAI,
              selected_model: selectedModel,
              privacy_mode: privacyMode,
              openrouter_api_key: openrouterKey.trim(),
              openai_api_key: openaiKey.trim(),
              anthropic_api_key: anthropicKey.trim(),
            }),
          }).catch(() => {})
        }
      } else {
        // Marca como concluído mesmo ao pular para não reabrir compulsivamente
        await requestJson('/api/profile/onboarding-complete', {
          method: 'POST',
        })
      }

      const anyProviderActive = Boolean(
        zeppStatus?.configured || hevyStatus?.connected || googleConnected
      )
      const triggerSync = !skip && autoSyncOnComplete && anyProviderActive

      onComplete(
        {
          ...profile,
          name: name.trim() || profile.name,
          onboarding_completed: true,
          birthdate: birthdate || profile.birthdate,
          gender: gender || profile.gender,
          height_cm: heightCm ? parseFloat(heightCm) : profile.height_cm,
          current_weight_kg: currentWeightKg ? parseFloat(currentWeightKg) : profile.current_weight_kg,
          target_weight_kg: targetWeightKg ? parseFloat(targetWeightKg) : profile.target_weight_kg,
          longevity_goals: selectedGoals,
        },
        triggerSync
      )
      onClose()
    } catch (err: any) {
      setGlobalError(err?.message || 'Ocorreu um erro ao concluir o onboarding.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => handleFinishOnboarding(true)}
      title="Bem-vindo ao Longevidade Hub"
      description="Configure seu perfil, dispositivos de monitoramento e copiloto clínico"
      size="3xl"
      icon={
        <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
          <Sparkles className="h-6 w-6" aria-hidden="true" />
        </div>
      }
      closeButtonAriaLabel="Pular configuração inicial"
      contentClassName="space-y-6"
    >
      {/* Indicador de Passos / Stepper */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
        {[
          { num: 1, label: 'Perfil & Metas', icon: User },
          { num: 2, label: 'Provedores', icon: Activity },
          { num: 3, label: 'Inteligência Artificial', icon: Bot },
          { num: 4, label: 'Resumo & Início', icon: CheckCircle2 },
        ].map((step) => {
          const Icon = step.icon
          const isActive = currentStep === step.num
          const isDone = currentStep > step.num

          return (
            <button
              key={step.num}
              type="button"
              onClick={() => setCurrentStep(step.num as any)}
              className={`flex items-center gap-2 text-xs font-bold transition px-2 py-1.5 rounded-radius-md ${
                isActive
                  ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
                  : isDone
                  ? 'text-slate-700 dark:text-slate-300 hover:text-slate-900'
                  : 'text-slate-400 dark:text-slate-600 hover:text-slate-500'
              }`}
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-extrabold ${
                  isActive
                    ? 'bg-emerald-600 text-white'
                    : isDone
                    ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                }`}
              >
                {isDone ? '✓' : step.num}
              </div>
              <span className="hidden sm:inline">{step.label}</span>
            </button>
          )
        })}
      </div>

      {globalError && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-radius-lg text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{globalError}</span>
        </div>
      )}

      {/* ── PASSO 1: DADOS INICIAIS & METAS ─────────────────────────────────── */}
      {currentStep === 1 && (
        <div className="space-y-5 animate-fadeIn">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <User className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              Dados Pessoais e Parâmetros Clínicos
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Esses dados alimentam os cálculos de Idade Cronológica, PhenoAge, KDM e percentil de VO₂ Máximo.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Nome ou como prefere ser chamado">
              <Input
                placeholder="Ex: Carlos"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </FormField>

            <FormField label="Data de Nascimento">
              <Input
                type="date"
                value={birthdate}
                onChange={(e) => setBirthdate(e.target.value)}
              />
            </FormField>

            <FormField label="Sexo Biológico">
              <Select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
              >
                <option value="Masculino">Masculino</option>
                <option value="Feminino">Feminino</option>
                <option value="Outro">Outro</option>
              </Select>
            </FormField>

            <FormField label="Altura (cm)">
              <Input
                type="number"
                placeholder="Ex: 178"
                value={heightCm}
                onChange={(e) => setHeightCm(e.target.value)}
              />
            </FormField>

            <FormField label="Peso Atual (kg)">
              <Input
                type="number"
                step="0.1"
                placeholder="Ex: 76.5"
                value={currentWeightKg}
                onChange={(e) => setCurrentWeightKg(e.target.value)}
              />
            </FormField>

            <FormField label="Meta de Peso (kg)">
              <Input
                type="number"
                step="0.1"
                placeholder="Ex: 74.0"
                value={targetWeightKg}
                onChange={(e) => setTargetWeightKg(e.target.value)}
              />
            </FormField>
          </div>

          {/* Cards de Resumo Clínico em Tempo Real */}
          {(calculatedAge !== null || calculatedBmi !== null) && (
            <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-radius-lg border border-slate-200/80 dark:border-slate-800/80">
              {calculatedAge !== null && (
                <div>
                  <span className="text-xs text-slate-500 dark:text-slate-400">Idade Calculada:</span>
                  <div className="text-sm font-bold text-slate-900 dark:text-white">
                    {calculatedAge} anos
                  </div>
                </div>
              )}
              {calculatedBmi !== null && (
                <div>
                  <span className="text-xs text-slate-500 dark:text-slate-400">IMC Estimado:</span>
                  <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                    {calculatedBmi} kg/m²
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Metas de Longevidade */}
          <div>
            <label className="block text-xs font-bold text-slate-900 dark:text-white mb-2">
              Selecione suas principais metas de longevidade:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {LONGEVITY_GOAL_OPTIONS.map((g) => {
                const isSelected = selectedGoals.includes(g.id)
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => toggleGoal(g.id)}
                    className={`p-3 rounded-radius-lg border text-left transition flex items-start justify-between gap-2 ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100 ring-1 ring-emerald-500/30'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold">{g.label}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{g.desc}</div>
                    </div>
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                        isSelected
                          ? 'border-emerald-600 bg-emerald-600 text-white'
                          : 'border-slate-300 dark:border-slate-700'
                      }`}
                    >
                      {isSelected && <span className="text-xs">✓</span>}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── PASSO 2: PROVEDORES SUPORTADOS ─────────────────────────────────── */}
      {currentStep === 2 && (
        <div className="space-y-5 animate-fadeIn">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Activity className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              Provedores de Saúde e Dispositivos Suportados
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Conecte seus sensores para sincronizar frequência cardíaca, sono, HRV e treinos de força.
            </p>
          </div>

          <div className="space-y-4">
            {/* Card Zepp OS */}
            <div className="p-4 rounded-radius-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-radius-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <Activity className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">Zepp OS (Amazfit)</h4>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      Frequência Cardíaca, Sono Profundo/REM, HRV e Passos
                    </span>
                  </div>
                </div>
                {zeppStatus?.configured ? (
                  <StatusBadge variant="success">Configurado</StatusBadge>
                ) : (
                  <StatusBadge variant="neutral">Não Configurado</StatusBadge>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                <Input
                  placeholder="app_token do Zepp"
                  value={zeppToken}
                  onChange={(e) => setZeppToken(e.target.value)}
                />
                <Input
                  placeholder="user_id do Zepp"
                  value={zeppUserId}
                  onChange={(e) => setZeppUserId(e.target.value)}
                />
              </div>

              {zeppFeedback && (
                <div
                  className={`text-xs p-2 rounded-radius-md flex items-center gap-1.5 ${
                    zeppFeedback.type === 'success'
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : 'bg-red-500/10 text-red-600 dark:text-red-400'
                  }`}
                >
                  {zeppFeedback.type === 'success' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
                  <span>{zeppFeedback.message}</span>
                </div>
              )}

              <div className="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                <span className="text-slate-500">Host padrão: {zeppHost}</span>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleSaveZepp}
                  loading={isSavingZepp}
                  loadingText="Salvando..."
                >
                  Salvar Zepp
                </Button>
              </div>
            </div>

            {/* Card Hevy */}
            <div className="p-4 rounded-radius-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-radius-md bg-purple-500/10 text-purple-600 dark:text-purple-400">
                    <Dumbbell className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">Hevy (Musculação & Carga)</h4>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      Séries, repetições, volume de treino e exercícios
                    </span>
                  </div>
                </div>
                {hevyStatus?.connected ? (
                  <StatusBadge variant="success">Conectado</StatusBadge>
                ) : (
                  <StatusBadge variant="neutral">Não Conectado</StatusBadge>
                )}
              </div>

              <div className="flex gap-2">
                <Input
                  type="password"
                  placeholder="Hevy API Key (ex: c10ddad3-...)"
                  value={hevyKey}
                  onChange={(e) => setHevyKey(e.target.value)}
                  className="flex-1"
                />
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleSaveHevy}
                  loading={isSavingHevy}
                  loadingText="Testando..."
                >
                  Testar & Conectar
                </Button>
              </div>

              {hevyFeedback && (
                <div
                  className={`text-xs p-2 rounded-radius-md flex items-center gap-1.5 ${
                    hevyFeedback.type === 'success'
                      ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                      : 'bg-red-500/10 text-red-600 dark:text-red-400'
                  }`}
                >
                  {hevyFeedback.type === 'success' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
                  <span>{hevyFeedback.message}</span>
                </div>
              )}
            </div>

            {/* Card Google Health */}
            <div className="p-4 rounded-radius-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xs flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-radius-md bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">Google Health Connect</h4>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Redundância de passos, sono e Pixel Watch via OAuth2
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {googleConnected ? (
                  <StatusBadge variant="success">Conectado</StatusBadge>
                ) : (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      if (onOpenGoogleHealthModal) {
                        onOpenGoogleHealthModal()
                      } else {
                        window.open('/api/google-health/auth-url', '_blank')
                      }
                    }}
                  >
                    Conectar Google
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── PASSO 3: APIS DE INTELIGÊNCIA ARTIFICIAL ───────────────────────── */}
      {currentStep === 3 && (
        <div className="space-y-5 animate-fadeIn">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Bot className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
              Copiloto Clínico de Longevidade por IA
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              O Copiloto cruza HRV, sono, carga de treino e exames laboratoriais para gerar insights de longevidade.
            </p>
          </div>

          {/* Seleção do Provedor de IA */}
          <div className="grid grid-cols-3 gap-2.5" role="radiogroup" aria-label="Provedor de IA">
            {[
              { id: 'openrouter', label: 'OpenRouter', badge: 'Recomendado', desc: 'DeepSeek v4, Claude, Gemini' },
              { id: 'openai', label: 'OpenAI', badge: 'Direto', desc: 'GPT-4o, GPT-4o-mini' },
              { id: 'anthropic', label: 'Anthropic', badge: 'Direto', desc: 'Claude 3.5 Sonnet' },
            ].map((p) => {
              const isSelected = activeProviderAI === p.id
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setActiveProviderAI(p.id as ProviderAI)
                    if (p.id === 'openrouter') setSelectedModel('deepseek/deepseek-v4-flash-0731')
                    if (p.id === 'openai') setSelectedModel('gpt-4o')
                    if (p.id === 'anthropic') setSelectedModel('claude-3-5-sonnet-latest')
                    setAiTestResult(null)
                  }}
                  className={`p-3 rounded-radius-lg border text-left transition flex flex-col justify-between ${
                    isSelected
                      ? 'border-cyan-500 bg-cyan-500/10 text-cyan-900 dark:text-cyan-100 ring-1 ring-cyan-500/30'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-bold">{p.label}</span>
                    <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold">
                      {p.badge}
                    </span>
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-400">{p.desc}</span>
                </button>
              )
            })}
          </div>

          {/* Campo da API Key */}
          <div className="space-y-3 p-4 rounded-radius-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60">
            <FormField label={`Chave de API (${activeProviderAI.toUpperCase()})`}>
              <div className="flex gap-2">
                <Input
                  type="password"
                  placeholder={
                    activeProviderAI === 'openrouter'
                      ? 'sk-or-v1-...'
                      : activeProviderAI === 'openai'
                      ? 'sk-proj-...'
                      : 'sk-ant-...'
                  }
                  value={
                    activeProviderAI === 'openrouter'
                      ? openrouterKey
                      : activeProviderAI === 'openai'
                      ? openaiKey
                      : anthropicKey
                  }
                  onChange={(e) => {
                    const val = e.target.value
                    if (activeProviderAI === 'openrouter') setOpenrouterKey(val)
                    if (activeProviderAI === 'openai') setOpenaiKey(val)
                    if (activeProviderAI === 'anthropic') setAnthropicKey(val)
                  }}
                  className="flex-1 font-mono text-xs"
                />
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleTestAI}
                  loading={isTestingAI}
                  loadingText="Testando..."
                >
                  Testar Chave
                </Button>
              </div>
            </FormField>

            {aiTestResult && (
              <div
                className={`text-xs p-2.5 rounded-radius-md flex items-center gap-2 ${
                  aiTestResult.success
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                    : 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
                }`}
              >
                {aiTestResult.success ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
                <span>{aiTestResult.message}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
              <FormField label="Modelo Selecionado">
                <Input
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="text-xs"
                />
              </FormField>

              <FormField label="Modo de Privacidade">
                <Select
                  value={privacyMode}
                  onChange={(e) => setPrivacyMode(e.target.value as PrivacyMode)}
                >
                  <option value="minimal">Mínimo (Apenas biomarcadores anônimos)</option>
                  <option value="full">Completo (Contexto ampliado de histórico)</option>
                </Select>
              </FormField>
            </div>
          </div>
        </div>
      )}

      {/* ── PASSO 4: RESUMO & FINALIZAÇÃO ─────────────────────────────────── */}
      {currentStep === 4 && (
        <div className="space-y-5 animate-fadeIn">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              Resumo da Configuração Inicial
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Tudo pronto! Revise as informações configuradas antes de entrar no painel de longevidade.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Card Perfil */}
            <div className="p-3.5 rounded-radius-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Perfil</div>
              <div className="text-sm font-bold text-slate-900 dark:text-white truncate">
                {name.trim() || 'Paciente'}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {calculatedAge ? `${calculatedAge} anos` : 'Idade não informada'} · {gender}
              </div>
              {calculatedBmi && (
                <div className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
                  IMC: {calculatedBmi} kg/m²
                </div>
              )}
            </div>

            {/* Card Provedores */}
            <div className="p-3.5 rounded-radius-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Provedores</div>
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Zepp (Amazfit):</span>
                  <span className={zeppStatus?.configured ? 'text-emerald-600 font-bold' : 'text-slate-400'}>
                    {zeppStatus?.configured ? 'Ativo' : 'Pendente'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Hevy (Musculação):</span>
                  <span className={hevyStatus?.connected ? 'text-purple-600 font-bold' : 'text-slate-400'}>
                    {hevyStatus?.connected ? 'Ativo' : 'Pendente'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Google Health:</span>
                  <span className={googleConnected ? 'text-blue-600 font-bold' : 'text-slate-400'}>
                    {googleConnected ? 'Conectado' : 'Pendente'}
                  </span>
                </div>
              </div>
            </div>

            {/* Card IA */}
            <div className="p-3.5 rounded-radius-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Copiloto IA</div>
              <div className="text-sm font-bold text-cyan-600 dark:text-cyan-400 capitalize">
                {activeProviderAI}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate" title={selectedModel}>
                {selectedModel}
              </div>
              <div className="text-xs text-slate-400 mt-1">
                Privacidade: {privacyMode === 'full' ? 'Completa' : 'Mínima'}
              </div>
            </div>
          </div>

          {/* Checkbox de Sincronização Inicial */}
          <label className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-900/60 rounded-radius-lg border border-slate-200 dark:border-slate-800 cursor-pointer text-xs text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={autoSyncOnComplete}
              onChange={(e) => setAutoSyncOnComplete(e.target.checked)}
              className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
            />
            <span>
              Iniciar a primeira sincronização de dados de saúde e treinos imediatamente ao concluir.
            </span>
          </label>
        </div>
      )}

      {/* ── RODAPÉ COM NAVEGAÇÃO ENTRE PASSOS ──────────────────────────────── */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
        <div>
          {currentStep > 1 ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              leftIcon={ChevronLeft}
              onClick={() => setCurrentStep((prev) => (prev - 1) as any)}
            >
              Voltar
            </Button>
          ) : (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => handleFinishOnboarding(true)}
              className="text-slate-500"
            >
              Pular por enquanto
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {currentStep < 4 ? (
            <Button
              type="button"
              variant="primary"
              size="sm"
              rightIcon={ChevronRight}
              onClick={() => setCurrentStep((prev) => (prev + 1) as any)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
            >
              Próximo
            </Button>
          ) : (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => handleFinishOnboarding(false)}
              loading={isSubmitting}
              loadingText="Concluindo..."
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4"
            >
              Concluir e Começar
            </Button>
          )}
        </div>
      </div>
    </Modal>
  )
}
