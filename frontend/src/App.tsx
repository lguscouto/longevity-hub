import React, { useEffect, useRef, useState, Suspense, lazy } from 'react'
import { Activity, ChevronDown, Flame, Footprints, Heart, Moon, RefreshCw, Shield, Wind, Zap } from 'lucide-react'

import { Header } from './components/Header'
import { MetricCard } from './components/MetricCard'
import { ErrorBoundary } from './components/ErrorBoundary'

// Lazy-loaded heavy components
const PhenoAgeWidget = lazy(() => import('./components/PhenoAgeWidget').then(m => ({ default: m.PhenoAgeWidget })))
const LabResultsTable = lazy(() => import('./components/LabResultsTable').then(m => ({ default: m.LabResultsTable })))
const NOf1Tracker = lazy(() => import('./components/NOf1Tracker').then(m => ({ default: m.NOf1Tracker })))
const CGMDashboard = lazy(() => import('./components/CGMDashboard').then(m => ({ default: m.CGMDashboard })))
const ProfileView = lazy(() => import('./components/ProfileView').then(m => ({ default: m.ProfileView })))
const AICopilotView = lazy(() => import('./components/AICopilotView').then(m => ({ default: m.AICopilotView })))
const SupplementsView = lazy(() => import('./components/SupplementsView').then(m => ({ default: m.SupplementsView })))
const DoctorBriefingModal = lazy(() => import('./components/DoctorBriefingModal').then(m => ({ default: m.DoctorBriefingModal })))
const AISettingsModal = lazy(() => import('./components/AISettingsModal').then(m => ({ default: m.AISettingsModal })))
const SyncProgressModal = lazy(() => import('./components/SyncProgressModal').then(m => ({ default: m.SyncProgressModal })))
const PipelineStatusPanel = lazy(() => import('./components/PipelineStatusPanel').then(m => ({ default: m.PipelineStatusPanel })))
const ManualEntryModal = lazy(() => import('./components/ManualEntryModal').then(m => ({ default: m.ManualEntryModal })))
const DailyComplianceWidget = lazy(() => import('./components/DailyComplianceWidget').then(m => ({ default: m.DailyComplianceWidget })))
const PhysicalAssessmentsView = lazy(() => import('./components/PhysicalAssessmentsView').then(m => ({ default: m.PhysicalAssessmentsView })))
const SleepView = lazy(() => import('./components/SleepView').then(m => ({ default: m.SleepView })))
const GoogleHealthAuthModal = lazy(() => import('./components/GoogleHealthAuthModal').then(m => ({ default: m.GoogleHealthAuthModal })))
const WorkoutsTable = lazy(() => import('./components/WorkoutsTable').then(m => ({ default: m.WorkoutsTable })))
const WorkoutsView = lazy(() => import('./components/WorkoutsView').then(m => ({ default: m.WorkoutsView })))


import { DateNavigator } from './components/DateNavigator'
import { DataConfidenceBadge } from './components/DataConfidenceBadge'
import { DailyGuidanceCard } from './components/DailyGuidanceCard'
import { DailyCheckinCard } from './components/DailyCheckinCard'
import { TrainingLoadWidget } from './components/TrainingLoadWidget'
import { EnergyCircadianWidget } from './components/EnergyCircadianWidget'
import { ApiError, requestJson } from './lib/api'
import type { PipelineRun } from './components/PipelineStatusPanel'

type Tab = 'overview' | 'workouts' | 'labs' | 'supplements' | 'sleep' | 'ai' | 'n-of-1' | 'physical-assessments' | 'profile'

type DailyMetric = {
  date_ref: string
  steps?: number | null
  rhr_bpm?: number | null
  hrv_ms?: number | null
  sleep_minutes?: number | null
  sleep_deep_min?: number | null
  sleep_light_min?: number | null
  sleep_rem_min?: number | null
  vo2_max?: number | null
  systolic_bp?: number | null
  diastolic_bp?: number | null
  spo2_avg_pct?: number | null
  spo2_min_pct?: number | null
  respiratory_rate_rpm?: number | null
  pai_score?: number | null
  training_load_daily?: number | null
  training_load_rolling?: number | null
  training_load_optimal_min?: number | null
  training_load_optimal_max?: number | null
  workout_count?: number | null
  workout_duration_min?: number | null
  calories?: number | null
}

