import React from 'react'
import {
  Dumbbell,
  Activity,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Play,
  MapPin,
} from 'lucide-react'
import { WorkoutSession, WorkoutExercise, ExerciseMedia } from '../../types'
import { Button } from '../ui'

interface WorkoutSessionCardProps {
  workout: WorkoutSession
  isExpanded: boolean
  details: WorkoutSession
  isLoadingDetails: boolean
  onToggleExpand: (workoutId: string) => void
  onOpenExerciseMedia: (
    title: string,
    media: ExerciseMedia | null,
    workoutId?: string,
    exerciseIndex?: number
  ) => void
}

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

const getSetTypeBadge = (type?: string) => {
  switch ((type || '').toLowerCase()) {
    case 'warmup':
      return (
        <span className="text-xs uppercase font-bold px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30">
          Aquecimento
        </span>
      )
    case 'drop_set':
      return (
        <span className="text-xs uppercase font-bold px-1.5 py-0.5 rounded bg-purple-50 dark:bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30">
          Drop Set
        </span>
      )
    case 'failure':
      return (
        <span className="text-xs uppercase font-bold px-1.5 py-0.5 rounded bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30">
          Falha
        </span>
      )
    default:
      return (
        <span className="text-xs uppercase font-semibold px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30">
          Normal
        </span>
      )
  }
}

