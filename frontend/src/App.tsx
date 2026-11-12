import React, { useCallback, useEffect, useLayoutEffect, useRef, useState, Suspense, lazy } from 'react'
import { createPortal } from 'react-dom'
import { Activity, ChevronDown, Dna, Flame, Footprints, Heart, Moon, PlusCircle, RefreshCw, Shield, Wind, Zap } from 'lucide-react'

import { Header } from './components/Header'
import { MetricCard } from './components/MetricCard'
import { OverviewSection } from './components/OverviewSection'
import { ErrorBoundary } from './components/ErrorBoundary'

// Lazy-loaded heavy components
const PhenoAgeWidget = lazy(() => import('./components/PhenoAgeWidget').then(m => ({ default: m.PhenoAgeWidget })))
const LabResultsTable = lazy(() => import('./components/LabResultsTable').then(m => ({ default: m.LabResultsTable })))
const BiomarkersView = lazy(() => import('./components/labs/BiomarkersView').then(m => ({ default: m.BiomarkersView })))
const NOf1Tracker = lazy(() => import('./components/NOf1Tracker').then(m => ({ default: m.NOf1Tracker })))
const CGMDashboard = lazy(() => import('./components/CGMDashboard').then(m => ({ default: m.CGMDashboard })))
const ProfileView = lazy(() => import('./components/ProfileView').then(m => ({ default: m.ProfileView })))
const AICopilotView = lazy(() => import('./components/AICopilotView').then(m => ({ default: m.AICopilotView })))
const SupplementsView = lazy(() => import('./components/SupplementsView').then(m => ({ default: m.SupplementsView })))
const DoctorBriefingModal = lazy(() => import('./components/DoctorBriefingModal').then(m => ({ default: m.DoctorBriefingModal })))
const AISettingsModal = lazy(() => import('./components/AISettingsModal').then(m => ({ default: m.AISettingsModal })))
const SyncProgressModal = lazy(() => import('./components/SyncProgressModal').then(m => ({ default: m.SyncProgressModal })))
const ManualEntryModal = lazy(() => import('./components/ManualEntryModal').then(m => ({ default: m.ManualEntryModal })))
const DailyComplianceWidget = lazy(() => import('./components/DailyComplianceWidget').then(m => ({ default: m.DailyComplianceWidget })))
const PhysicalAssessmentsView = lazy(() => import('./components/PhysicalAssessmentsView').then(m => ({ default: m.PhysicalAssessmentsView })))
const PersonalTrainerView = lazy(() => import('./components/PersonalTrainerView').then(m => ({ default: m.PersonalTrainerView })))
const SleepView = lazy(() => import('./components/SleepView').then(m => ({ default: m.SleepView })))
const DailyStepsView = lazy(() => import('./components/steps/DailyStepsView').then(m => ({ default: m.DailyStepsView })))
const GoogleHealthAuthModal = lazy(() => import('./components/GoogleHealthAuthModal').then(m => ({ default: m.GoogleHealthAuthModal })))
const WorkoutsTable = lazy(() => import('./components/WorkoutsTable').then(m => ({ default: m.WorkoutsTable })))
const WorkoutsView = lazy(() => import('./components/WorkoutsView').then(m => ({ default: m.WorkoutsView })))
const TimelineView = lazy(() => import('./components/timeline/TimelineView').then(m => ({ default: m.TimelineView })))
const OnboardingModal = lazy(() => import('./components/onboarding/OnboardingModal').then(m => ({ default: m.OnboardingModal })))
const DashboardCoverage = lazy(() => import('./components/dashboard/DashboardSeries').then(m => ({ default: m.DashboardCoverage })))
const DashboardHistoryChart = lazy(() => import('./components/dashboard/DashboardSeries').then(m => ({ default: m.DashboardHistoryChart })))
const DashboardMetricTile = lazy(() => import('./components/dashboard/DashboardSeries').then(m => ({ default: m.DashboardMetricTile })))
const DashboardTrendChart = lazy(() => import('./components/dashboard/DashboardSeries').then(m => ({ default: m.DashboardTrendChart })))


import { Button, EmptyState, LoadingIndicator, Modal, Select, useToast } from './components/ui'
import { DateNavigator } from './components/DateNavigator'
import { DataConfidenceBadge } from './components/DataConfidenceBadge'
import { DailyGuidanceCard } from './components/DailyGuidanceCard'
import { DailyCheckinCard } from './components/DailyCheckinCard'
import { TrainingLoadWidget } from './components/TrainingLoadWidget'
import { EnergyCircadianWidget } from './components/EnergyCircadianWidget'
import { ApiError, requestJson } from './lib/api'
import { formatLocalDateKey, formatLastSyncDisplay } from './lib/formatters'
import type { PipelineRun } from './components/PipelineStatusPanel'
import type { SyncState } from './components/ui/SyncStatusBadge'
import type { SyncResult } from './components/SyncProgressModal'
import { DashboardEditor } from './components/dashboard/DashboardEditor'
import { CustomDashboard } from './components/dashboard/CustomDashboard'
import { calendarRange } from './components/dashboard/dateRange'
import {
  DASHBOARD_MODELS,
  DASHBOARD_STORAGE_KEY,
  readDashboardPreferences,
  type CustomModel,
  type DashboardLayout,
  type DashboardPreferences,
  type WidgetId,
} from './components/dashboard/preferences'

type Tab =
  | 'overview'
  | 'today'
  | 'timeline'
  | 'workouts'
  | 'labs'
  | 'biomarkers'
  | 'steps'
  | 'health'
  | 'supplements'
  | 'interventions'
  | 'sleep'
  | 'ai'
  | 'n-of-1'
  | 'physical-assessments'
  | 'personal'
  | 'profile'
  | 'integrations'
  | 'system'
  | 'diagnostics'

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

const VALID_TABS: Tab[] = [
  'overview',
  'today',
  'timeline',
  'workouts',
  'labs',
  'biomarkers',
  'steps',
  'health',
  'supplements',
  'interventions',
  'sleep',
  'ai',
  'n-of-1',
  'physical-assessments',
  'personal',
  'profile',
  'integrations',
  'system',
  'diagnostics',
]

