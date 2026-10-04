import React, { useEffect, useState } from 'react'
import {
  Dumbbell,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  BookOpen,
} from 'lucide-react'

import { requestJson } from '../lib/api'
import { WorkoutSession, WorkoutsSummary, ExerciseMedia } from '../types'
import { ExerciseDetailModal } from './ExerciseDetailModal'
import { ExerciseCatalogView } from './ExerciseCatalogView'
import { EmptyState, LoadingIndicator, ErrorState, Input, Button } from './ui'
import { WorkoutSummaryCards } from './workouts/WorkoutSummaryCards'
import { WorkoutSessionCard } from './workouts/WorkoutSessionCard'

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
      setError(err?.message || 'Não foi possível carregar os dados de treinos.')
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/20 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
              <Dumbbell className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Treinos e desempenho</h2>
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
          <Button
            variant="primary"
            size="sm"
            onClick={handleSyncHevy}
            loading={isSyncingHevy}
            loadingText="Sincronizando Hevy..."
            leftIcon={RefreshCw}
            className="bg-purple-600 hover:bg-purple-500 text-white font-bold"
          >
            Sincronizar Hevy
          </Button>

          {/* Sync Zepp */}
          {onSyncZepp && (
            <Button
              variant="primary"
              size="sm"
              onClick={onSyncZepp}
              loading={isSyncingZepp}
              loadingText="Sincronizando Zepp..."
              leftIcon={RefreshCw}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
            >
              Sincronizar Zepp
            </Button>
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
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSyncFeedback(null)}
                className="text-xs opacity-75 hover:opacity-100 font-bold min-h-0 h-auto py-1 px-2"
              >
                Dispensar
              </Button>
            </div>
          )}

          {/* Cards de Resumo / KPIs */}
          {summary && <WorkoutSummaryCards summary={summary} />}

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
            <div className="w-full md:w-80">
              <Input
                type="text"
                placeholder="Buscar exercício ou treino (ex: Supino, Ombros)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={<Search className="h-4 w-4" />}
              />
            </div>
          </div>

          {/* Contagem e Status de Treinos */}
          {!loading && !error && (
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1 py-0.5">
              <span>
                Exibindo <strong className="text-slate-900 dark:text-white font-bold">{workouts.length}</strong>{' '}
                {workouts.length === 1 ? 'treino' : 'treinos'}
                {sourceFilter !== 'all' ? ` da fonte ${sourceFilter}` : ''}
                {selectedPeriod === 2026
                  ? ' em 2026 (desde 01/01/2026)'
                  : selectedPeriod > 0
                  ? ` nos últimos ${selectedPeriod} dias`
                  : ''}
              </span>
              {workouts.length >= limit && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setLimit((prev) => prev + 500)}
                  className="text-purple-600 dark:text-purple-400 hover:underline font-semibold min-h-0 h-auto py-0 px-1"
                >
                  Carregar mais (+500)...
                </Button>
              )}
            </div>
          )}

          {/* Lista de Sessões de Treino */}
          {loading ? (
            <div className="p-12 flex justify-center bg-white dark:bg-slate-900/20 rounded-2xl border border-slate-200 dark:border-slate-800/50 shadow-xs">
              <LoadingIndicator label="Carregando treinos..." size="md" />
            </div>
          ) : error ? (
            <ErrorState
              title="Falha ao carregar treinos"
              message={error}
              onRetry={loadData}
            />
          ) : workouts.length === 0 ? (
            <EmptyState
              icon={Dumbbell}
              title="Nenhum treino encontrado"
              description="Não encontramos sessões para os filtros selecionados. Sincronize com a API do Hevy ou importe seus treinos do Zepp."
              action={{
                label: 'Sincronizar Treinos Hevy Agora',
                onClick: handleSyncHevy,
              }}
            />
          ) : (
            <div className="space-y-3">
              {workouts.map((workout) => (
                <WorkoutSessionCard
                  key={workout.id}
                  workout={workout}
                  isExpanded={!!expandedIds[workout.id]}
                  details={detailedWorkouts[workout.id] || workout}
                  isLoadingDetails={!!loadingDetails[workout.id]}
                  onToggleExpand={toggleExpand}
                  onOpenExerciseMedia={handleOpenExerciseMedia}
                />
              ))}

              {workouts.length >= limit && (
                <div className="text-center pt-2">
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={() => setLimit((prev) => prev + 500)}
                    className="text-xs font-bold"
                  >
                    Carregar mais treinos (+500)...
                  </Button>
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
