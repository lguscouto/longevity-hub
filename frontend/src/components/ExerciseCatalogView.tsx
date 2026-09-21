import React, { useState, useEffect, useCallback } from 'react'
import {
  Search,
  Dumbbell,
  Play,
  Filter,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Sparkles,
  Layers,
} from 'lucide-react'
import { ExerciseDetailModal, ExerciseMedia } from './ExerciseDetailModal'

const MUSCLE_FILTERS = [
  { label: 'Todos os Músculos', value: '' },
  { label: 'Peitoral', value: 'chest', type: 'body_part' },
  { label: 'Costas', value: 'back', type: 'body_part' },
  { label: 'Ombros', value: 'shoulders', type: 'body_part' },
  { label: 'Braços', value: 'upper arms', type: 'body_part' },
  { label: 'Pernas & Coxas', value: 'upper legs', type: 'body_part' },
  { label: 'Panturrilhas', value: 'lower legs', type: 'body_part' },
  { label: 'Abdômen & Core', value: 'waist', type: 'body_part' },
  { label: 'Cardio', value: 'cardio', type: 'body_part' },
]

const EQUIPMENT_FILTERS = [
  { label: 'Todos os Equipamentos', value: '' },
  { label: 'Halteres', value: 'dumbbell' },
  { label: 'Barra', value: 'barbell' },
  { label: 'Cabos & Polia', value: 'cable' },
  { label: 'Máquinas', value: 'leverage machine' },
  { label: 'Peso Corporal', value: 'body weight' },
  { label: 'Smith Machine', value: 'smith machine' },
]