export const WorkoutSessionCard: React.FC<WorkoutSessionCardProps> = ({
  workout,
  isExpanded,
  details,
  isLoadingDetails,
  onToggleExpand,
  onOpenExerciseMedia,
}) => {
  const isHevy = workout.source === 'Hevy'
  const exercises: WorkoutExercise[] = Array.isArray(details.exercises) ? details.exercises : []

  return (
    <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700/80 rounded-radius-xl overflow-hidden shadow-xs hover:shadow-md transition-all duration-200">
      {/* Header do Card (Clicável) */}
      {/* ds-exception: DSX-015 */}
      <button
        type="button"
        onClick={() => onToggleExpand(workout.id)}
        aria-expanded={isExpanded}
        aria-label={`${isExpanded ? 'Recolher' : 'Expandir'} detalhes do treino ${workout.title || workout.category}`}
        className="w-full text-left p-4 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
      >
        <div className="flex items-center gap-3.5">
          {/* Badge de Ícone da Fonte */}
          <div
            className={`p-2.5 rounded-radius-lg border flex-shrink-0 ${
              isHevy
                ? 'bg-purple-50 dark:bg-purple-500/10 border-purple-200 dark:border-purple-500/30 text-purple-600 dark:text-purple-400'
                : 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
            }`}
          >
            {isHevy ? (
              <Dumbbell className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Activity className="h-5 w-5" aria-hidden="true" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-slate-900 dark:text-white text-base">
                {workout.title || workout.category}
              </span>
              <span
                className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-radius-full border ${
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
          {isHevy ? (
            <div className="flex items-center gap-3 text-xs">
              {workout.volume_kg && workout.volume_kg > 0 ? (
                <div className="text-right">
                  <span className="text-xs uppercase font-semibold text-slate-500 dark:text-slate-400 block">Carga</span>
                  <span className="font-black text-purple-700 dark:text-purple-300">{formatVolume(workout.volume_kg)}</span>
                </div>
              ) : null}

              {workout.sets_count && workout.sets_count > 0 ? (
                <div className="text-right">
                  <span className="text-xs uppercase font-semibold text-slate-500 dark:text-slate-400 block">Séries</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{workout.sets_count}</span>
                </div>
              ) : null}

              <div className="text-right">
                <span className="text-xs uppercase font-semibold text-slate-500 dark:text-slate-400 block">Duração</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{formatDuration(workout.duration_min)}</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 text-xs">
              {workout.calories > 0 && (
                <div className="text-right">
                  <span className="text-xs uppercase font-semibold text-slate-500 dark:text-slate-400 block">Calorias</span>
                  <span className="font-bold text-amber-600 dark:text-amber-300">{workout.calories} kcal</span>
                </div>
              )}
              {workout.distance_km > 0 && (
                <div className="text-right">
                  <span className="text-xs uppercase font-semibold text-slate-500 dark:text-slate-400 block">Distância</span>
                  <span className="font-bold text-cyan-600 dark:text-cyan-300">{workout.distance_km.toFixed(2)} km</span>
                </div>
              )}
              <div className="text-right">
                <span className="text-xs uppercase font-semibold text-slate-500 dark:text-slate-400 block">Duração</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{formatDuration(workout.duration_min)}</span>
              </div>
            </div>
          )}

          {/* Chevron */}
          <div className="text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-white p-1">
            {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </div>
        </div>
      </button>

      {/* Conteúdo Expansível */}
      {isExpanded && (
        <div className="border-t border-slate-200 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-950/60 p-4 sm:p-5">
          {isLoadingDetails ? (
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
                    className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800/80 rounded-radius-lg p-3.5 shadow-2xs"
                  >
                    <div className="flex items-center justify-between gap-3 mb-2.5">
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Miniatura do Exercício com Trigger para Modal do GIF */}
                        {/* ds-exception: DSX-016 */}
                        <button
                          type="button"
                          onClick={() => onOpenExerciseMedia(ex.title, ex.media || null, workout.id, exIdx)}
                          className="relative w-11 h-11 rounded-radius-lg bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 overflow-hidden flex-shrink-0 cursor-pointer group shadow-2xs hover:border-purple-400 dark:hover:border-purple-500/60 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 text-left"
                          title="Clique para ver animação e execução"
                          aria-label={`Ver animação e execução de ${ex.title}`}
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
                              <Dumbbell className="h-5 w-5" aria-hidden="true" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                            <Play className="h-3.5 w-3.5 text-white fill-current" aria-hidden="true" />
                          </div>
                        </button>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-purple-600 dark:text-purple-400 font-mono font-bold">#{exIdx + 1}</span>
                            <h4
                              onClick={() => onOpenExerciseMedia(ex.title, ex.media || null, workout.id, exIdx)}
                              className="text-sm font-bold text-slate-900 dark:text-white hover:text-purple-600 dark:hover:text-purple-400 transition cursor-pointer truncate"
                            >
                              {ex.title}
                            </h4>
                          </div>
                          {ex.media && (
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              <span className="text-xs text-slate-500 dark:text-slate-400 capitalize truncate max-w-[150px]">
                                {ex.media.name}
                              </span>
                              {ex.media.target_pt && (
                                <span className="text-xs font-bold px-1.5 py-0.5 rounded-radius-sm bg-purple-50 dark:bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30">
                                  {ex.media.target_pt}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => onOpenExerciseMedia(ex.title, ex.media || null, workout.id, exIdx)}
                          leftIcon={Play}
                          title="Ver execução em GIF animado"
                          aria-label={`Ver GIF animado de ${ex.title}`}
                          className="min-h-0 h-auto py-1 px-2.5 text-xs font-bold"
                        >
                          Ver GIF
                        </Button>
                        {ex.notes && (
                          <span className="text-xs text-slate-500 dark:text-slate-400 italic hidden sm:inline">“{ex.notes}”</span>
                        )}
                      </div>
                    </div>

                    {/* Tabela de Séries */}
                    {Array.isArray(ex.sets) && ex.sets.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 mt-2">
                        {ex.sets.map((set, sIdx) => (
                          <div
                            key={set.id || sIdx}
                            className="bg-slate-50 dark:bg-slate-950/70 border border-slate-200/90 dark:border-slate-800/60 rounded-radius-md p-2 text-xs flex flex-col justify-between shadow-2xs"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase">Série {sIdx + 1}</span>
                              {getSetTypeBadge(set.set_type)}
                            </div>
                            <div className="font-black text-slate-900 dark:text-white text-sm">
                              {set.weight_kg > 0 ? `${set.weight_kg} kg` : 'Peso Corpóreo'}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between mt-1">
                              <span className="font-semibold text-slate-700 dark:text-slate-300">{set.reps} reps</span>
                              {set.rpe && (
                                <span className="text-amber-600 dark:text-amber-400 text-xs font-bold">RPE {set.rpe}</span>
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
                <div className="p-3 bg-white dark:bg-slate-900/60 rounded-radius-lg border border-slate-200 dark:border-slate-800 shadow-2xs">
                  <span className="text-slate-500 dark:text-slate-400 block mb-1 font-medium">FC Média</span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white">{workout.avg_hr} bpm</span>
                </div>
              ) : null}
              {workout.max_hr && workout.max_hr > 0 ? (
                <div className="p-3 bg-white dark:bg-slate-900/60 rounded-radius-lg border border-slate-200 dark:border-slate-800 shadow-2xs">
                  <span className="text-slate-500 dark:text-slate-400 block mb-1 font-medium">FC Máxima</span>
                  <span className="text-sm font-bold text-rose-600 dark:text-rose-400">{workout.max_hr} bpm</span>
                </div>
              ) : null}
              {workout.training_effect && workout.training_effect > 0 ? (
                <div className="p-3 bg-white dark:bg-slate-900/60 rounded-radius-lg border border-slate-200 dark:border-slate-800 shadow-2xs">
                  <span className="text-slate-500 dark:text-slate-400 block mb-1 font-medium">Training Effect</span>
                  <span className="text-sm font-bold text-cyan-600 dark:text-cyan-400">{(workout.training_effect / 10).toFixed(1)}</span>
                </div>
              ) : null}
              {workout.steps && workout.steps > 0 ? (
                <div className="p-3 bg-white dark:bg-slate-900/60 rounded-radius-lg border border-slate-200 dark:border-slate-800 shadow-2xs">
                  <span className="text-slate-500 dark:text-slate-400 block mb-1 font-medium">Passos da Sessão</span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white">{workout.steps.toLocaleString('pt-BR')}</span>
                </div>
              ) : null}
              {workout.device && (
                <div className="p-3 bg-white dark:bg-slate-900/60 rounded-radius-lg border border-slate-200 dark:border-slate-800 shadow-2xs">
                  <span className="text-slate-500 dark:text-slate-400 block mb-1 font-medium">Dispositivo</span>
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{workout.device}</span>
                </div>
              )}
              {workout.city && (
                <div className="p-3 bg-white dark:bg-slate-900/60 rounded-radius-lg border border-slate-200 dark:border-slate-800 shadow-2xs">
                  <span className="text-slate-500 dark:text-slate-400 block mb-1 font-medium">Localização</span>
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" aria-hidden="true" />
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
}
