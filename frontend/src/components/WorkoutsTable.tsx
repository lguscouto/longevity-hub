import React, { useEffect, useState, useMemo } from 'react'
import {
  Activity,
  Search,
  Flame,
  Clock,
  Heart,
  TrendingUp,
  MapPin,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react'

import { requestJson } from '../lib/api'
import { WorkoutSession } from '../types'
import { EmptyState, LoadingPanel, InlineError } from './ui'

interface WorkoutsTableProps {
  initialLimit?: number
}

const CATEGORIES = ['Todas', 'Corrida', 'Ciclismo', 'Treino Força', 'Caminhada', 'Outros'] as const
type CategoryFilter = typeof CATEGORIES[number]

export const WorkoutsTable: React.FC<WorkoutsTableProps> = ({ initialLimit = 50 }) => {
  const [workouts, setWorkouts] = useState<WorkoutSession[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('Todas')
  const [searchQuery, setSearchQuery] = useState('')
  const [limit, setLimit] = useState(initialLimit)

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

  const fetchWorkouts = async () => {
    setLoading(true)
    setError(null)
    try {
      const categoryParam = selectedCategory !== 'Todas' ? `&category=${encodeURIComponent(selectedCategory)}` : ''
      const data = await requestJson<WorkoutSession[]>(`/api/workouts?limit=${limit}${categoryParam}`)
      setWorkouts(Array.isArray(data) ? data : [])
    } catch (err: any) {
      setError(err?.message || 'Não foi possível carregar os treinos.')
      setWorkouts([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setLimit(initialLimit)
  }, [selectedCategory, initialLimit])

  useEffect(() => {
    void fetchWorkouts()
  }, [selectedCategory, limit])

  const filteredWorkouts = useMemo(() => {
    return workouts.filter((w) => {
      const matchesSearch =
        !searchQuery ||
        w.activity_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        w.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (w.city && w.city.toLowerCase().includes(searchQuery.toLowerCase()))
      return matchesSearch
    })
  }, [workouts, searchQuery])

  const getCategoryBadgeClass = (category: string) => {
    switch (category) {
      case 'Corrida':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
      case 'Ciclismo':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
      case 'Treino Força':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
      case 'Caminhada':
        return 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20'
      default:
        return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
    }
  }

  return (
    <div className="glass-card p-6 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-5 shadow-sm">
      {/* Header with Title and Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Histórico Detalhado de Treinos
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Sessões registradas via Zepp e dispositivos vestíveis
            </p>
          </div>
        </div>

        <button
          onClick={fetchWorkouts}
          disabled={loading}
          className="self-start sm:self-auto relative inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] after:content-[''] after:absolute after:top-1/2 after:left-1/2 after:-translate-x-1/2 after:-translate-y-1/2 after:min-h-[44px] after:w-full md:after:hidden rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Atualizar</span>
        </button>
      </div>

      {/* Controls: Search and Category Pills */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <SlidersHorizontal className="h-3.5 w-3.5 text-slate-400 mr-1 hidden sm:inline" />
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`relative px-3 py-1 min-h-[36px] sm:min-h-[32px] after:content-[''] after:absolute after:top-1/2 after:left-1/2 after:-translate-x-1/2 after:-translate-y-1/2 after:min-h-[44px] after:w-full md:after:hidden rounded-full text-xs font-bold transition-all shrink-0 ${
                selectedCategory === cat
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar esporte ou cidade..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Table Content */}
      {loading ? (
        <LoadingPanel message="Carregando histórico de sessões..." skeletonRows={4} />
      ) : error ? (
        <InlineError message={error} onRetry={fetchWorkouts} />
      ) : filteredWorkouts.length === 0 ? (
        <EmptyState
          title="Nenhuma sessão de treino encontrada."
          description={
            searchQuery || selectedCategory !== 'Todas'
              ? 'Tente ajustar os filtros ou o termo de busca para localizar suas sessões.'
              : 'Sincronize o Zepp para importar o histórico completo.'
          }
          icon={Activity}
          secondaryAction={
            searchQuery || selectedCategory !== 'Todas'
              ? {
                  label: 'Limpar filtros',
                  onClick: () => {
                    setSearchQuery('')
                    setSelectedCategory('Todas')
                  },
                }
              : undefined
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs block md:table">
            <thead className="hidden md:table-header-group bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Data / Hora</th>
                <th className="py-3 px-4">Modalidade</th>
                <th className="py-3 px-4">Duração</th>
                <th className="py-3 px-4">Distância</th>
                <th className="py-3 px-4">Calorias</th>
                <th className="py-3 px-4">FC Média / Máx</th>
                <th className="py-3 px-4">TE Carga</th>
              </tr>
            </thead>
            <tbody className="block md:table-row-group divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredWorkouts.map((w) => (
                <tr
                  key={w.id}
                  className="block md:table-row p-4 md:py-3 md:px-4 space-y-2 md:space-y-0 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <td className="block md:table-cell py-1 md:py-3 md:px-4 md:whitespace-nowrap">
                    <div className="flex items-center justify-between md:block">
                      <span className="font-semibold text-slate-900 dark:text-white block">
                        {formatDate(w.workout_date)}
                      </span>
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Clock className="h-3 w-3 inline" /> {w.workout_time}
                      </span>
                    </div>
                  </td>

                  <td className="block md:table-cell py-1 md:py-3 md:px-4 md:whitespace-nowrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border ${getCategoryBadgeClass(
                          w.category
                        )}`}
                      >
                        {w.category}
                      </span>
                      <span className="font-medium text-slate-700 dark:text-slate-200">
                        {w.activity_type}
                      </span>
                      {w.city && (
                        <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                          <MapPin className="h-2.5 w-2.5 inline" /> {w.city}
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="inline-block md:table-cell mr-3 md:mr-0 py-1 md:py-3 md:px-4 md:whitespace-nowrap font-semibold text-slate-800 dark:text-slate-200">
                    <span className="md:hidden text-[10px] text-slate-400 font-normal mr-1">Duração:</span>
                    {w.duration_min} min
                  </td>

                  <td className="inline-block md:table-cell mr-3 md:mr-0 py-1 md:py-3 md:px-4 md:whitespace-nowrap text-slate-700 dark:text-slate-300">
                    <span className="md:hidden text-[10px] text-slate-400 font-normal mr-1">Dist:</span>
                    {w.distance_km > 0 ? (
                      <span className="font-semibold">{w.distance_km} km</span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>

                  <td className="inline-block md:table-cell mr-3 md:mr-0 py-1 md:py-3 md:px-4 md:whitespace-nowrap text-slate-700 dark:text-slate-300">
                    <span className="md:hidden text-[10px] text-slate-400 font-normal mr-1">Calorias:</span>
                    {w.calories > 0 ? (
                      <span className="inline-flex items-center gap-1 font-semibold">
                        <Flame className="h-3.5 w-3.5 text-amber-500 inline" />
                        {w.calories} kcal
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>

                  <td className="inline-block md:table-cell mr-3 md:mr-0 py-1 md:py-3 md:px-4 md:whitespace-nowrap text-slate-700 dark:text-slate-300">
                    <span className="md:hidden text-[10px] text-slate-400 font-normal mr-1">FC:</span>
                    {w.avg_hr != null || w.max_hr != null ? (
                      <span className="inline-flex items-center gap-1">
                        <Heart className="h-3.5 w-3.5 text-rose-500 inline" />
                        <span className="font-semibold">{w.avg_hr ?? '—'}</span>
                        <span className="text-slate-400">/</span>
                        <span className="text-slate-500 dark:text-slate-400">
                          {w.max_hr ?? '—'}
                        </span>
                        <span className="text-[10px] text-slate-400">bpm</span>
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>

                  <td className="block md:table-cell py-1 md:py-3 md:px-4 md:whitespace-nowrap">
                    {w.training_effect != null ? (
                      <span className="inline-flex items-center gap-1 font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-lg text-[11px] border border-amber-500/20">
                        <TrendingUp className="h-3 w-3 inline" />
                        TE {w.training_effect}
                      </span>
                    ) : (
                      <span className="text-slate-400 hidden md:inline">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {workouts.length >= limit && limit < 500 && (
            <div className="py-3 bg-slate-50/50 dark:bg-slate-900/40 border-t border-slate-200 dark:border-slate-800 text-center">
              <button
                type="button"
                onClick={() => setLimit((prev) => Math.min(prev + 50, 500))}
                className="inline-flex items-center gap-1.5 px-4 py-2 min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition shadow-sm"
              >
                <span>Carregar mais treinos (+50)</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
