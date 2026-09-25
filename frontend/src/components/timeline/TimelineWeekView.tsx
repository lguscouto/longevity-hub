import React from 'react'
import { Activity, CalendarDays, ChevronRight, Dumbbell, Heart, Moon } from 'lucide-react'
import type { TimelineWeekSummary } from './types'

interface TimelineWeekViewProps {
  weeks: TimelineWeekSummary[]
  onSelectWeek?: (start: string, end: string) => void
}

export const TimelineWeekView: React.FC<TimelineWeekViewProps> = ({ weeks, onSelectWeek }) => {
  if (!weeks || weeks.length === 0) {
    return (
      <div className="p-8 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl text-slate-400 text-sm">
        Nenhum resumo semanal encontrado para o período.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {weeks.map(w => {
        return (
          <div
            key={`${w.week_start}_${w.week_end}`}
            className="p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 shadow-sm hover:shadow-md transition"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800/80">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                  <CalendarDays className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">{w.title}</h3>
                  <p className="text-[11px] text-slate-400">
                    {w.week_start} até {w.week_end}
                  </p>
                </div>
              </div>

              {onSelectWeek && (
                <button
                  onClick={() => onSelectWeek(w.week_start, w.week_end)}
                  className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 w-fit"
                >
                  Ver dias desta semana <ChevronRight className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Grid de Métricas Agregadas */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-3.5">
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-1">
                  <Moon className="h-3 w-3 text-indigo-400" /> Sono Médio
                </span>
                <span className="text-sm font-black text-slate-900 dark:text-white">
                  {w.avg_sleep_formatted || '—'}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-1">
                  <Heart className="h-3 w-3 text-rose-500" /> FC Repouso Médio
                </span>
                <span className="text-sm font-black text-slate-900 dark:text-white">
                  {w.rhr_delta_bpm ? `${w.rhr_delta_bpm} bpm` : '—'}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-1">
                  <Dumbbell className="h-3 w-3 text-purple-500" /> Treinos
                </span>
                <span className="text-sm font-black text-slate-900 dark:text-white">
                  {w.workout_count} {w.workout_count === 1 ? 'sessão' : 'sessões'}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-1">
                  <Activity className="h-3 w-3 text-emerald-500" /> Eventos-Chave
                </span>
                <span className="text-sm font-black text-slate-900 dark:text-white">
                  {w.key_events.length} registrados
                </span>
              </div>
            </div>

            {/* Lista de Eventos Relevantes da Semana */}
            {w.key_events.length > 0 && (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60">
                <span className="text-[11px] font-semibold text-slate-400 mb-1.5 block">Destaques da semana:</span>
                <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
                  {w.key_events.map(e => (
                    <li key={e.id} className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{e.title}</span>
                      {e.description && <span className="text-slate-400 truncate">({e.description})</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
