import React from 'react'
import { Activity, Calendar, ChevronRight, Dumbbell, Heart, Pill, Scale } from 'lucide-react'
import type { TimelineMonthSummary } from './types'

interface TimelineMonthViewProps {
  months: TimelineMonthSummary[]
  onSelectMonth?: (monthRef: string) => void
}

export const TimelineMonthView: React.FC<TimelineMonthViewProps> = ({ months, onSelectMonth }) => {
  if (!months || months.length === 0) {
    return (
      <div className="p-8 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl text-slate-400 text-sm">
        Nenhum resumo mensal encontrado.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {months.map(m => {
        return (
          <div
            key={m.month_ref}
            className="p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 shadow-sm hover:shadow-md transition"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800/80">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                  <Calendar className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">{m.title}</h3>
                  <p className="text-[11px] text-slate-400">{m.month_ref}</p>
                </div>
              </div>

              {onSelectMonth && (
                <button
                  onClick={() => onSelectMonth(m.month_ref)}
                  className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 w-fit"
                >
                  Explorar eventos deste mês <ChevronRight className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Grid de Tendências Mensais */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-3.5">
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-1">
                  <Scale className="h-3 w-3 text-cyan-500" /> Variação de Peso
                </span>
                <span className="text-sm font-black text-slate-900 dark:text-white">
                  {m.weight_delta_kg !== null && m.weight_delta_kg !== undefined
                    ? `${m.weight_delta_kg > 0 ? '+' : ''}${m.weight_delta_kg} kg`
                    : '—'}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-1">
                  <Activity className="h-3 w-3 text-emerald-500" /> HRV Médio
                </span>
                <span className="text-sm font-black text-slate-900 dark:text-white">
                  {m.hrv_delta_pct ? `${Math.round(m.hrv_delta_pct)} ms` : '—'}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-1">
                  <Heart className="h-3 w-3 text-rose-500" /> FC Repouso Médio
                </span>
                <span className="text-sm font-black text-slate-900 dark:text-white">
                  {m.rhr_delta_bpm ? `${Math.round(m.rhr_delta_bpm)} bpm` : '—'}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-1">
                  <Dumbbell className="h-3 w-3 text-purple-500" /> Volume Treinos
                </span>
                <span className="text-sm font-black text-slate-900 dark:text-white">
                  {m.total_workouts} treinos
                </span>
              </div>
            </div>

            {/* Protocolos / Intervenções Ativas no Mês */}
            {m.active_interventions && m.active_interventions.length > 0 && (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60 mb-2">
                <span className="text-[11px] font-semibold text-slate-400 mb-1.5 flex items-center gap-1">
                  <Pill className="h-3 w-3 text-emerald-500" /> Protocolos Ativos:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {m.active_interventions.map((p, idx) => (
                    <span
                      key={idx}
                      className="text-[11px] font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/50 px-2 py-0.5 rounded-lg"
                    >
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
