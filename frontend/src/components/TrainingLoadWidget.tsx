import React from 'react'
import { Dumbbell, Flame, TrendingUp, CheckCircle2 } from 'lucide-react'

interface TrainingLoadWidgetProps {
  dailyLoad?: number | null
  rollingLoad?: number | null
  optimalMin?: number | null
  optimalMax?: number | null
  workoutCount?: number | null
  workoutDurationMin?: number | null
}

export const TrainingLoadWidget: React.FC<TrainingLoadWidgetProps> = ({
  dailyLoad,
  rollingLoad,
  optimalMin,
  optimalMax,
  workoutCount,
  workoutDurationMin,
}) => {
  const hasData = rollingLoad != null || dailyLoad != null || (workoutCount != null && workoutCount > 0)

  if (!hasData) return null

  const isOptimal =
    rollingLoad != null &&
    optimalMin != null &&
    optimalMax != null &&
    rollingLoad >= optimalMin &&
    rollingLoad <= optimalMax

  return (
    <div className="glass-card p-6 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400">
            <Dumbbell className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Carga de Treino & Recuperação Sustentável</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Carga cardiovascular acumulada Zepp</p>
          </div>
        </div>

        {isOptimal && (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold border border-emerald-500/20">
            <CheckCircle2 className="h-3.5 w-3.5" /> Faixa Ótima
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase block mb-1">Carga Hoje</span>
          <span className="text-xl font-black text-slate-900 dark:text-white">{dailyLoad != null ? dailyLoad : '—'}</span>
        </div>

        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase block mb-1">Carga Acumulada</span>
          <span className="text-xl font-black text-slate-900 dark:text-white">{rollingLoad != null ? rollingLoad : '—'}</span>
        </div>

        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase block mb-1">Faixa Ótima</span>
          <span className="text-sm font-black text-slate-900 dark:text-white">
            {optimalMin != null && optimalMax != null ? `${optimalMin} - ${optimalMax}` : '—'}
          </span>
        </div>

        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase block mb-1">Sessões / Duração</span>
          <span className="text-sm font-black text-slate-900 dark:text-white">
            {workoutCount || 0} treinos ({workoutDurationMin != null ? `${Math.round(workoutDurationMin)}m` : '0m'})
          </span>
        </div>
      </div>
    </div>
  )
}