function normalizeTab(rawTab: string | null | undefined): Tab {
  if (!rawTab) return 'overview'
  const clean = rawTab.replace(/^#/, '').trim().split(/[?&#/]/)[0].toLowerCase()
  if (clean === 'today') return 'overview'
  if (clean === 'health') return 'labs'
  if (clean === 'biomarcadores') return 'biomarkers'
  if (clean === 'interventions') return 'supplements'
  if (clean === 'diagnostics') return 'system'
  if (clean === 'trainer' || clean === 'treinador' || clean === 'personal-trainer') return 'personal'
  if (VALID_TABS.includes(clean as Tab)) {
    return clean as Tab
  }
  return 'overview'
}

function getInitialTab(): Tab {
  try {
    const hash = window.location.hash
    if (hash) {
      const normalized = normalizeTab(hash)
      if (normalized) return normalized
    }
    const saved = localStorage.getItem('longevidade_active_tab')
    if (saved) {
      const normalized = normalizeTab(saved)
      if (normalized) return normalized
    }
  } catch {
    // fallback
  }
  return 'overview'
}

export default function App({ onOwnerLogout }: { onOwnerLogout?: () => void } = {}) {
  const { showToast } = useToast()
  const [activeTab, setActiveTab] = useState<Tab>(getInitialTab)
  const [selectedDate, setSelectedDate] = useState<string>(() => formatLocalDateKey(new Date()))
  const [daysRange, setDaysRange] = useState<number>(30)
  const [dashboardPreferences, setDashboardPreferences] = useState<DashboardPreferences>(readDashboardPreferences)
  const [isDashboardEditorOpen, setIsDashboardEditorOpen] = useState(false)
  const [isCheckinDialogOpen, setIsCheckinDialogOpen] = useState(false)
  const [dashboardStorageError, setDashboardStorageError] = useState(false)
  const [customMetrics, setCustomMetrics] = useState<DailyMetric[]>([])
  const [customMetricsState, setCustomMetricsState] = useState<'idle' | 'loading' | 'loaded' | 'error'>('idle')
  const [customMetricsError, setCustomMetricsError] = useState<string | null>(null)
  const [customMetricsRetry, setCustomMetricsRetry] = useState(0)
  const [checkinPortalContainer] = useState(() => document.createElement('div'))
  const checkinSlotRef = useRef<HTMLDivElement | null>(null)
  const setCheckinSlot = useCallback((node: HTMLDivElement | null) => {
    checkinSlotRef.current = node
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(DASHBOARD_STORAGE_KEY, JSON.stringify(dashboardPreferences))
      setDashboardStorageError(false)
    } catch {
      setDashboardStorageError(true)
    }
  }, [dashboardPreferences])

  useLayoutEffect(() => {
    const slot = checkinSlotRef.current
    if (slot) {
      if (checkinPortalContainer.parentElement !== slot) slot.appendChild(checkinPortalContainer)
    } else {
      checkinPortalContainer.remove()
    }
  })

  useLayoutEffect(() => () => checkinPortalContainer.remove(), [checkinPortalContainer])

  const prevActiveTabRef = useRef(activeTab)

  const handleSelectTab = (targetTab: string) => {
    const normalized = normalizeTab(targetTab)
    setActiveTab(normalized)
  }

  useEffect(() => {
    if (activeTab !== 'overview') setIsCheckinDialogOpen(false)
  }, [activeTab])

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
      const normalized = normalizeTab(window.location.hash)
      setActiveTab(normalized)
    }
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  useEffect(() => {
    if (prevActiveTabRef.current === 'personal' && activeTab !== 'personal') {
      void fetchDashboardData()
    }
    prevActiveTabRef.current = activeTab
  }, [activeTab])

  useEffect(() => {
    if (activeTab !== 'overview') setIsDashboardEditorOpen(false)
  }, [activeTab])

  const [metrics, setMetrics] = useState<DailyMetric[]>([])
  const [labs, setLabs] = useState<any[]>([])
  const [phenoHistory, setPhenoHistory] = useState<any[]>([])
  const [latestKdmRecord, setLatestKdmRecord] = useState<any | null>(null)
  const [experiments, setExperiments] = useState<any[]>([])
  const [cgmSummaries, setCgmSummaries] = useState<any[]>([])
  const [profile, setProfile] = useState<any>({
    name: 'Paciente Longevidade',
    chronological_age: null,
    height_cm: null,
    current_weight_kg: null,
    target_weight_kg: null,
  })

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [moduleErrors, setModuleErrors] = useState<Record<string, string>>({})
  const [showManualModal, setShowManualModal] = useState(false)
  const [showDoctorModal, setShowDoctorModal] = useState(false)
  const [showAISettings, setShowAISettings] = useState(false)
  const [showGoogleHealthModal, setShowGoogleHealthModal] = useState(false)
  const [showOnboardingModal, setShowOnboardingModal] = useState(false)
  const [doctorBriefingMd, setDoctorBriefingMd] = useState('')

  const [isSyncing, setIsSyncing] = useState(false)
  const [isSyncingGoogle, setIsSyncingGoogle] = useState(false)
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null)
  const [syncState, setSyncState] = useState<SyncState>('never')
  const [dataCoveredUntil, setDataCoveredUntil] = useState<string | null>(null)
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null)
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false)
  const [showWorkoutsTable, setShowWorkoutsTable] = useState(false)

  const [pipelineRuns, setPipelineRuns] = useState<PipelineRun[]>([])
  const [pipelineLoading, setPipelineLoading] = useState(false)

  const historySectionRef = useRef<HTMLDivElement>(null)

  const [aiChatMessages, setAiChatMessages] = useState<Array<{ sender: 'user' | 'ai'; text: string; time: string }>>([
    {
      sender: 'ai',
      text: 'Olá! Sou o seu Copiloto. Como posso ajudar você hoje?',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ])

  const manualTriggerRef = useRef<HTMLButtonElement>(null)
  const refreshSequence = useRef(0)

  const activeMetric = metrics.find((metric) => metric.date_ref === selectedDate) ?? null
  const hasMetric = Boolean(activeMetric)
  const activeCustomLayout = dashboardPreferences.active === 'classic'
    ? null
    : dashboardPreferences.layouts[dashboardPreferences.active]
  const customWidgetsKey = activeCustomLayout?.widgets.map(widget => widget.id).sort().join(',') ?? ''
  const customNeedsMetricRange = activeCustomLayout?.widgets.some(widget =>
    ['metrics', 'training', 'sleep', 'steps', 'chart', 'coverage', 'sleepChart', 'stepsChart'].includes(widget.id),
  ) ?? false
  const customDateRange = calendarRange(selectedDate, daysRange)

  useEffect(() => {
    if (activeTab !== 'overview' || !activeCustomLayout || !customNeedsMetricRange) {
      setCustomMetrics([])
      setCustomMetricsError(null)
      setCustomMetricsState('idle')
      return
    }
    if (loading) {
      setCustomMetrics([])
      setCustomMetricsError(null)
      setCustomMetricsState('loading')
      return
    }
    let isCurrent = true
    const query = new URLSearchParams({ start_date: customDateRange.startDate, end_date: customDateRange.endDate })
    setCustomMetrics([])
    setCustomMetricsError(null)
    setCustomMetricsState('loading')
    requestJson<DailyMetric[]>(`/api/metrics?${query.toString()}`)
      .then(rows => {
        if (!isCurrent) return
        setCustomMetrics(Array.isArray(rows) ? rows : [])
        setCustomMetricsState('loaded')
      })
      .catch(caught => {
        if (!isCurrent) return
        setCustomMetrics([])
        setCustomMetricsError(caught instanceof ApiError ? caught.message : 'Não foi possível carregar o histórico do painel.')
        setCustomMetricsState('error')
      })
    return () => { isCurrent = false }
  }, [activeTab, dashboardPreferences.active, customWidgetsKey, customNeedsMetricRange, selectedDate, daysRange, loading, customMetricsRetry])

  const customActiveMetric = customMetrics.find(metric => metric.date_ref === selectedDate) ?? null

  const primaryMetricCards = [
    {
      title: 'Passos 24h',
      value: hasMetric && activeMetric?.steps != null ? activeMetric.steps.toLocaleString('pt-BR') : '—',
      unit: hasMetric && activeMetric?.steps != null ? 'passos' : undefined,
      rangeType: hasMetric ? ('target' as const) : undefined,
      rangeValue: hasMetric ? '10.000' : undefined,
      sourceKind: 'observed' as const,
      subtitle: hasMetric ? undefined : NO_DATA_LABEL,
      icon: Footprints,
      color: 'emerald' as const,
    },
    {
      title: 'FC Repouso',
      value: hasMetric && activeMetric?.rhr_bpm != null ? `${Math.round(activeMetric.rhr_bpm)} bpm` : '—',
      unit: hasMetric && activeMetric?.rhr_bpm != null ? 'bpm' : undefined,
      rangeType: hasMetric ? ('optimal' as const) : undefined,
      rangeValue: hasMetric ? '< 55 bpm' : undefined,
      sourceKind: 'observed' as const,
      termKey: 'rhr',
      subtitle: hasMetric ? undefined : NO_DATA_LABEL,
      icon: Heart,
      color: 'emerald' as const,
    },
    {
      title: 'HRV (RMSSD)',
      value: hasMetric && activeMetric?.hrv_ms != null ? `${Math.round(activeMetric.hrv_ms)} ms` : '—',
      unit: hasMetric && activeMetric?.hrv_ms != null ? 'ms' : undefined,
      rangeType: hasMetric ? ('optimal' as const) : undefined,
      rangeValue: hasMetric ? '> 50 ms' : undefined,
      sourceKind: 'observed' as const,
      termKey: 'hrv',
      subtitle: hasMetric ? undefined : NO_DATA_LABEL,
      icon: Zap,
      color: 'emerald' as const,
    },
    {
      title: 'Sono Total',
      value: hasMetric && activeMetric?.sleep_minutes != null ? formatSleepMinutes(activeMetric.sleep_minutes) : '—',
      rangeType: hasMetric ? ('target' as const) : undefined,
      rangeValue: hasMetric ? '8h' : undefined,
      sourceKind: 'observed' as const,
      termKey: 'sleep_efficiency',
      subtitle: hasMetric ? undefined : NO_DATA_LABEL,
      icon: Moon,
      color: 'emerald' as const,
    },
    {
      title: 'VO₂ Máximo',
      value: hasMetric && activeMetric?.vo2_max != null ? `${activeMetric.vo2_max.toFixed(1)}` : '—',
      unit: hasMetric && activeMetric?.vo2_max != null ? 'ml/kg/min' : undefined,
      rangeType: hasMetric ? ('optimal' as const) : undefined,
      rangeValue: hasMetric ? '> 45' : undefined,
      sourceKind: 'model' as const,
      termKey: 'vo2max',
      subtitle: hasMetric ? undefined : NO_DATA_LABEL,
      icon: Wind,
      color: 'emerald' as const,
    },
  ]

  const secondaryMetricCards = [
    {
      title: 'Calorias Ativas',
      value: hasMetric && activeMetric?.calories != null ? `${Math.round(activeMetric.calories)} kcal` : '—',
      unit: hasMetric && activeMetric?.calories != null ? 'kcal' : undefined,
      sourceKind: 'model' as const,
      subtitle: hasMetric ? 'Estimativa 24h' : NO_DATA_LABEL,
      icon: Flame,
      color: 'emerald' as const,
    },
    {
      title: 'Taxa Respiratória',
      value: hasMetric && activeMetric?.respiratory_rate_rpm != null ? `${activeMetric.respiratory_rate_rpm.toFixed(1)} rpm` : '—',
      unit: hasMetric && activeMetric?.respiratory_rate_rpm != null ? 'rpm' : undefined,
      rangeType: hasMetric ? ('reference' as const) : undefined,
      rangeValue: hasMetric ? '12-20' : undefined,
      sourceKind: 'observed' as const,
      termKey: 'respiratory_rate',
      subtitle: hasMetric ? undefined : NO_DATA_LABEL,
      icon: Activity,
      color: 'emerald' as const,
    },
    {
      title: 'SpO₂ Médio',
      value: hasMetric && activeMetric?.spo2_avg_pct != null ? `${activeMetric.spo2_avg_pct.toFixed(0)}%` : '—',
      unit: hasMetric && activeMetric?.spo2_avg_pct != null ? '%' : undefined,
      rangeType: hasMetric ? ('reference' as const) : undefined,
      rangeValue: hasMetric ? '≥ 95%' : undefined,
      sourceKind: 'observed' as const,
      subtitle: hasMetric ? undefined : NO_DATA_LABEL,
      icon: Shield,
      color: 'emerald' as const,
    },
  ]

  const fetchDashboardData = async () => {
    const sequence = ++refreshSequence.current
    setLoading(true)
    setError(null)
    const errorsMap: Record<string, string> = {}

    // Modo isolado: quando no Portal do Personal, não busca dados médicos privados
    if (activeTab === 'personal') {
      try {
        const nextProfile = await requestJson<any>('/api/physical-assessments/athlete-profile').catch(() => null)
        if (sequence !== refreshSequence.current) return
        if (nextProfile) setProfile(nextProfile)
        setLoading(false)
        return
      } catch {
        if (sequence !== refreshSequence.current) return
        setLoading(false)
        return
      }
    }

    try {
      const [requiredData, nextKdmRecord, syncStatus] = await Promise.all([
        Promise.all([
          requestJson<DailyMetric[]>(`/api/metrics?days=${daysRange}`),
          requestJson<any[]>('/api/labs').catch((err) => {
            errorsMap['Exames'] = err?.message || 'Falha ao carregar exames'
            return []
          }),
          requestJson<any[]>('/api/phenoage/history').catch((err) => {
            errorsMap['PhenoAge'] = err?.message || 'Falha ao carregar histórico PhenoAge'
            return []
          }),
          requestJson<any[]>('/api/n-of-1').catch(() => { errorsMap['Experimentos'] = 'Falha ao carregar experimentos'; return [] }),
          requestJson<any[]>('/api/cgm/summary').catch(() => { errorsMap['Glicemia'] = 'Falha ao carregar glicemia'; return [] }),
          requestJson<any>('/api/profile'),
        ]),
        requestJson<any>('/api/kdm/latest').catch(() => { errorsMap['KDM'] = 'Falha ao carregar KDM'; return null }),
        requestJson<{ last_sync?: string | null; last_status?: string | null }>('/api/metrics/sync/status').catch(() => { errorsMap['Sincronização'] = 'Falha ao carregar estado da sincronização'; return null }),
      ])

      const [nextMetrics, nextLabs, nextPhenoHistory, nextExperiments, nextCgmSummaries, nextProfile] = requiredData

      if (sequence !== refreshSequence.current) return
      setModuleErrors(errorsMap)

      if (syncStatus?.last_sync) {
        setLastSyncTime(formatLastSyncDisplay(syncStatus.last_sync))
        if (syncStatus.last_status === 'success' || syncStatus.last_status === 'ok') {
          setSyncState('success')
        } else if (syncStatus.last_status === 'partial') {
          setSyncState('partial')
        } else if (syncStatus.last_status === 'error') {
          setSyncState('error')
        }
      }

      setMetrics(Array.isArray(nextMetrics) ? nextMetrics : [])
      setLabs(Array.isArray(nextLabs) ? nextLabs : [])
      const normalizedPhenoHistory = Array.isArray(nextPhenoHistory) ? nextPhenoHistory : []
      setPhenoHistory(normalizedPhenoHistory)
      const nestedKdmFromPheno = normalizedPhenoHistory[0]?.kdm ?? normalizedPhenoHistory[0]?.kdm_result ?? null
      setLatestKdmRecord(Array.isArray(nextKdmRecord) ? nextKdmRecord[0] ?? nestedKdmFromPheno : nextKdmRecord ?? nestedKdmFromPheno)
      setExperiments(Array.isArray(nextExperiments) ? nextExperiments : [])
      setCgmSummaries(Array.isArray(nextCgmSummaries) ? nextCgmSummaries : [])
      if (nextProfile) {
        setProfile(nextProfile)
        if (nextProfile.onboarding_completed === false) {
          setShowOnboardingModal(true)
        }
      }
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
    if (activeTab === 'profile' || activeTab === 'system') {
      void fetchPipelineRuns()
    }
  }, [activeTab])

  const handleSyncZepp = async (full: boolean = false) => {
    if (isSyncing || isSyncingGoogle) return
    setIsSyncing(true)
    setSyncState('syncing')
    setSyncResult(null)
    setIsSyncModalOpen(true)

    try {
      const isFull = full === true
      const endpoint = isFull ? '/api/sync/all?full=true' : '/api/sync/all'
      const result = await requestJson<SyncResult>(endpoint, { method: 'POST' })
      setSyncResult(result)

      const zeppCount =
        typeof result.zepp === 'object'
          ? result.zepp.records_inserted ?? 0
          : typeof result.zepp === 'number'
          ? result.zepp
          : result.zepp_records_imported ?? 0
      const googleCount =
        typeof result.google_health === 'object'
          ? result.google_health.records_inserted ?? 0
          : typeof result.google_health === 'number'
          ? result.google_health
          : result.google_health_records_imported ?? 0
      const hevyCount =
        typeof result.hevy === 'object'
          ? (result.hevy as { records_inserted?: number }).records_inserted ?? 0
          : typeof result.hevy === 'number'
          ? result.hevy
          : result.hevy_records_imported ?? 0
      const importedTotal = zeppCount + googleCount + hevyCount

      const zeppSkipped =
        typeof result.zepp === 'object' ? result.zepp.records_skipped ?? 0 : 0
      const googleSkipped =
        typeof result.google_health === 'object' ? result.google_health.records_skipped ?? 0 : 0
      const hevySkipped =
        typeof result.hevy === 'object' ? (result.hevy as { records_skipped?: number }).records_skipped ?? 0 : 0
      const unprocessable = (result.unprocessable_records ?? 0) + zeppSkipped + googleSkipped + hevySkipped
      const warningsList = (result.warnings ?? []).concat(
        typeof result.zepp === 'object' ? result.zepp.warnings ?? [] : [],
        typeof result.hevy === 'object' ? (result.hevy as { warnings?: string[] }).warnings ?? [] : []
      )

      const coveredUntil =
        result.data_covered_until ||
        (typeof result.zepp === 'object' ? result.zepp.data_covered_until : undefined)
      if (coveredUntil) setDataCoveredUntil(coveredUntil)

      if (result.status === 'ok' || result.status === 'partial') {
        const timeNow = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        setLastSyncTime(`hoje às ${timeNow}`)

        if (result.status === 'partial' || unprocessable > 0 || warningsList.length > 0) {
          setSyncState('partial')
          showToast({
            title: 'Sincronização parcial',
            message: unprocessable || warningsList.length
              ? `${importedTotal} importados · ${unprocessable || warningsList.length} com avisos`
              : `${importedTotal} importados · uma ou mais fontes não foram sincronizadas`,
            type: 'partial',
            duration: 0,
            action: {
              label: 'Ver detalhes',
              onClick: () => setIsSyncModalOpen(true),
            },
          })
        } else {
          setSyncState('success')
          showToast({
            title: 'Sincronização concluída',
            message: importedTotal > 0 ? `${importedTotal} novos registros sincronizados (Zepp, Google e Hevy).` : 'Sincronização concluída. Não encontramos dados novos.',
            type: 'success',
          })
        }
        await requestJson('/api/kdm/calculate', { method: 'POST' }).catch(() => null)
        await fetchDashboardData()
      }
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 409) {
        setSyncState('syncing')
        setSyncResult({
          status: 'warning',
          message: caught.message || 'A sincronização do Zepp já está em andamento. Aguarde a conclusão antes de iniciar outra.',
        })
        showToast({
          title: 'Sincronização em andamento',
          message: 'A sincronização do Zepp já está em andamento. Aguarde a conclusão.',
          type: 'warning',
        })
      } else {
        const errMsg = caught instanceof ApiError ? caught.message : 'Falha ao sincronizar as fontes.'
        const isExp = errMsg.toLowerCase().includes('token') || errMsg.toLowerCase().includes('expirad')
        setSyncState(isExp ? 'expired' : 'error')
        setSyncResult({
          status: isExp ? 'expired' : 'error',
          message: errMsg,
        })
        showToast({
          title: isExp ? 'Token expirado' : 'Falha na sincronização',
          message: errMsg,
          type: 'error',
          duration: 0,
          action: {
            label: isExp ? 'Conectar novamente' : 'Ver detalhes',
            onClick: isExp ? () => setShowGoogleHealthModal(true) : () => setIsSyncModalOpen(true),
          },
        })
      }
    } finally {
      setIsSyncing(false)
    }
  }

  const handleSyncGoogleHealth = async () => {
    if (isSyncing || isSyncingGoogle) return
    try {
      const status = await requestJson<{ connected: boolean; reauthentication_required: boolean }>('/api/google-health/status')
      if (!status.connected || status.reauthentication_required) {
        setSyncState(status.reauthentication_required ? 'expired' : 'disconnected')
        setShowGoogleHealthModal(true)
        return
      }
    } catch {
      // prossegue para sync se falhar verificação
    }

    setIsSyncingGoogle(true)
    setSyncState('syncing')
    setSyncResult(null)
    setIsSyncModalOpen(true)

    try {
      const result = await requestJson<SyncResult>('/api/google-health/sync', { method: 'POST' })
      setSyncResult(result)
      if (result.status === 'ok') {
        const timeNow = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        setLastSyncTime(`hoje às ${timeNow}`)
        setSyncState('success')
        showToast({
          title: 'Google Health sincronizado',
          message: 'Dados de saúde sincronizados com sucesso.',
          type: 'success',
        })
        await requestJson('/api/kdm/calculate', { method: 'POST' }).catch(() => null)
        await fetchDashboardData()
      }
    } catch (caught) {
      const errMsg = caught instanceof ApiError ? caught.message : 'Falha ao sincronizar com Google Health API.'
      const isExp = errMsg.toLowerCase().includes('token') || errMsg.toLowerCase().includes('expirad')
      setSyncState(isExp ? 'expired' : 'error')
      setSyncResult({
        status: isExp ? 'expired' : 'error',
        message: errMsg,
      })
      showToast({
        title: isExp ? 'Token expirado' : 'Falha no Google Health',
        message: errMsg,
        type: 'error',
        duration: 0,
        action: {
          label: isExp ? 'Conectar novamente' : 'Ver detalhes',
          onClick: isExp ? () => setShowGoogleHealthModal(true) : () => setIsSyncModalOpen(true),
        },
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
    setActiveTab('system')
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
    showToast('Medição registrada com sucesso.')
  }

  const handleRecalculatePheno = async (inputData: any) => {
    try {
      const response = await requestJson<any>('/api/phenoage/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inputData),
      })
      if (response?.saved === false && response?.result) {
        setPhenoHistory((prev) => [{ ...response.result, calculated_at: formatLocalDateKey() }, ...prev])
        await requestJson('/api/kdm/calculate', { method: 'POST' }).catch(() => null)
      } else {
        await requestJson('/api/kdm/calculate', { method: 'POST' }).catch(() => null)
        await fetchDashboardData()
      }
      showToast('Estimativa de idade biológica atualizada.')
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
      await fetchDashboardData()
      showToast('Experimento pessoal criado com sucesso.')
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Não foi possível criar o experimento.')
      throw caught
    }
  }

  const handleAddBatchLabs = async (recordsToSave: any[], allowDuplicates = false) => {
    try {
      await requestJson('/api/labs/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          records: recordsToSave,
          confirmed: true,
          allow_duplicates: allowDuplicates,
        }),
      })
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Não foi possível salvar os exames.')
      throw caught
    }
    let refreshFailed = false
    try { await requestJson('/api/kdm/calculate', { method: 'POST' }) } catch { refreshFailed = true }
    try { await fetchDashboardData() } catch { refreshFailed = true }
    showToast(refreshFailed ? 'Exames salvos. Não foi possível atualizar todos os indicadores.' : 'Exames registrados com sucesso.')
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
      showToast('Perfil atualizado.')
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
  }

  const saveDashboardLayout = (layout: DashboardLayout) => {
    const model = dashboardPreferences.active
    if (model === 'classic') return
    setDashboardPreferences(current => ({
      ...current,
      layouts: { ...current.layouts, [model]: layout },
    }))
    setIsDashboardEditorOpen(false)
    showToast('Composição do painel salva neste navegador.')
  }

  const renderCustomWidget = (id: WidgetId): React.ReactNode => {
    switch (id) {
      case 'guidance':
        return <DailyGuidanceCard selectedDate={selectedDate} refreshKey={guidanceRevision} presentation="editorial" />
      case 'metrics':
        return (
          <section aria-label="Indicadores do dia" className="divide-y divide-amber-300/80 dark:divide-emerald-900/70">
            {[
              { title: 'Sono', value: customActiveMetric?.sleep_minutes != null ? formatSleepMinutes(customActiveMetric.sleep_minutes) : null },
              { title: 'Passos', value: customActiveMetric?.steps != null ? `${customActiveMetric.steps.toLocaleString('pt-BR')}` : null },
              { title: 'VFC', value: customActiveMetric?.hrv_ms != null ? `${Math.round(customActiveMetric.hrv_ms)} ms` : null },
            ].map(row => (
              <div key={row.title} className="flex min-h-[68px] items-center justify-between gap-4 px-2 py-3 sm:min-h-[78px] sm:px-4">
                <h3 className="text-base font-semibold text-emerald-950 dark:text-emerald-50 sm:text-lg">{row.title}</h3>
                <p className="text-right text-2xl font-semibold tracking-tight text-emerald-950 dark:text-emerald-50 sm:text-3xl">
                  {customMetricsState === 'loading' ? 'Carregando…' : customMetricsState === 'error' ? 'Indisponível' : row.value ?? 'Sem registro'}
                </p>
              </div>
            ))}
          </section>
        )
      case 'checkin':
        return (
          <section className={`rounded-radius-xl border p-4 ${dashboardPreferences.active === 'modular' ? 'border-violet-200 bg-white dark:border-violet-900/60 dark:bg-slate-900' : 'border-amber-300/70 bg-white/50 dark:border-emerald-900/60 dark:bg-slate-900/50'}`} aria-label="Check-in">
            <h3 className={`text-xl font-semibold ${dashboardPreferences.active === 'day' ? 'font-serif text-emerald-950 dark:text-emerald-50' : 'text-slate-900 dark:text-slate-100'}`}>Check-in</h3>
            <Button
              variant="primary"
              className={`mt-3 min-h-11 w-full justify-center ${dashboardPreferences.active === 'modular' ? 'border-violet-700 bg-violet-700 text-white hover:bg-violet-800' : ''}`}
              onClick={() => setIsCheckinDialogOpen(true)}
            >Registrar check-in</Button>
          </section>
        )
      case 'routine':
        return (
          <details className="group border-b border-amber-300/80 py-3 dark:border-emerald-900/70">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-radius-md text-base font-semibold text-emerald-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:text-emerald-50">
              <span>Rotina</span><span className="text-sm font-normal text-slate-600 group-open:hidden dark:text-slate-400">Ver registros ›</span><span className="hidden text-sm font-normal text-slate-600 group-open:inline dark:text-slate-400">Fechar</span>
            </summary>
            <div className="pt-3"><DailyComplianceWidget selectedDate={selectedDate} /></div>
          </details>
        )
      case 'training':
        return (
          <details className="group border-b border-amber-300/80 py-3 dark:border-emerald-900/70">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-radius-md text-base font-semibold text-emerald-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:text-emerald-50">
              <span>Treino</span>
              <span className="text-sm font-normal text-slate-600 dark:text-slate-400">
                {customMetricsState === 'loading' ? 'Carregando…' : customMetricsState === 'error' ? 'Indisponível' : customActiveMetric?.workout_count == null ? 'Sem registro' : customActiveMetric.workout_count > 0 ? 'Realizado' : 'Sem treino registrado'}
              </span>
            </summary>
            <div className="pt-3">
              <TrainingLoadWidget
                dailyLoad={customActiveMetric?.training_load_daily}
                rollingLoad={customActiveMetric?.training_load_rolling}
                optimalMin={customActiveMetric?.training_load_optimal_min}
                optimalMax={customActiveMetric?.training_load_optimal_max}
                workoutCount={customActiveMetric?.workout_count}
                workoutDurationMin={customActiveMetric?.workout_duration_min}
              />
            </div>
          </details>
        )
      case 'energy':
        return <EnergyCircadianWidget selectedDate={selectedDate} />
      case 'age':
        return moduleErrors['PhenoAge'] || moduleErrors['KDM']
          ? <div role="status" className="surface-card rounded-radius-xl p-4">Não foi possível carregar as estimativas de idade biológica.</div>
          : <PhenoAgeWidget latestRecord={phenoHistory[0]} latestKdmRecord={latestKdmRecord} onRecalculate={handleRecalculatePheno} />
      case 'glucose':
        {
          const selectedCgmSummary = cgmSummaries.find(summary => summary.date_ref === selectedDate)
          return (
            <section className="rounded-radius-xl border border-violet-200 bg-white p-4 shadow-xs dark:border-violet-900/60 dark:bg-slate-900" aria-label="Glicemia">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Glicemia</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Resumo do monitor contínuo para {selectedDate}</p>
                </div>
                {moduleErrors['Glicemia'] ? (
                  <p role="status" className="text-sm text-rose-700 dark:text-rose-300">Falha ao carregar</p>
                ) : selectedCgmSummary ? (
                  <p className="text-xl font-bold text-violet-800 dark:text-violet-300">{selectedCgmSummary.mean_glucose} mg/dL</p>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                    <span aria-hidden="true" className="text-xl text-violet-600 dark:text-violet-400">◌</span>
                    <span>Sem dados para esta data</span>
                  </div>
                )}
              </div>
              <details className="group mt-3 border-t border-violet-100 pt-2 dark:border-violet-900/50">
                <summary className="flex min-h-11 cursor-pointer items-center text-xs font-semibold text-violet-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:text-violet-300">Importar CSV e ver detalhes</summary>
                <div className="pt-2">
                  {moduleErrors['Glicemia']
                    ? <p role="status" className="text-sm text-rose-700 dark:text-rose-300">Não foi possível carregar os dados de glicemia.</p>
                    : <CGMDashboard summaries={selectedCgmSummary ? [selectedCgmSummary] : []} onRefreshData={fetchDashboardData} />}
                </div>
              </details>
            </section>
          )
        }
      case 'sleep':
        return (
          <Suspense fallback={<div role="status" className="surface-card rounded-radius-xl p-4">Carregando histórico de sono…</div>}>
            <DashboardMetricTile metric="sleep_minutes" rows={customMetrics} selectedDate={selectedDate} range={customDateRange} loading={customMetricsState === 'loading'} error={customMetricsState === 'error'} />
          </Suspense>
        )
      case 'steps':
        return (
          <Suspense fallback={<div role="status" className="surface-card rounded-radius-xl p-4">Carregando histórico de passos…</div>}>
            <DashboardMetricTile metric="steps" rows={customMetrics} selectedDate={selectedDate} range={customDateRange} loading={customMetricsState === 'loading'} error={customMetricsState === 'error'} />
          </Suspense>
        )
      case 'sleepChart':
      case 'stepsChart':
        return (
          <Suspense fallback={<div role="status" className="surface-card rounded-radius-xl p-4">Carregando histórico…</div>}>
            <DashboardHistoryChart metric={id === 'sleepChart' ? 'sleep_minutes' : 'steps'} rows={customMetrics} startDate={customDateRange.startDate} endDate={selectedDate} loading={customMetricsState === 'loading'} error={customMetricsState === 'error'} />
          </Suspense>
        )
      case 'chart':
        return (
          <Suspense fallback={<div role="status" className="surface-card rounded-radius-xl p-4">Carregando gráfico…</div>}>
            <DashboardTrendChart rows={customMetrics} metric={activeCustomLayout?.trendMetric ?? 'hrv_ms'} startDate={customDateRange.startDate} endDate={selectedDate} loading={customMetricsState === 'loading'} error={customMetricsState === 'error'} />
          </Suspense>
        )
      case 'coverage':
        return (
          <Suspense fallback={<div role="status" className="surface-card rounded-radius-xl p-4">Carregando resumo…</div>}>
            <DashboardCoverage rows={customMetrics} metric={activeCustomLayout?.trendMetric ?? 'hrv_ms'} startDate={customDateRange.startDate} endDate={selectedDate} loading={customMetricsState === 'loading'} error={customMetricsState === 'error'} />
          </Suspense>
        )
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-12 font-sans">
      {createPortal(<DailyCheckinCard selectedDate={selectedDate} onCheckinUpdated={handleCheckinUpdated} />, checkinPortalContainer)}
      {activeTab !== 'personal' && (
        <Header
          onOwnerLogout={onOwnerLogout}
          activeTab={activeTab}
          setActiveTab={handleSelectTab}
          onSelectTab={handleSelectTab}
          onSync={handleSyncZepp}
          onSyncZepp={handleSyncZepp}
          onSyncGoogleHealth={handleSyncGoogleHealth}
          onOpenManualEntry={() => setShowManualModal(true)}
          onOpenDoctorBriefing={handleOpenDoctorBriefing}
          onOpenAISettings={() => setShowAISettings(true)}
          isSyncing={isSyncing}
          isSyncingGoogle={isSyncingGoogle}
          lastSyncTime={lastSyncTime}
          syncState={moduleErrors['Sincronização'] ? 'unavailable' : syncState}
          dataCoveredUntil={dataCoveredUntil}
          onOpenSyncStatus={() => setIsSyncModalOpen(true)}
        />
      )}

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

            {Object.keys(moduleErrors).length > 0 && (
              <div
                role="status"
                className="rounded-radius-xl border border-amber-500/50 bg-amber-500/10 dark:bg-amber-950/40 p-4 text-amber-900 dark:text-amber-100 flex items-center justify-between text-sm"
              >
                <span>
                  <strong>Aviso de integridade:</strong> Falha ao carregar dados de:{' '}
                  {Object.keys(moduleErrors).join(', ')}.
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void fetchDashboardData()}
                  aria-label="Tentar carregar os dados novamente"
                >
                  Tentar novamente
                </Button>
              </div>
            )}

            {showManualModal && activeTab !== 'personal' && <ManualEntryModal isOpen={showManualModal} onClose={closeManualEntry} onSaveMetric={handleSaveMetric} />}

            {activeTab === 'overview' && dashboardPreferences.active === 'classic' && (
              <>
                <DateNavigator
                  selectedDate={selectedDate}
                  onDateChange={setSelectedDate}
                  daysRange={daysRange}
                  onDaysRangeChange={setDaysRange}
                />

                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
                  <div className="w-full sm:max-w-xs space-y-1">
                    <label htmlFor="dashboard-model" className="text-xs font-semibold text-slate-600 dark:text-slate-400">Modelo</label>
                    <Select
                      id="dashboard-model"
                      value={dashboardPreferences.active}
                      onChange={event => setDashboardPreferences(current => ({ ...current, active: event.target.value as DashboardPreferences['active'] }))}
                    >
                      {Object.entries(DASHBOARD_MODELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </Select>
                  </div>
                  {dashboardPreferences.active !== 'classic' && (
                    <Button variant="outline" onClick={() => setIsDashboardEditorOpen(true)}>Personalizar</Button>
                  )}
                  {dashboardStorageError && (
                    <p role="status" className="text-xs text-amber-700 dark:text-amber-300">Não foi possível salvar as preferências neste navegador.</p>
                  )}
                </div>
              </>
            )}

            {activeTab === 'overview' && dashboardPreferences.active === 'classic' && (
              <>
                <section aria-label="Cabeçalho do Dia" className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">{dashboardPreferences.active === 'classic' ? 'Visão Geral' : 'Resumo do dia'}</h2>
                    <DataConfidenceBadge selectedDate={selectedDate} />
                  </div>
                  <button
                    aria-label="Atualizar dados"
                    onClick={() => { void fetchDashboardData(); setCustomMetricsRetry(value => value + 1) }}
                    className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 p-2 transition focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
                  >
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  </button>
                </section>

                <DailyGuidanceCard selectedDate={selectedDate} refreshKey={guidanceRevision} />

                {/* Camada 1: Métricas Vitais de Hoje */}
                <section aria-label="Métricas do Dia" className="space-y-4">
                  <div>
                    <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2.5">
                      Indicadores Principais
                    </h3>
                    <div className="grid gap-3.5 sm:gap-4 grid-cols-2 lg:grid-cols-5">
                      {primaryMetricCards.map((card) => (
                        <MetricCard
                          key={card.title}
                          title={card.title}
                          value={card.value}
                          unit={card.unit}
                          subtitle={card.subtitle}
                          rangeType={card.rangeType}
                          rangeValue={card.rangeValue}
                          termKey={card.termKey}
                          sourceKind={card.sourceKind}
                          icon={card.icon}
                          color={card.color}
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
                       Indicadores Complementares
                    </h3>
                    <div className="grid gap-3.5 sm:gap-4 grid-cols-1 sm:grid-cols-3">
                      {secondaryMetricCards.map((card) => (
                        <MetricCard
                          key={card.title}
                          title={card.title}
                          value={card.value}
                          unit={card.unit}
                          subtitle={card.subtitle}
                          rangeType={card.rangeType}
                          rangeValue={card.rangeValue}
                          termKey={card.termKey}
                          sourceKind={card.sourceKind}
                          icon={card.icon}
                          color={card.color}
                        />
                      ))}
                    </div>
                  </div>

                  {!loading && !hasMetric && (
                    <EmptyState
                      title="Ainda não há dados para este dia"
                      description="Registre uma medição ou sincronize seus dispositivos para acompanhar sua evolução."
                      absenceKind="no_data"
                      source="Dispositivos e registros"
                      lastSync={selectedDate}
                      reason="Ainda não sincronizado para esta data"
                      pipelineSteps={[
                        { step: 1, label: 'Perfil e metas', done: true },
                        { step: 2, label: 'Conectar dispositivos (Zepp / Google Health)', active: true },
                        { step: 3, label: 'Registrar primeiros dados (manual ou CSV)' },
                        { step: 4, label: 'Acompanhar seus dados (HRV, sono e passos)' },
                        { step: 5, label: 'Análise de evolução (PhenoAge, KDM e Copiloto)' },
                      ]}
                      action={{
                        label: 'Registrar medição',
                        onClick: () => setShowManualModal(true),
                        icon: PlusCircle,
                      }}
                      secondaryAction={{
                        label: 'Configurar integrações',
                        onClick: () => setActiveTab('profile'),
                      }}
                      className="my-4"
                    />
                  )}
                </section>
              </>
            )}

            {activeTab === 'overview' && dashboardPreferences.active === 'classic' && (
              <div ref={setCheckinSlot} data-testid="dashboard-checkin-slot" />
            )}

            {activeTab === 'overview' && dashboardPreferences.active === 'classic' && (
              <>
                {/* Camada 2: Contexto Operacional & Recuperação */}
                <OverviewSection
                  id="overview-context"
                  title="Recuperação e contexto"
                  subtitle="Treino, recuperação, energia e rotina"
                  icon={Heart}
                >
                  <div className="grid gap-6 lg:grid-cols-2">
                    <DailyComplianceWidget selectedDate={selectedDate} />
                    <TrainingLoadWidget
                      dailyLoad={activeMetric?.training_load_daily}
                      rollingLoad={activeMetric?.training_load_rolling}
                      optimalMin={activeMetric?.training_load_optimal_min}
                      optimalMax={activeMetric?.training_load_optimal_max}
                      workoutCount={activeMetric?.workout_count}
                      workoutDurationMin={activeMetric?.workout_duration_min}
                    />
                  </div>
                  <EnergyCircadianWidget selectedDate={selectedDate} />
                </OverviewSection>

                {/* Camada 3: Análises Avançadas & Biomarcadores */}
                <OverviewSection
                  id="overview-advanced"
                  title="Análises"
                  subtitle="Idade biológica, glicose e histórico de treinos"
                  icon={Dna}
                  collapsible={true}
                  defaultCollapsed={true}
                  storageKey="longevidade_overview_advanced_collapsed"
                >
                  <div className="grid gap-6 lg:grid-cols-2">
                    {moduleErrors['PhenoAge'] || moduleErrors['KDM'] ? <div role="status">Não foi possível carregar as estimativas de idade biológica.</div> : <PhenoAgeWidget
                      latestRecord={phenoHistory[0]}
                      latestKdmRecord={latestKdmRecord}
                      onRecalculate={handleRecalculatePheno}
                    />}
                    {moduleErrors['Glicemia'] ? <div role="status">Não foi possível carregar os dados de glicemia.</div> : <CGMDashboard summaries={cgmSummaries} onRefreshData={fetchDashboardData} />}
                  </div>

                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setShowWorkoutsTable((prev) => !prev)}
                        className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors py-1.5 px-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
                      >
                        <Activity className="w-4 h-4 text-emerald-500" />
                        <span>{showWorkoutsTable ? 'Ocultar Histórico de Treinos' : 'Ver Histórico Detalhado de Treinos'}</span>
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showWorkoutsTable ? 'rotate-180' : ''}`} />
                      </button>
                    </div>
                    {showWorkoutsTable && (
                      <Suspense fallback={<div className="py-6 flex justify-center"><LoadingIndicator label="Carregando treinos..." /></div>}>
                        <WorkoutsTable />
                      </Suspense>
                    )}
                  </div>
                </OverviewSection>
              </>
            )}

            {activeTab === 'overview' && activeCustomLayout && (
              <CustomDashboard
                model={dashboardPreferences.active as CustomModel}
                layout={activeCustomLayout}
                selectedDate={selectedDate}
                daysRange={daysRange}
                onDateChange={setSelectedDate}
                onDaysRangeChange={setDaysRange}
                onModelChange={model => setDashboardPreferences(current => ({ ...current, active: model }))}
                renderWidget={renderCustomWidget}
                storageError={dashboardStorageError}
                metricLoadError={customMetricsError}
                onRetry={() => setCustomMetricsRetry(value => value + 1)}
                onCustomize={() => setIsDashboardEditorOpen(true)}
              />
            )}

            {activeTab === 'overview' && activeCustomLayout && isDashboardEditorOpen && (
              <DashboardEditor
                model={dashboardPreferences.active as CustomModel}
                layout={activeCustomLayout}
                onSave={saveDashboardLayout}
                onClose={() => setIsDashboardEditorOpen(false)}
              />
            )}

            {activeTab === 'overview' && activeCustomLayout && isCheckinDialogOpen && (
              <Modal
                isOpen
                onClose={() => setIsCheckinDialogOpen(false)}
                title="Check-in diário"
                description={`Registros de energia, humor, estresse e observações para ${selectedDate}.`}
                size="xl"
              >
                <div ref={setCheckinSlot} data-testid="dashboard-checkin-slot" />
              </Modal>
            )}

            {activeTab === 'timeline' && (
              <Suspense fallback={<div className="py-12 flex justify-center"><LoadingIndicator label="Carregando Linha do Tempo..." size="md" /></div>}>
                <TimelineView />
              </Suspense>
            )}

            {activeTab === 'workouts' && (
              <Suspense fallback={<div className="py-12 flex justify-center"><LoadingIndicator label="Carregando painel de treinos..." size="md" /></div>}>
                <WorkoutsView onSyncZepp={handleSyncZepp} isSyncingZepp={isSyncing} />
              </Suspense>
            )}
            {(activeTab === 'labs' || activeTab === 'biomarkers' || activeTab === 'steps') && (
              <div className="space-y-4">
                <nav aria-label="Exames, biomarcadores e passos" className="w-full overflow-x-auto no-scrollbar py-0.5">
                  <div className="flex items-center gap-1.5 p-1 rounded-radius-lg bg-slate-200/60 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 w-max">
                    <Button
                      type="button"
                      variant={activeTab === 'labs' ? 'primary' : 'ghost'}
                      size="sm"
                      onClick={() => setActiveTab('labs')}
                      leftIcon={Dna}
                      aria-current={activeTab === 'labs' ? 'page' : undefined}
                      className="text-xs min-h-[36px] shrink-0"
                    >
                      Exames
                    </Button>
                    <Button
                      type="button"
                      variant={activeTab === 'biomarkers' ? 'primary' : 'ghost'}
                      size="sm"
                      onClick={() => setActiveTab('biomarkers')}
                      leftIcon={Activity}
                      aria-current={activeTab === 'biomarkers' ? 'page' : undefined}
                      className="text-xs min-h-[36px] shrink-0"
                    >
                      Biomarcadores
                    </Button>
                    <Button
                      type="button"
                      variant={activeTab === 'steps' ? 'primary' : 'ghost'}
                      size="sm"
                      onClick={() => setActiveTab('steps')}
                      leftIcon={Footprints}
                      aria-current={activeTab === 'steps' ? 'page' : undefined}
                      className="text-xs min-h-[36px] shrink-0"
                    >
                      Passos Diários (Zepp)
                    </Button>
                  </div>
                </nav>

                {activeTab === 'labs' && (moduleErrors['Exames'] ? <div role="status">Não foi possível carregar os exames.</div> : (
                  <LabResultsTable
                    labs={labs}
                    onAddBatchLabs={handleAddBatchLabs}
                    onRefreshData={fetchDashboardData}
                  />
                ))}

                {activeTab === 'biomarkers' && (
                  <BiomarkersView labs={labs} labsLoadError={Boolean(moduleErrors['Exames'])} onRefreshData={fetchDashboardData} />
                )}

                {activeTab === 'steps' && (
                  <Suspense
                    fallback={
                      <div className="py-12 flex justify-center">
                        <LoadingIndicator label="Carregando histórico e análises de passos..." size="md" />
                      </div>
                    }
                  >
                    <DailyStepsView onSyncZepp={handleSyncZepp} isSyncingZepp={isSyncing} />
                  </Suspense>
                )}
              </div>
            )}
            {activeTab === 'supplements' && <SupplementsView selectedDate={selectedDate} />}
            {activeTab === 'sleep' && <SleepView />}
            {activeTab === 'ai' && <AICopilotView onOpenSettings={() => setShowAISettings(true)} chatMessages={aiChatMessages} setChatMessages={setAiChatMessages} />}
            {activeTab === 'n-of-1' && (moduleErrors['Experimentos'] ? <div role="status">Não foi possível carregar os experimentos.</div> : <NOf1Tracker experiments={experiments} onCreateExperiment={handleCreateExperiment} />)}
            {activeTab === 'physical-assessments' && <PhysicalAssessmentsView />}
            {activeTab === 'personal' && (
              <Suspense
                fallback={
                  <div className="py-12 flex justify-center">
                    <LoadingIndicator label="Carregando portal do personal..." size="md" />
                  </div>
                }
              >
                <PersonalTrainerView
                  isIsolated={true}
                  onRequestUnlock={() => { window.location.hash = 'overview' }}
                  onOwnerLogout={onOwnerLogout}
                />
              </Suspense>
            )}
            {['profile', 'integrations', 'system'].includes(activeTab) && (
              <ProfileView
                profile={profile}
                onUpdateProfile={handleUpdateProfile}
                pipelineRuns={pipelineRuns}
                pipelineLoading={pipelineLoading}
                onRefreshPipeline={fetchPipelineRuns}
                historySectionRef={historySectionRef}
                onOpenGoogleHealthModal={() => setShowGoogleHealthModal(true)}
                activeSubTab={activeTab === 'integrations' ? 'integrations' : activeTab === 'system' ? 'system' : 'profile'}
                onSelectSubTab={(subTab) => setActiveTab(subTab as Tab)}
                onSyncZepp={handleSyncZepp}
                isSyncingZepp={isSyncing}
                onSyncGoogleHealth={handleSyncGoogleHealth}
                isSyncingGoogle={isSyncingGoogle}
                onOpenAISettings={() => setShowAISettings(true)}
                onOpenDoctorBriefing={handleOpenDoctorBriefing}
              />
            )}
          </main>

          <footer className="mt-16 border-t border-slate-200 dark:border-slate-800/80 py-8 px-4 sm:px-6 lg:px-8 text-xs text-slate-500 dark:text-slate-400">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Longevidade Hub</span>
                <span>v2.4.6</span>
                <span className="text-slate-400 dark:text-slate-600">•</span>
                <span>Armazenamento local e privacidade de dados</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl text-center sm:text-right">
                Aviso Clínico: Este aplicativo organiza e analisa dados de saúde coletados pelo próprio usuário. Não substitui o diagnóstico, acompanhamento ou prescrição médica.
              </p>
            </div>
          </footer>

          <Suspense fallback={null}>
            {activeTab !== 'personal' && showAISettings && (
              <AISettingsModal
                isOpen={showAISettings}
                onClose={() => setShowAISettings(false)}
                onRefreshSettings={fetchDashboardData}
                onSyncZeppFull={() => {
                  setShowAISettings(false)
                  void handleSyncZepp(true)
                }}
                isSyncingZepp={isSyncing}
                onOpenOnboarding={() => {
                  setShowAISettings(false)
                  setShowOnboardingModal(true)
                }}
              />
            )}
            {activeTab !== 'personal' && showGoogleHealthModal && (
              <GoogleHealthAuthModal
                isOpen={showGoogleHealthModal}
                onClose={() => setShowGoogleHealthModal(false)}
                onSyncSuccess={() => {
                  void fetchDashboardData()
                  void fetchPipelineRuns()
                }}
              />
            )}
            {activeTab !== 'personal' && isSyncModalOpen && (
              <SyncProgressModal
                isOpen={isSyncModalOpen}
                onClose={() => setIsSyncModalOpen(false)}
                isSyncing={isSyncing || isSyncingGoogle}
                syncResult={syncResult}
                onViewHistory={handleViewPipelineHistory}
                onReauthenticate={() => setShowGoogleHealthModal(true)}
                onRetrySync={() => void handleSyncZepp()}
              />
            )}
            {activeTab !== 'personal' && showDoctorModal && (
              <DoctorBriefingModal isOpen={showDoctorModal} onClose={() => setShowDoctorModal(false)} markdownContent={doctorBriefingMd} />
            )}
            {activeTab !== 'personal' && showOnboardingModal && (
              <OnboardingModal
                isOpen={showOnboardingModal}
                onClose={() => setShowOnboardingModal(false)}
                profile={profile}
                onOpenGoogleHealthModal={() => {
                  setShowOnboardingModal(false)
                  setShowGoogleHealthModal(true)
                }}
                onComplete={(updatedProfile, startSync) => {
                  if (updatedProfile) setProfile(updatedProfile)
                  setShowOnboardingModal(false)
                  showToast({
                    title: 'Bem-vindo ao Longevidade Hub!',
                    message: 'Configurações iniciais salvas com sucesso.',
                    type: 'success',
                  })
                  if (startSync) {
                    void handleSyncZepp(false)
                  }
                }}
              />
            )}
          </Suspense>
        </Suspense>
      </ErrorBoundary>
    </div>
  )
}
