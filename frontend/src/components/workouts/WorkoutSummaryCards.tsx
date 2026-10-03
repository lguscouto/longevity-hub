import React from 'react'
import { Activity, Award, Clock, Flame } from 'lucide-react'
import { WorkoutsSummary } from '../../types'

interface WorkoutSummaryCardsProps {
  summary: WorkoutsSummary
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

export const WorkoutSummaryCards: React.FC<WorkoutSummaryCardsProps> = ({ summary }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {/* Card 1: Sessões */}
      <div className="p-5 rounded-radius-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md transition flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
          <span className="text-xs font-semibold uppercase tracking-wider">Total de Sessões</span>
          <div className="p-2 rounded-radius-lg bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 dark:border-emerald-500/30">
            <Activity className="h-4 w-4" aria-hidden="true" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {summary.total_workouts ?? 0}
          </div>
          <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span className="text-purple-600 dark:text-purple-400 font-bold">{summary.hevy_workouts ?? 0} Hevy</span>
            <span>•</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">{summary.zepp_workouts ?? 0} Zepp</span>
          </div>
        </div>
      </div>

      {/* Card 2: Volume Total de Força (U22-P1-61 desambiguação com Carga Cardiovascular) */}
      <div className="p-5 rounded-radius-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md transition flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
          <span className="text-xs font-semibold uppercase tracking-wider">Volume Total de Força</span>
          <div className="p-2 rounded-radius-lg bg-purple-500/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/20 dark:border-purple-500/30">
            <Award className="h-4 w-4" aria-hidden="true" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {formatVolume(summary.total_volume_kg ?? 0)}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
            {(summary.total_sets ?? 0) > 0
              ? `${summary.total_sets} séries • ${summary.total_reps ?? 0} reps`
              : 'Sem séries registradas'}
          </div>
        </div>
      </div>

      {/* Card 3: Tempo Total */}
      <div className="p-5 rounded-radius-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md transition flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
          <span className="text-xs font-semibold uppercase tracking-wider">Tempo em Treino</span>
          <div className="p-2 rounded-radius-lg bg-cyan-500/10 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 dark:border-cyan-500/30">
            <Clock className="h-4 w-4" aria-hidden="true" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {formatDuration(summary.total_duration_min ?? 0)}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Média de{' '}
            {(summary.total_workouts ?? 0) > 0
              ? Math.round((summary.total_duration_min ?? 0) / (summary.total_workouts || 1))
              : 0}{' '}
            min por sessão
          </div>
        </div>
      </div>

      {/* Card 4: Calorias */}
      <div className="p-5 rounded-radius-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md transition flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
          <span className="text-xs font-semibold uppercase tracking-wider">Calorias Gastas</span>
          <div className="p-2 rounded-radius-lg bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/20 dark:border-amber-500/30">
            <Flame className="h-4 w-4" aria-hidden="true" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {(summary.total_calories ?? 0).toLocaleString('pt-BR')} kcal
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
            {(summary.avg_hr ?? 0) > 0 ? `FC média ${Math.round(summary.avg_hr)} bpm` : 'Atividade e musculação'}
          </div>
        </div>
      </div>
    </div>
  )
}