export const ExerciseCatalogView: React.FC = () => {
  const [exercises, setExercises] = useState<ExerciseMedia[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [selectedMuscle, setSelectedMuscle] = useState(MUSCLE_FILTERS[0])
  const [selectedEquipment, setSelectedEquipment] = useState(EQUIPMENT_FILTERS[0])
  const [page, setPage] = useState(1)
  const limit = 24

  // Modal de Detalhes / GIF
  const [selectedExercise, setSelectedExercise] = useState<ExerciseMedia | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const fetchCatalog = useCallback(async () => {
    try {
      setLoading(true)
      const offset = (page - 1) * limit
      const params = new URLSearchParams()
      params.append('limit', String(limit))
      params.append('offset', String(offset))

      if (query.trim()) {
        params.append('query', query.trim())
      }

      if (selectedMuscle.value) {
        params.append('body_part', selectedMuscle.value)
      }

      if (selectedEquipment.value) {
        params.append('equipment', selectedEquipment.value)
      }

      const res = await fetch(`/api/workouts/catalog?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setExercises(Array.isArray(data.items) ? data.items : [])
        setTotal(typeof data.total === 'number' ? data.total : 0)
      }
    } catch (err) {
      console.error('Erro ao carregar catálogo de exercícios:', err)
    } finally {
      setLoading(false)
    }
  }, [page, query, selectedMuscle, selectedEquipment])

  useEffect(() => {
    fetchCatalog()
  }, [fetchCatalog])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
  }

  const handleOpenDetail = (ex: ExerciseMedia) => {
    setSelectedExercise(ex)
    setIsModalOpen(true)
  }

  const totalPages = Math.ceil(total / limit) || 1

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Barra de Filtros e Busca */}
      <div className="bg-white dark:bg-slate-900/80 p-5 sm:p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-purple-50 dark:bg-purple-500/15 border border-purple-200 dark:border-purple-500/30 text-purple-600 dark:text-purple-400">
                <Layers className="h-5 w-5" />
              </span>
              Biblioteca Geral de Exercícios
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Explore 1.324 exercícios com demonstrações em GIF animado, grupos musculares e instruções.
            </p>
          </div>

          {/* Input de Busca */}
          <form onSubmit={handleSearchSubmit} className="relative min-w-[280px] sm:min-w-[340px]">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setPage(1)
              }}
              placeholder="Buscar por nome (ex: squat, bench press, curl)..."
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-purple-500 shadow-2xs"
            />
          </form>
        </div>

        {/* Chips de Filtro por Grupo Muscular */}
        <div className="space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Grupo Muscular</span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {MUSCLE_FILTERS.map((m) => (
              <button
                key={m.label}
                onClick={() => {
                  setSelectedMuscle(m)
                  setPage(1)
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                  selectedMuscle.value === m.value
                    ? 'bg-purple-600 text-white shadow-xs font-bold'
                    : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Chips de Filtro por Equipamento */}
        <div className="space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Equipamento</span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {EQUIPMENT_FILTERS.map((eq) => (
              <button
                key={eq.label}
                onClick={() => {
                  setSelectedEquipment(eq)
                  setPage(1)
                }}
                className={`px-3 py-1 rounded-lg text-[11px] font-medium transition ${
                  selectedEquipment.value === eq.value
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-2xs font-bold'
                    : 'bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                }`}
              >
                {eq.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Contagem e Status */}
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
        <span>
          Exibindo <strong>{exercises.length}</strong> de <strong>{total}</strong> exercícios encontrados
        </span>
        <span>Página {page} de {totalPages}</span>
      </div>

      {/* Grid de Cards de Exercícios */}
      {loading ? (
        <div className="py-20 text-center text-xs text-slate-500 dark:text-slate-400">
          <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-3 text-purple-600 dark:text-purple-400" />
          Carregando catálogo de exercícios...
        </div>
      ) : exercises.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900/50 rounded-3xl border border-slate-200 dark:border-slate-800">
          <Dumbbell className="h-10 w-10 text-slate-400 dark:text-slate-600 mx-auto mb-2" />
          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Nenhum exercício encontrado</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Tente buscar com outros termos ou selecione "Todos os Músculos".
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {exercises.map((ex) => (
            <div
              key={ex.catalog_id || (ex as any).id}
              onClick={() => handleOpenDetail(ex)}
              className="group bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800/90 rounded-2xl p-4 shadow-2xs hover:shadow-md hover:border-purple-300 dark:hover:border-purple-500/50 transition cursor-pointer flex flex-col justify-between"
            >
              <div>
                {/* Mídia / Thumbnail */}
                <div className="relative aspect-square w-full rounded-xl bg-slate-100 dark:bg-slate-950 overflow-hidden mb-3 border border-slate-100 dark:border-slate-800/80 flex items-center justify-center">
                  {ex.image_url ? (
                    <img
                      src={ex.image_url}
                      alt={ex.name}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                  ) : (
                    <Dumbbell className="h-8 w-8 text-slate-400" />
                  )}

                  {/* Play Overlay */}
                  <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                    <div className="p-3 rounded-full bg-white/90 text-purple-600 shadow-md">
                      <Play className="h-5 w-5 fill-current" />
                    </div>
                  </div>
                </div>

                {/* Título do Exercício */}
                <h4 className="text-sm font-bold text-slate-900 dark:text-white capitalize group-hover:text-purple-600 dark:group-hover:text-purple-400 transition leading-snug line-clamp-2">
                  {ex.name}
                </h4>
              </div>

              {/* Tags de Classificação */}
              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-1 text-[10px]">
                <span className="font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-500/15 px-2 py-0.5 rounded-md border border-purple-200 dark:border-purple-500/30 truncate max-w-[120px]">
                  {ex.target_pt || ex.target || 'Geral'}
                </span>
                <span className="text-slate-500 dark:text-slate-400 truncate">
                  {ex.equipment_pt || ex.equipment || ''}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="flex items-center gap-1 px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </button>

          <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
            {page} / {totalPages}
          </span>

          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="flex items-center gap-1 px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            Próximo
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Modal de Detalhes */}
      {selectedExercise && (
        <ExerciseDetailModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          exerciseTitle={selectedExercise.name}
          media={selectedExercise}
        />
      )}
    </div>
  )
}
