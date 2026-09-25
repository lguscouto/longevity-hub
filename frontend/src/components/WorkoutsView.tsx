import React, { useEffect, useState, useMemo } from 'react'
import {
  Dumbbell,
  Activity,
  Flame,
  Clock,
  Heart,
  TrendingUp,
  MapPin,
  RefreshCw,
  Search,
  ChevronDown,
  ChevronUp,
  Zap,
  Layers,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Award,
  Play,
  BookOpen,
} from 'lucide-react'

import { requestJson } from '../lib/api'
import { WorkoutSession, WorkoutsSummary, WorkoutExercise, ExerciseMedia } from '../types'
import { ExerciseDetailModal } from './ExerciseDetailModal'
import { ExerciseCatalogView } from './ExerciseCatalogView'

interface WorkoutsViewProps {
  onSyncZepp?: () => void
  isSyncingZepp?: boolean
}

type PeriodFilter = 7 | 30 | 90 | 2026 | 0 // 0 = Todos, 2026 = Desde Jan/2026
type SourceFilter = 'all' | 'Hevy' | 'Zepp'

export const WorkoutsView: React.FC<WorkoutsViewProps> = ({
  onSyncZepp,
  isSyncingZepp = false,
}) => {
  // Aba ativa: 'workouts' (Histórico) ou 'catalog' (Biblioteca de Exercícios)
  const [activeMainTab, setActiveMainTab] = useState<'workouts' | 'catalog'>('workouts')

  const [workouts, setWorkouts] = useState<WorkoutSession[]>([])
  const [summary, setSummary] = useState<WorkoutsSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filtros
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all')
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodFilter>(2026)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('Todas')
  const [limit, setLimit] = useState(500)

  // Estado de sincronização Hevy
  const [isSyncingHevy, setIsSyncingHevy] = useState(false)
  const [syncFeedback, setSyncFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Sessões expandidas
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({})
  const [detailedWorkouts, setDetailedWorkouts] = useState<Record<string, WorkoutSession>>({})
  const [loadingDetails, setLoadingDetails] = useState<Record<string, boolean>>({})

  // Estado do Modal de Demonstração / GIF do Exercício
  const [modalExercise, setModalExercise] = useState<{
    title: string
    media: ExerciseMedia | null
    workoutId?: string
    exerciseIndex?: number
  } | null>(null)
  const [isExerciseModalOpen, setIsExerciseModalOpen] = useState(false)

  const formatDate = (isoDate: string) => {
    try {
      const parts = isoDate.split('-')
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`
      }
      return isoDate
    } catch {
      return isoDate
    }
  }

  const formatDuration = (mins: number) => {
    const totalMinutes = Math.round(mins)
    const hours = Math.floor(totalMinutes / 60)
    const remainingMins = totalMinutes % 60
    if (hours > 0) {
      return `${hours}h ${remainingMins}m`
    }
    return `${remainingMins}m`
  }

  const formatVolume = (kg: number) => {
    if (kg >= 1000) {
      return `${(kg / 1000).toFixed(1)} t`
    }
    return `${Math.round(kg)} kg`
  }

  // Carrega lista de treinos e resumo
  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const periodParam =
        selectedPeriod === 2026
          ? 'start_date=2026-01-01'
          : selectedPeriod > 0
          ? `days=${selectedPeriod}`
          : ''
      const sourceParam = sourceFilter !== 'all' ? `source=${sourceFilter}` : ''
      const categoryParam = selectedCategory !== 'Todas' ? `category=${encodeURIComponent(selectedCategory)}` : ''
      const searchParam = searchQuery.trim() ? `search=${encodeURIComponent(searchQuery.trim())}` : ''

      const queryParts = [periodParam, sourceParam, categoryParam, searchParam, `limit=${limit}`].filter(Boolean)
      const queryString = queryParts.length > 0 ? `?${queryParts.join('&')}` : ''

      const summaryParts = [periodParam, sourceParam].filter(Boolean)
      const summaryQuery = summaryParts.length > 0 ? `?${summaryParts.join('&')}` : ''

      const [workoutsData, summaryData] = await Promise.all([
        requestJson<WorkoutSession[]>(`/api/workouts${queryString}`),
        requestJson<WorkoutsSummary>(`/api/workouts/summary${summaryQuery ? `?${summaryQuery}` : ''}`),
      ])

      setWorkouts(Array.isArray(workoutsData) ? workoutsData : [])
      setSummary(summaryData)
    } catch (err: any) {
      setError(err?.message || 'Erro ao carregar dados de treinos.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [sourceFilter, selectedPeriod, selectedCategory, searchQuery, limit])

  useEffect(() => {
    if (!isSyncingZepp) {
      void loadData()
    }
  }, [isSyncingZepp])

  // Sincronizar Hevy
  const handleSyncHevy = async () => {
    setIsSyncingHevy(true)
    setSyncFeedback(null)
    try {
      const res = await requestJson<{ status: string; records_inserted: number; summary: string }>(
        '/api/workouts/hevy/sync',
        { method: 'POST', body: JSON.stringify({ max_pages: 50 }) }
      )
      setSyncFeedback({
        type: res.status === 'ERRO' ? 'error' : 'success',
        message: res.summary || `${res.records_inserted} treinos sincronizados do Hevy com sucesso!`,
      })
      await loadData()
    } catch (err: any) {
      setSyncFeedback({
        type: 'error',
        message: err?.message || 'Falha ao sincronizar com o Hevy.',
      })
    } finally {
      setIsSyncingHevy(false)
    }
  }

  // Expandir / recolher card com lazy load de detalhes
  const toggleExpand = async (workoutId: string) => {
    const isCurrentlyExpanded = !!expandedIds[workoutId]
    setExpandedIds((prev) => ({ ...prev, [workoutId]: !isCurrentlyExpanded }))

    if (!isCurrentlyExpanded && !detailedWorkouts[workoutId]) {
      setLoadingDetails((prev) => ({ ...prev, [workoutId]: true }))
      try {
        const details = await requestJson<WorkoutSession>(`/api/workouts/${workoutId}`)
        setDetailedWorkouts((prev) => ({ ...prev, [workoutId]: details }))
      } catch (err) {
        console.error('Erro ao carregar detalhes do treino:', err)
      } finally {
        setLoadingDetails((prev) => ({ ...prev, [workoutId]: false }))
      }
    }
  }

  const getSetTypeBadge = (type: string) => {
    switch (type.toLowerCase()) {
      case 'warmup':
        return <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30">Aquecimento</span>
      case 'drop_set':
        return <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-purple-50 dark:bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30">Drop Set</span>
      case 'failure':
        return <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30">Falha</span>
      default:
        return <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30">Normal</span>
    }
  }

  const handleOpenExerciseMedia = (
    title: string,
    media: ExerciseMedia | null,
    workoutId?: string,
    exerciseIndex?: number
  ) => {
    setModalExercise({ title, media, workoutId, exerciseIndex })
    setIsExerciseModalOpen(true)
  }

  const handleReLinkSuccess = (updatedMedia: ExerciseMedia) => {
    if (!modalExercise?.workoutId || modalExercise.exerciseIndex === undefined) return
    const wId = modalExercise.workoutId
    const exIdx = modalExercise.exerciseIndex

    setDetailedWorkouts((prev) => {
      const current = prev[wId]
      if (!current || !current.exercises) return prev
      const newExercises = [...current.exercises]
      if (newExercises[exIdx]) {
        newExercises[exIdx] = {
          ...newExercises[exIdx],
          media: updatedMedia,
        }
      }
      return {
        ...prev,
        [wId]: {
          ...current,
          exercises: newExercises,
        },
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho e Ações */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900/60 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm backdrop-blur-md">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-emerald-500/10 dark:from-emerald-500/20 to-teal-500/10 dark:to-teal-500/20 border border-emerald-500/20 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
              <Dumbbell className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Treinos & Performance</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Histórico unificado de musculação e força (<span className="text-purple-600 dark:text-purple-400 font-bold">Hevy</span>) e atividades aeróbicas (<span className="text-emerald-600 dark:text-emerald-400 font-bold">Zepp</span>).
              </p>
            </div>
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Seletor de Período */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-950 p-1 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs">
            {([
              { id: 2026 as PeriodFilter, label: 'Ano 2026' },
              { id: 30 as PeriodFilter, label: '30 dias' },
              { id: 90 as PeriodFilter, label: '90 dias' },
              { id: 7 as PeriodFilter, label: '7 dias' },
              { id: 0 as PeriodFilter, label: 'Tudo' },
            ]).map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedPeriod(p.id)}
                className={`px-3 py-1.5 rounded-xl font-medium transition ${
                  selectedPeriod === p.id
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Sync Hevy */}
          <button
            onClick={handleSyncHevy}
            disabled={isSyncingHevy}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-md transition disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isSyncingHevy ? 'animate-spin' : ''}`} />
            {isSyncingHevy ? 'Sincronizando Hevy...' : 'Sincronizar Hevy'}
          </button>

          {/* Sync Zepp */}
          {onSyncZepp && (
            <button
              onClick={onSyncZepp}
              disabled={isSyncingZepp}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md transition disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isSyncingZepp ? 'animate-spin' : ''}`} />
              {isSyncingZepp ? 'Sincronizando Zepp...' : 'Sincronizar Zepp'}
            </button>
          )}
        </div>
      </div>

      {/* Navegação entre Abas Principais: Treinos vs Biblioteca */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-100 dark:bg-slate-950/80 rounded-2xl border border-slate-200 dark:border-slate-800 w-fit">
        <button
          onClick={() => setActiveMainTab('workouts')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeMainTab === 'workouts'
              ? 'bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Dumbbell className="h-4 w-4" />
          Histórico de Treinos
        </button>

        <button
          onClick={() => setActiveMainTab('catalog')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeMainTab === 'catalog'
              ? 'bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <BookOpen className="h-4 w-4" />
          Biblioteca de Exercícios (1.300+)
        </button>
      </div>

      {activeMainTab === 'catalog' ? (
        <ExerciseCatalogView />
      ) : (
        <>
      {syncFeedback && (
        <div
          className={`flex items-center justify-between p-4 rounded-2xl border text-sm shadow-xs ${
            syncFeedback.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300'
              : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/60 text-rose-800 dark:text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {syncFeedback.type === 'success' ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 text-rose-600 dark:text-rose-400 flex-shrink-0" />
            )}
            <span className="font-medium">{syncFeedback.message}</span>
          </div>
          <button
            onClick={() => setSyncFeedback(null)}
            className="text-xs opacity-75 hover:opacity-100 font-bold px-2 py-1"
          >
            Dispensar
          </button>
        </div>
      )}

      {/* 4 Cards de Resumo / KPIs */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Card 1: Sessões */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Total de Sessões</span>
              <div className="p-2 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 dark:border-emerald-500/30">
                <Activity className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{summary.total_workouts ?? 0}</div>
              <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                <span className="text-purple-600 dark:text-purple-400 font-bold">{summary.hevy_workouts ?? 0} Hevy</span>
                <span>•</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">{summary.zepp_workouts ?? 0} Zepp</span>
              </div>
            </div>
          </div>

          {/* Card 2: Volume de Força */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Carga Acumulada</span>
              <div className="p-2 rounded-xl bg-purple-500/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/20 dark:border-purple-500/30">
                <Award className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{formatVolume(summary.total_volume_kg ?? 0)}</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-medium">
                {(summary.total_sets ?? 0) > 0 ? `${summary.total_sets} séries • ${summary.total_reps ?? 0} reps` : 'Sem séries registradas'}
              </div>
            </div>
          </div>

          {/* Card 3: Tempo Total */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Tempo em Treino</span>
              <div className="p-2 rounded-xl bg-cyan-500/10 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 dark:border-cyan-500/30">
                <Clock className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{formatDuration(summary.total_duration_min ?? 0)}</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-medium">
                Média de {(summary.total_workouts ?? 0) > 0 ? Math.round((summary.total_duration_min ?? 0) / (summary.total_workouts || 1)) : 0} min por sessão
              </div>
            </div>
          </div>

          {/* Card 4: Calorias */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Calorias Gastas</span>
              <div className="p-2 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/20 dark:border-amber-500/30">
                <Flame className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{(summary.total_calories ?? 0).toLocaleString('pt-BR')} kcal</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-medium">
                {(summary.avg_hr ?? 0) > 0 ? `FC média ${Math.round(summary.avg_hr)} bpm` : 'Atividade e musculação'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Barra de Filtros e Busca */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900/40 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        {/* Filtro de Fonte */}
        <div className="flex items-center gap-1.5 w-full md:w-auto">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold mr-1 hidden sm:inline">Fonte:</span>
          {(['all', 'Hevy', 'Zepp'] as SourceFilter[]).map((src) => (
            <button
              key={src}
              onClick={() => setSourceFilter(src)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${
                sourceFilter === src
                  ? src === 'Hevy'
                    ? 'bg-purple-600 text-white font-bold shadow-xs'
                    : src === 'Zepp'
                    ? 'bg-emerald-600 text-white font-bold shadow-xs'
                    : 'bg-slate-900 dark:bg-slate-800 text-white font-bold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800'
              }`}
            >
              {src === 'all' ? 'Todas as Fontes' : src === 'Hevy' ? 'Hevy (Musculação)' : 'Zepp (Cardio)'}
            </button>
          ))}
        </div>

        {/* Busca Textual */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder="Buscar exercício ou treino (ex: Supino, Ombros)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-3.5 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-purple-500 dark:focus:border-purple-400 focus:outline-none transition shadow-2xs"
          />
        </div>
      </div>

      {/* Contagem e Status de Treinos */}
      {!loading && !error && (
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1 py-0.5">
          <span>
            Exibindo <strong className="text-slate-900 dark:text-white font-bold">{workouts.length}</strong> {workouts.length === 1 ? 'treino' : 'treinos'}
            {sourceFilter !== 'all' ? ` da fonte ${sourceFilter}` : ''}
            {selectedPeriod === 2026 ? ' em 2026 (desde 01/01/2026)' : selectedPeriod > 0 ? ` nos últimos ${selectedPeriod} dias` : ''}
          </span>
          {workouts.length >= limit && (
            <button
              onClick={() => setLimit((prev) => prev + 500)}
              className="text-purple-600 dark:text-purple-400 hover:underline font-semibold"
            >
              Carregar mais (+500)...
            </button>
          )}
        </div>
      )}

      {/* Lista de Sessões de Treino */}
      {loading ? (
        <div className="p-12 text-center text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900/20 rounded-2xl border border-slate-200 dark:border-slate-800/50 shadow-xs">
          <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-3 text-emerald-600 dark:text-emerald-500" />
          <p className="text-sm font-medium">Carregando treinos...</p>
        </div>
      ) : error ? (
        <div className="p-6 text-center text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/20 rounded-2xl border border-rose-200 dark:border-rose-900/50 shadow-xs">
          <AlertCircle className="h-6 w-6 mx-auto mb-2 text-rose-600 dark:text-rose-400" />
          <p className="text-sm font-semibold">{error}</p>
        </div>
      ) : workouts.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900/20 rounded-2xl border border-slate-200 dark:border-slate-800/50 shadow-xs">
          <Dumbbell className="h-10 w-10 mx-auto mb-3 text-slate-400 dark:text-slate-600" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">Nenhum treino encontrado</h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto mb-4">
            Não encontramos sessões para os filtros selecionados. Sincronize com a API do Hevy ou importe seus treinos do Zepp.
          </p>
          <button
            onClick={handleSyncHevy}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white transition shadow-md"
          >
            Sincronizar Treinos Hevy Agora
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {workouts.map((workout) => {
            const isExpanded = !!expandedIds[workout.id]
            const isHevy = workout.source === 'Hevy'
            const details = detailedWorkouts[workout.id] || workout
            const exercises: WorkoutExercise[] = Array.isArray(details.exercises) ? details.exercises : []
            const isLoadingThis = !!loadingDetails[workout.id]

            return (
              <div
                key={workout.id}
                className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700/80 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all duration-200"
              >
                {/* Header do Card (Clicável) */}
                <div
                  onClick={() => toggleExpand(workout.id)}
                  className="p-4 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition"
                >
                  <div className="flex items-center gap-3.5">
                    {/* Badge de Ícone da Fonte */}
                    <div
                      className={`p-2.5 rounded-xl border flex-shrink-0 ${
                        isHevy
                          ? 'bg-purple-50 dark:bg-purple-500/10 border-purple-200 dark:border-purple-500/30 text-purple-600 dark:text-purple-400'
                          : 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {isHevy ? <Dumbbell className="h-5 w-5" /> : <Activity className="h-5 w-5" />}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 dark:text-white text-base">
                          {workout.title || workout.category}
                        </span>
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                            isHevy
                              ? 'bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-500/20'
                              : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/20'
                          }`}
                        >
                          {workout.source || 'Zepp'}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2">
                        <span>{formatDate(workout.workout_date)}</span>
                        {workout.workout_time && workout.workout_time !== '00:00' && (
                          <>
                            <span>•</span>
                            <span>{workout.workout_time}</span>
                          </>
                        )}
                        <span>•</span>
                        <span>{workout.activity_type || workout.category}</span>
                      </div>
                    </div>
                  </div>

                  {/* Resumo da Sessão */}
                  <div className="flex items-center gap-4 text-right">
                    {/* Hevy Metrics */}
                    {isHevy ? (
                      <div className="flex items-center gap-3 text-xs">
                        {workout.volume_kg && workout.volume_kg > 0 ? (
                          <div className="text-right">
                            <span className="text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400 block">Carga</span>
                            <span className="font-black text-purple-700 dark:text-purple-300">{formatVolume(workout.volume_kg)}</span>
                          </div>
                        ) : null}

                        {workout.sets_count && workout.sets_count > 0 ? (
                          <div className="text-right">
                            <span className="text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400 block">Séries</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200">{workout.sets_count}</span>
                          </div>
                        ) : null}

                        <div className="text-right">
                          <span className="text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400 block">Duração</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">{formatDuration(workout.duration_min)}</span>
                        </div>
                      </div>
                    ) : (
                      /* Zepp Metrics */
                      <div className="flex items-center gap-3 text-xs">
                        {workout.calories > 0 && (
                          <div className="text-right">
                            <span className="text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400 block">Calorias</span>
                            <span className="font-bold text-amber-600 dark:text-amber-300">{workout.calories} kcal</span>
                          </div>
                        )}
                        {workout.distance_km > 0 && (
                          <div className="text-right">
                            <span className="text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400 block">Distância</span>
                            <span className="font-bold text-cyan-600 dark:text-cyan-300">{workout.distance_km.toFixed(2)} km</span>
                          </div>
                        )}
                        <div className="text-right">
                          <span className="text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400 block">Duração</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">{formatDuration(workout.duration_min)}</span>
                        </div>
                      </div>
                    )}

                    {/* Chevron */}
                    <div className="text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-white p-1">
                      {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                    </div>
                  </div>
                </div>

                {/* Conteúdo Expansível */}
                {isExpanded && (
                  <div className="border-t border-slate-200 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-950/60 p-4 sm:p-5">
                    {isLoadingThis ? (
                      <div className="py-6 text-center text-xs text-slate-500 dark:text-slate-400">
                        <RefreshCw className="h-4 w-4 animate-spin mx-auto mb-2 text-purple-600 dark:text-purple-400" />
                        Carregando detalhes dos exercícios...
                      </div>
                    ) : isHevy && exercises.length > 0 ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 pb-2">
                          <span>EXERCÍCIOS REALIZADOS ({exercises.length})</span>
                          <span>{workout.sets_count || 0} SÉRIES TOTAIS</span>
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                          {exercises.map((ex, exIdx) => (
                            <div
                              key={ex.id || exIdx}
                              className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800/80 rounded-xl p-3.5 shadow-2xs"
                            >
                              <div className="flex items-center justify-between gap-3 mb-2.5">
                                <div className="flex items-center gap-3 min-w-0">
                                  {/* Miniatura do Exercício com Trigger para Modal do GIF */}
                                  <div
                                    onClick={() => handleOpenExerciseMedia(ex.title, ex.media || null, workout.id, exIdx)}
                                    className="relative w-11 h-11 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 overflow-hidden flex-shrink-0 cursor-pointer group shadow-2xs hover:border-purple-400 dark:hover:border-purple-500/60 transition"
                                    title="Clique para ver animação e execução"
                                  >
                                    {ex.media?.image_url ? (
                                      <img
                                        src={ex.media.image_url}
                                        alt={ex.title}
                                        className="w-full h-full object-cover group-hover:scale-110 transition duration-300"
                                        loading="lazy"
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center text-slate-400">
                                        <Dumbbell className="h-5 w-5" />
                                      </div>
                                    )}
                                    <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                                      <Play className="h-3.5 w-3.5 text-white fill-current" />
                                    </div>
                                  </div>

                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs text-purple-600 dark:text-purple-400 font-mono font-bold">#{exIdx + 1}</span>
                                      <h4
                                        onClick={() => handleOpenExerciseMedia(ex.title, ex.media || null, workout.id, exIdx)}
                                        className="text-sm font-bold text-slate-900 dark:text-white hover:text-purple-600 dark:hover:text-purple-400 transition cursor-pointer truncate"
                                      >
                                        {ex.title}
                                      </h4>
                                    </div>
                                    {ex.media && (
                                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                        <span className="text-[10px] text-slate-500 dark:text-slate-400 capitalize truncate max-w-[150px]">
                                          {ex.media.name}
                                        </span>
                                        {ex.media.target_pt && (
                                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-50 dark:bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30">
                                            {ex.media.target_pt}
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 flex-shrink-0">
                                  <button
                                    onClick={() => handleOpenExerciseMedia(ex.title, ex.media || null, workout.id, exIdx)}
                                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-purple-50 dark:hover:bg-purple-500/20 hover:text-purple-600 dark:hover:text-purple-300 transition"
                                    title="Ver execução em GIF animado"
                                  >
                                    <Play className="h-2.5 w-2.5 fill-current" />
                                    Ver GIF
                                  </button>
                                  {ex.notes && (
                                    <span className="text-[11px] text-slate-500 dark:text-slate-400 italic hidden sm:inline">“{ex.notes}”</span>
                                  )}
                                </div>
                              </div>

                              {/* Tabela de Séries */}
                              {Array.isArray(ex.sets) && ex.sets.length > 0 ? (
                                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 mt-2">
                                  {ex.sets.map((set, sIdx) => (
                                    <div
                                      key={set.id || sIdx}
                                      className="bg-slate-50 dark:bg-slate-950/70 border border-slate-200/90 dark:border-slate-800/60 rounded-lg p-2 text-xs flex flex-col justify-between shadow-2xs"
                                    >
                                      <div className="flex items-center justify-between mb-1">
                                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase">Série {sIdx + 1}</span>
                                        {getSetTypeBadge(set.set_type)}
                                      </div>
                                      <div className="font-black text-slate-900 dark:text-white text-sm">
                                        {set.weight_kg > 0 ? `${set.weight_kg} kg` : 'Peso Corpóreo'}
                                      </div>
                                      <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between mt-1">
                                        <span className="font-semibold text-slate-700 dark:text-slate-300">{set.reps} reps</span>
                                        {set.rpe && (
                                          <span className="text-amber-600 dark:text-amber-400 text-[10px] font-bold">RPE {set.rpe}</span>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs text-slate-400 dark:text-slate-500 italic">Sem séries registradas para este exercício.</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      /* Detalhes Zepp / Cardio */
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        {workout.avg_hr && workout.avg_hr > 0 ? (
                          <div className="p-3 bg-white dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
                            <span className="text-slate-500 dark:text-slate-400 block mb-1 font-medium">FC Média</span>
                            <span className="text-sm font-bold text-slate-900 dark:text-white">{workout.avg_hr} bpm</span>
                          </div>
                        ) : null}
                        {workout.max_hr && workout.max_hr > 0 ? (
                          <div className="p-3 bg-white dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
                            <span className="text-slate-500 dark:text-slate-400 block mb-1 font-medium">FC Máxima</span>
                            <span className="text-sm font-bold text-rose-600 dark:text-rose-400">{workout.max_hr} bpm</span>
                          </div>
                        ) : null}
                        {workout.training_effect && workout.training_effect > 0 ? (
                          <div className="p-3 bg-white dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
                            <span className="text-slate-500 dark:text-slate-400 block mb-1 font-medium">Training Effect</span>
                            <span className="text-sm font-bold text-cyan-600 dark:text-cyan-400">{(workout.training_effect / 10).toFixed(1)}</span>
                          </div>
                        ) : null}
                        {workout.steps && workout.steps > 0 ? (
                          <div className="p-3 bg-white dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
                            <span className="text-slate-500 dark:text-slate-400 block mb-1 font-medium">Passos da Sessão</span>
                            <span className="text-sm font-bold text-slate-900 dark:text-white">{workout.steps.toLocaleString('pt-BR')}</span>
                          </div>
                        ) : null}
                        {workout.device && (
                          <div className="p-3 bg-white dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
                            <span className="text-slate-500 dark:text-slate-400 block mb-1 font-medium">Dispositivo</span>
                            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{workout.device}</span>
                          </div>
                        )}
                        {workout.city && (
                          <div className="p-3 bg-white dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
                            <span className="text-slate-500 dark:text-slate-400 block mb-1 font-medium">Localização</span>
                            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                              {workout.city}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
          {workouts.length >= limit && (
            <div className="text-center pt-2">
              <button
                onClick={() => setLimit((prev) => prev + 500)}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300 transition shadow-xs"
              >
                Carregar mais treinos (+500)...
              </button>
            </div>
          )}
        </div>
      )}
        </>
      )}

      {/* Modal de Detalhes / Animação GIF do Exercício */}
      {modalExercise && (
        <ExerciseDetailModal
          isOpen={isExerciseModalOpen}
          onClose={() => setIsExerciseModalOpen(false)}
          exerciseTitle={modalExercise.title}
          media={modalExercise.media}
          onReLinkSuccess={handleReLinkSuccess}
        />
      )}
    </div>
  )
}