type SyncResult = {
  status: 'ok' | 'error' | 'warning'
  message?: string
  zepp_records_imported?: number
  google_health_records_imported?: number
  total_sources?: number
}

const NO_DATA_LABEL = 'Sem dados para a data'

function formatSleepMinutes(totalMinutes: number | null | undefined): string {
  if (totalMinutes == null || Number.isNaN(totalMinutes)) return '—'
  const safeMinutes = Math.max(0, Math.round(totalMinutes))
  const hours = Math.floor(safeMinutes / 60)
  const minutes = safeMinutes % 60
  return `${hours}h ${String(minutes).padStart(2, '0')}m`
}

function formatDecimal(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '—'
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(value)
}

const VALID_TABS: Tab[] = ['overview', 'workouts', 'labs', 'supplements', 'sleep', 'ai', 'n-of-1', 'physical-assessments', 'profile']

function getInitialTab(): Tab {
  try {
    const hash = window.location.hash.replace('#', '').trim() as Tab
    if (hash && VALID_TABS.includes(hash)) {
      return hash
    }
    const saved = localStorage.getItem('longevidade_active_tab') as Tab | null
    if (saved && VALID_TABS.includes(saved)) {
      return saved
    }
  } catch {
    // fallback
  }
  return 'overview'
}

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>(getInitialTab)
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [daysRange, setDaysRange] = useState<number>(30)

  useEffect(() => {
    try {
      localStorage.setItem('longevidade_active_tab', activeTab)
      if (window.location.hash !== `#${activeTab}`) {
        window.location.hash = activeTab
      }
    } catch {
      // ignore
    }
  }, [activeTab])

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '').trim() as Tab
      if (hash && VALID_TABS.includes(hash)) {
        setActiveTab(hash)
      }
    }
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  const [metrics, setMetrics] = useState<DailyMetric[]>([])
  const [labs, setLabs] = useState<any[]>([])
  const [phenoHistory, setPhenoHistory] = useState<any[]>([])
  const [latestKdmRecord, setLatestKdmRecord] = useState<any | null>(null)
  const [experiments, setExperiments] = useState<any[]>([])
  const [cgmSummaries, setCgmSummaries] = useState<any[]>([])
  const [profile, setProfile] = useState<any>({
    name: 'Paciente Longevidade',
    chronological_age: 40,
    height_cm: 170,
    current_weight_kg: 72.5,
    target_weight_kg: 75,
  })

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showManualModal, setShowManualModal] = useState(false)
  const [showDoctorModal, setShowDoctorModal] = useState(false)
  const [showAISettings, setShowAISettings] = useState(false)
  const [showGoogleHealthModal, setShowGoogleHealthModal] = useState(false)
  const [doctorBriefingMd, setDoctorBriefingMd] = useState('')

  const [isSyncing, setIsSyncing] = useState(false)
  const [isSyncingGoogle, setIsSyncingGoogle] = useState(false)
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null)
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false)
  const [showWorkoutsTable, setShowWorkoutsTable] = useState(false)

  const [pipelineRuns, setPipelineRuns] = useState<PipelineRun[]>([])
  const [pipelineLoading, setPipelineLoading] = useState(false)

  const historySectionRef = useRef<HTMLDivElement>(null)

  const [aiChatMessages, setAiChatMessages] = useState<Array<{ sender: 'user' | 'ai'; text: string; time: string }>>([
    {
      sender: 'ai',
      text: 'Olá! Sou o seu Copiloto de Inteligência de Longevidade. Como posso ajudar hoje?',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ])

  const manualTriggerRef = useRef<HTMLButtonElement>(null)
  const refreshSequence = useRef(0)

  const activeMetric = metrics.find((metric) => metric.date_ref === selectedDate) ?? null
  const hasMetric = Boolean(activeMetric)

  const metricCards = [
    {
      title: 'PASSOS 24H',
      value: hasMetric && activeMetric?.steps != null ? activeMetric.steps.toLocaleString('pt-BR') : '—',
      unit: hasMetric && activeMetric?.steps != null ? 'passos' : undefined,
      subtitle: hasMetric ? 'Meta: 10.000' : NO_DATA_LABEL,
      icon: Footprints,
      color: 'emerald' as const,
    },
    {
      title: 'FC REPOUSO',
      value: hasMetric && activeMetric?.rhr_bpm != null ? `${Math.round(activeMetric.rhr_bpm)} bpm` : '—',
      unit: hasMetric && activeMetric?.rhr_bpm != null ? 'bpm' : undefined,
      subtitle: hasMetric ? 'Meta: < 55 bpm' : NO_DATA_LABEL,
      icon: Heart,
      color: 'emerald' as const,
    },
    {
      title: 'HRV (RMSSD)',
      value: hasMetric && activeMetric?.hrv_ms != null ? `${Math.round(activeMetric.hrv_ms)} ms` : '—',
      unit: hasMetric && activeMetric?.hrv_ms != null ? 'ms' : undefined,
      subtitle: hasMetric ? 'Meta: > 50 ms' : NO_DATA_LABEL,
      icon: Zap,
      color: 'emerald' as const,
    },
    {
      title: 'SONO TOTAL',
      value: hasMetric && activeMetric?.sleep_minutes != null ? formatSleepMinutes(activeMetric.sleep_minutes) : '—',
      subtitle: hasMetric ? 'Meta: 8h' : NO_DATA_LABEL,
      icon: Moon,
      color: 'emerald' as const,
    },
    {
      title: 'CALORIAS ATIVAS',
      value: hasMetric && activeMetric?.calories != null ? `${Math.round(activeMetric.calories)} kcal` : '—',
      unit: hasMetric && activeMetric?.calories != null ? 'kcal' : undefined,
      subtitle: hasMetric ? 'Estimativa 24h' : NO_DATA_LABEL,
      icon: Flame,
      color: 'emerald' as const,
    },
    {
      title: 'VO₂ MÁXIMO',
      value: hasMetric && activeMetric?.vo2_max != null ? `${activeMetric.vo2_max.toFixed(1)}` : '—',
      unit: hasMetric && activeMetric?.vo2_max != null ? 'ml/kg/min' : undefined,
      subtitle: hasMetric ? 'Meta: > 45' : NO_DATA_LABEL,
      icon: Wind,
      color: 'emerald' as const,
    },
    {
      title: 'TAXA RESPIRATÓRIA',
      value: hasMetric && activeMetric?.respiratory_rate_rpm != null ? `${activeMetric.respiratory_rate_rpm.toFixed(1)} rpm` : '—',
      unit: hasMetric && activeMetric?.respiratory_rate_rpm != null ? 'rpm' : undefined,
      subtitle: hasMetric ? 'Normal: 12-20' : NO_DATA_LABEL,
      icon: Activity,
      color: 'emerald' as const,
    },
    {
      title: 'SPO₂ MÉDIO',
      value: hasMetric && activeMetric?.spo2_avg_pct != null ? `${activeMetric.spo2_avg_pct.toFixed(0)}%` : '—',
      unit: hasMetric && activeMetric?.spo2_avg_pct != null ? '%' : undefined,
      subtitle: hasMetric ? 'Meta: ≥ 95%' : NO_DATA_LABEL,
      icon: Shield,
      color: 'emerald' as const,
    },
  ]

  const fetchDashboardData = async () => {
    const sequence = ++refreshSequence.current
    setLoading(true)
    setError(null)

    try {
      const [requiredData, nextKdmRecord] = await Promise.all([
        Promise.all([
          requestJson<DailyMetric[]>(`/api/metrics?days=${daysRange}`),
          requestJson<any[]>('/api/labs'),
          requestJson<any[]>('/api/phenoage/history'),
          requestJson<any[]>('/api/n-of-1'),
          requestJson<any[]>('/api/cgm/summary'),
          requestJson<any>('/api/profile'),
        ]),
        requestJson<any>('/api/kdm/latest').catch(() => null),
      ])

      const [nextMetrics, nextLabs, nextPhenoHistory, nextExperiments, nextCgmSummaries, nextProfile] = requiredData

      if (sequence !== refreshSequence.current) return

      setMetrics(Array.isArray(nextMetrics) ? nextMetrics : [])
      setLabs(Array.isArray(nextLabs) ? nextLabs : [])
      const normalizedPhenoHistory = Array.isArray(nextPhenoHistory) ? nextPhenoHistory : []
      setPhenoHistory(normalizedPhenoHistory)
      const nestedKdmFromPheno = normalizedPhenoHistory[0]?.kdm ?? normalizedPhenoHistory[0]?.kdm_result ?? null
      setLatestKdmRecord(Array.isArray(nextKdmRecord) ? nextKdmRecord[0] ?? nestedKdmFromPheno : nextKdmRecord ?? nestedKdmFromPheno)
      setExperiments(Array.isArray(nextExperiments) ? nextExperiments : [])
      setCgmSummaries(Array.isArray(nextCgmSummaries) ? nextCgmSummaries : [])
      if (nextProfile) setProfile(nextProfile)
    } catch (caught) {
      if (sequence !== refreshSequence.current) return
      setMetrics([])
      setLabs([])
      setPhenoHistory([])
      setLatestKdmRecord(null)
      setExperiments([])
      setCgmSummaries([])
      setError(caught instanceof ApiError ? caught.message : 'Não foi possível carregar os dados do dashboard.')
    } finally {
      if (sequence === refreshSequence.current) setLoading(false)
    }
  }

  useEffect(() => {
    void fetchDashboardData()
  }, [daysRange])

  useEffect(() => {
    if (activeTab === 'profile') {
      void fetchPipelineRuns()
    }
  }, [activeTab])

  const handleSyncZepp = async () => {
    setIsSyncing(true)
    setSyncResult(null)
    setIsSyncModalOpen(true)

    try {
      const result = await requestJson<SyncResult>('/api/metrics/sync/zepp', { method: 'POST' })
      setSyncResult(result)
      if (result.status === 'ok') {
        await requestJson('/api/kdm/calculate', { method: 'POST' }).catch(() => null)
        await fetchDashboardData()
      }
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 409) {
        setSyncResult({
          status: 'warning',
          message: caught.message || 'Sincronização com a nuvem Zepp já está em andamento. Aguarde a conclusão da sincronização atual.',
        })
      } else {
        setSyncResult({
          status: 'error',
          message: caught instanceof ApiError ? caught.message : 'Falha ao sincronizar as fontes.',
        })
      }
    } finally {
      setIsSyncing(false)
    }
  }

  const handleSyncGoogleHealth = async () => {
    try {
      const status = await requestJson<{ connected: boolean; reauthentication_required: boolean }>('/api/google-health/status')
      if (!status.connected || status.reauthentication_required) {
        setShowGoogleHealthModal(true)
        return
      }
    } catch {
      // prossegue para sync se falhar verificação
    }

    setIsSyncingGoogle(true)
    setSyncResult(null)
    setIsSyncModalOpen(true)

    try {
      const result = await requestJson<SyncResult>('/api/google-health/sync', { method: 'POST' })
      setSyncResult(result)
      if (result.status === 'ok') {
        await requestJson('/api/kdm/calculate', { method: 'POST' }).catch(() => null)
        await fetchDashboardData()
      }
    } catch (caught) {
      setSyncResult({
        status: 'error',
        message: caught instanceof ApiError ? caught.message : 'Falha ao sincronizar com Google Health API.',
      })
    } finally {
      setIsSyncingGoogle(false)
    }
  }

  const fetchPipelineRuns = async () => {
    setPipelineLoading(true)
    try {
      const data = await requestJson<PipelineRun[]>('/api/pipeline-runs?limit=20')
      setPipelineRuns(Array.isArray(data) ? data : [])
    } catch {
      setPipelineRuns([])
    } finally {
      setPipelineLoading(false)
    }
  }

  const handleViewPipelineHistory = () => {
    setActiveTab('profile')
    void fetchPipelineRuns()
    if (historySectionRef.current) {
      setTimeout(() => {
        historySectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
    }
  }

  const handleSaveMetric = async (entry: any) => {
    await requestJson('/api/metrics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    })
    await requestJson('/api/kdm/calculate', { method: 'POST' }).catch(() => null)
    await fetchDashboardData()
  }

  const handleRecalculatePheno = async (inputData: any) => {
    try {
      const response = await requestJson<any>('/api/phenoage/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inputData),
      })
      if (response?.saved === false && response?.result) {
        setPhenoHistory((prev) => [{ ...response.result, calculated_at: new Date().toISOString().slice(0, 10) }, ...prev])
        await requestJson('/api/kdm/calculate', { method: 'POST' }).catch(() => null)
      } else {
        await requestJson('/api/kdm/calculate', { method: 'POST' }).catch(() => null)
        await fetchDashboardData()
      }
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Não foi possível recalcular o PhenoAge.')
    }
  }

  const handleCreateExperiment = async (expData: any) => {
    try {
      await requestJson('/api/n-of-1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expData),
      })
      await requestJson('/api/kdm/calculate', { method: 'POST' }).catch(() => null)
      await fetchDashboardData()
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Não foi possível criar o experimento.')
    }
  }

  const handleAddBatchLabs = async (recordsToSave: any[]) => {
    try {
      await requestJson('/api/labs/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chronological_age: profile.chronological_age || 40,
          records: recordsToSave,
        }),
      })
      await requestJson('/api/kdm/calculate', { method: 'POST' }).catch(() => null)
      await fetchDashboardData()
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Não foi possível salvar os exames.')
    }
  }

  const handleUpdateProfile = async (updatedData: any) => {
    try {
      await requestJson('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData),
      })
      await requestJson('/api/kdm/calculate', { method: 'POST' }).catch(() => null)
      await fetchDashboardData()
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Não foi possível atualizar o perfil.')
    }
  }

  const handleOpenDoctorBriefing = async () => {
    try {
      const data = await requestJson<{ markdown: string }>('/api/reports/doctor-briefing')
      setDoctorBriefingMd(data.markdown)
      setShowDoctorModal(true)
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Não foi possível gerar o briefing.')
    }
  }

  const closeManualEntry = () => {
    setShowManualModal(false)
    manualTriggerRef.current?.focus()
  }

  const [guidanceRevision, setGuidanceRevision] = useState<number>(0)

  const handleCheckinUpdated = () => {
    setGuidanceRevision((prev) => prev + 1)
    void fetchDashboardData()
  }

  return (
    <div className="min-h-screen bg-[#f4f7fb] dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-12 font-sans">
      <Header
        activeTab={activeTab}
        setActiveTab={(tab) => setActiveTab(tab as Tab)}
        onSyncZepp={handleSyncZepp}
        onSyncGoogleHealth={handleSyncGoogleHealth}
        onOpenManualEntry={() => setShowManualModal(true)}
        onOpenDoctorBriefing={handleOpenDoctorBriefing}
        onOpenAISettings={() => setShowAISettings(true)}
        isSyncing={isSyncing}
        isSyncingGoogle={isSyncingGoogle}
      />

      <ErrorBoundary>
        <Suspense
          fallback={
            <div className="max-w-7xl mx-auto px-6 py-12">
              <div className="space-y-4 p-8 rounded-2xl bg-white/80 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 animate-pulse">
                <div className="h-8 w-48 bg-slate-200 dark:bg-slate-800 rounded" />
                <div className="h-32 bg-slate-200/60 dark:bg-slate-800/60 rounded-xl" />
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="h-24 bg-slate-200/60 dark:bg-slate-800/60 rounded-xl" />
                  <div className="h-24 bg-slate-200/60 dark:bg-slate-800/60 rounded-xl" />
                  <div className="h-24 bg-slate-200/60 dark:bg-slate-800/60 rounded-xl" />
                </div>
              </div>
            </div>
          }
        >
          <main className="max-w-7xl mx-auto px-3.5 sm:px-6 space-y-5 sm:space-y-8">
            {error && (
              <div role="alert" className="rounded-2xl border border-rose-500/50 bg-rose-500/10 dark:bg-rose-950/40 p-4 text-rose-900 dark:text-rose-100">
                {error}
              </div>
            )}

            {showManualModal && <ManualEntryModal isOpen={showManualModal} onClose={closeManualEntry} onSaveMetric={handleSaveMetric} />}

            {activeTab === 'overview' && (
              <>
                <DateNavigator
                  selectedDate={selectedDate}
                  onDateChange={setSelectedDate}
                  daysRange={daysRange}
                  onDaysRangeChange={setDaysRange}
                />

                <section className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Visão Geral</h2>
                    <DataConfidenceBadge selectedDate={selectedDate} />
                  </div>
                  <button aria-label="Atualizar dados" onClick={() => void fetchDashboardData()} className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 p-2 transition">
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  </button>
                </section>

                <DailyGuidanceCard selectedDate={selectedDate} refreshKey={guidanceRevision} />
              </>
            )}

            <div className={activeTab === 'overview' ? undefined : 'hidden'} aria-hidden={activeTab !== 'overview'}>
              <DailyCheckinCard selectedDate={selectedDate} onCheckinUpdated={handleCheckinUpdated} />
            </div>

            {activeTab === 'overview' && (
              <>
                <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {metricCards.map((card) => (
                    <MetricCard
                      key={card.title}
                      title={card.title}
                      value={card.value}
                      unit={card.unit}
                      subtitle={card.subtitle}
                      icon={card.icon}
                      color={card.color}
                    />
                  ))}
                </section>

                {!loading && !hasMetric && <p className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 text-slate-700 dark:text-slate-300">Sem dados disponíveis para a data selecionada.</p>}

                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="lg:col-span-1">
                    <PhenoAgeWidget latestRecord={phenoHistory[0]} latestKdmRecord={latestKdmRecord} onRecalculate={handleRecalculatePheno} />
                  </div>
                  <div className="lg:col-span-1">
                    <DailyComplianceWidget selectedDate={selectedDate} />
                  </div>
                </div>

                <TrainingLoadWidget
                  dailyLoad={activeMetric?.training_load_daily}
                  rollingLoad={activeMetric?.training_load_rolling}
                  optimalMin={activeMetric?.training_load_optimal_min}
                  optimalMax={activeMetric?.training_load_optimal_max}
                  workoutCount={activeMetric?.workout_count}
                  workoutDurationMin={activeMetric?.workout_duration_min}
                />

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setShowWorkoutsTable((prev) => !prev)}
                      className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors py-1.5 px-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm"
                    >
                      <Activity className="w-4 h-4 text-emerald-500" />
                      <span>{showWorkoutsTable ? 'Ocultar Histórico de Treinos' : 'Ver Histórico Detalhado de Treinos'}</span>
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showWorkoutsTable ? 'rotate-180' : ''}`} />
                    </button>
                  </div>
                  {showWorkoutsTable && (
                    <Suspense fallback={<div className="py-6 text-center text-xs text-slate-400 animate-pulse">Carregando treinos...</div>}>
                      <WorkoutsTable />
                    </Suspense>
                  )}
                </div>


                <EnergyCircadianWidget selectedDate={selectedDate} />

                <CGMDashboard summaries={cgmSummaries} onRefreshData={fetchDashboardData} />
              </>
            )}

            {activeTab === 'workouts' && (
              <Suspense fallback={<div className="py-12 text-center text-slate-400">Carregando painel de treinos...</div>}>
                <WorkoutsView onSyncZepp={handleSyncZepp} isSyncingZepp={isSyncing} />
              </Suspense>
            )}
            {activeTab === 'labs' && <LabResultsTable labs={labs} onAddBatchLabs={handleAddBatchLabs} onRefreshData={fetchDashboardData} />}
            {activeTab === 'supplements' && <SupplementsView selectedDate={selectedDate} />}
            {activeTab === 'sleep' && <SleepView />}
            {activeTab === 'ai' && <AICopilotView onOpenSettings={() => setShowAISettings(true)} chatMessages={aiChatMessages} setChatMessages={setAiChatMessages} />}
            {activeTab === 'n-of-1' && <NOf1Tracker experiments={experiments} onCreateExperiment={handleCreateExperiment} />}
            {activeTab === 'physical-assessments' && <PhysicalAssessmentsView />}
            {activeTab === 'profile' && (
              <ProfileView
                profile={profile}
                onUpdateProfile={handleUpdateProfile}
                pipelineRuns={pipelineRuns}
                pipelineLoading={pipelineLoading}
                onRefreshPipeline={fetchPipelineRuns}
                historySectionRef={historySectionRef}
                onOpenGoogleHealthModal={() => setShowGoogleHealthModal(true)}
              />
            )}
          </main>

          <AISettingsModal isOpen={showAISettings} onClose={() => setShowAISettings(false)} onRefreshSettings={fetchDashboardData} />
          <GoogleHealthAuthModal
            isOpen={showGoogleHealthModal}
            onClose={() => setShowGoogleHealthModal(false)}
            onSyncSuccess={() => {
              void fetchDashboardData()
              void fetchPipelineRuns()
            }}
          />
          <SyncProgressModal
            isOpen={isSyncModalOpen}
            onClose={() => setIsSyncModalOpen(false)}
            isSyncing={isSyncing || isSyncingGoogle}
            syncResult={syncResult}
            onViewHistory={handleViewPipelineHistory}
          />
          <DoctorBriefingModal isOpen={showDoctorModal} onClose={() => setShowDoctorModal(false)} markdownContent={doctorBriefingMd} />
        </Suspense>
      </ErrorBoundary>
    </div>
  )
}
