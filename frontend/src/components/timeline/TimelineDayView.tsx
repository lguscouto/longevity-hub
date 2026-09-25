import React from 'react'
import {
  Activity,
  AlertTriangle,
  Coffee,
  Compass,
  Dna,
  Dumbbell,
  FileText,
  Heart,
  Moon,
  Pill,
  Plane,
  Scale,
  Sparkles,
  Thermometer,
  Trash2,
  Utensils,
  Wine,
  Zap,
} from 'lucide-react'
import type { HealthEvent, TimelineDaySummary } from './types'
import { ExplainChangeButton } from '../contextInsights/ExplainChangeButton'

interface TimelineDayViewProps {
  day: TimelineDaySummary
  onDeleteManualEvent?: (eventId: string) => void
  onExplainMetric?: (metric: string, date: string) => void
}

function getEventIcon(event: HealthEvent) {
  const type = (event.event_type || '').toLowerCase()
  const cat = (event.category || '').toLowerCase()

  if (type === 'workout' || cat === 'exercise') return Dumbbell
  if (type === 'lab_result' || cat === 'clinical') return Dna
  if (type === 'supplement' || type === 'medication' || cat === 'intervention') return Pill
  if (type === 'alcohol') return Wine
  if (type === 'caffeine') return Coffee
  if (type === 'symptom') return Thermometer
  if (type === 'travel') return Plane
  if (type === 'stress') return Zap
  if (type === 'nutrition') return Utensils
  if (type === 'sleep' || cat === 'sleep') return Moon
  if (type === 'metric_change' || event.source_type === 'change_point') return Activity
  return FileText
}

function getEventColor(event: HealthEvent) {
  const type = (event.event_type || '').toLowerCase()
  const cat = (event.category || '').toLowerCase()

  if (type === 'workout' || cat === 'exercise') {
    return {
      bg: 'bg-purple-500/10 dark:bg-purple-950/30',
      border: 'border-purple-200 dark:border-purple-800/60',
      text: 'text-purple-600 dark:text-purple-400',
      badge: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
    }
  }
  if (type === 'lab_result' || cat === 'clinical') {
    return {
      bg: 'bg-cyan-500/10 dark:bg-cyan-950/30',
      border: 'border-cyan-200 dark:border-cyan-800/60',
      text: 'text-cyan-600 dark:text-cyan-400',
      badge: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300',
    }
  }
  if (type === 'supplement' || cat === 'intervention') {
    return {
      bg: 'bg-emerald-500/10 dark:bg-emerald-950/30',
      border: 'border-emerald-200 dark:border-emerald-800/60',
      text: 'text-emerald-600 dark:text-emerald-400',
      badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
    }
  }
  if (type === 'alcohol') {
    return {
      bg: 'bg-amber-500/10 dark:bg-amber-950/30',
      border: 'border-amber-200 dark:border-amber-800/60',
      text: 'text-amber-600 dark:text-amber-400',
      badge: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
    }
  }
  if (type === 'symptom') {
    return {
      bg: 'bg-rose-500/10 dark:bg-rose-950/30',
      border: 'border-rose-200 dark:border-rose-800/60',
      text: 'text-rose-600 dark:text-rose-400',
      badge: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
    }
  }
  if (type === 'metric_change' || event.source_type === 'change_point') {
    return {
      bg: 'bg-indigo-500/10 dark:bg-indigo-950/30',
      border: 'border-indigo-200 dark:border-indigo-800/60',
      text: 'text-indigo-600 dark:text-indigo-400',
      badge: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300',
    }
  }
  return {
    bg: 'bg-slate-500/10 dark:bg-slate-800/50',
    border: 'border-slate-200 dark:border-slate-700',
    text: 'text-slate-600 dark:text-slate-400',
    badge: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  }
}

function formatSleep(min?: number | null) {
  if (!min || min <= 0) return null
  const h = Math.floor(min / 60)
  const m = Math.round(min % 60)
  return `${h}h ${String(m).padStart(2, '0')}m`
}

export const TimelineDayView: React.FC<TimelineDayViewProps> = ({ day, onDeleteManualEvent, onExplainMetric }) => {
  const m = day.metrics_summary || {}
  const sleepStr = formatSleep(m.sleep_minutes)

  return (
    <div className="relative pl-6 sm:pl-8 pb-8 last:pb-2 border-l-2 border-slate-200 dark:border-slate-800">
      {/* Marcador na linha do tempo */}
      <div className="absolute -left-2.5 top-0.5 h-5 w-5 rounded-full bg-white dark:bg-slate-900 border-2 border-emerald-500 flex items-center justify-center">
        <div className="h-2 w-2 rounded-full bg-emerald-500" />
      </div>

      {/* Cabeçalho do Dia */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black px-2 py-0.5 rounded-md bg-slate-900 text-white dark:bg-slate-800 dark:text-emerald-400 tracking-wider">
            {day.day_of_week}
          </span>
          <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{day.display_date}</span>
          <span className="text-xs text-slate-400">({day.date_ref})</span>
        </div>

        {/* Resumo Rápido de Métricas do Dia (Pill Strip) */}
        {(sleepStr || m.hrv_ms || m.rhr_bpm || m.steps || m.weight_kg) && (
          <div className="flex items-center flex-wrap gap-2 text-[11px] text-slate-600 dark:text-slate-400 bg-slate-100/80 dark:bg-slate-800/60 px-2.5 py-1 rounded-xl w-fit">
            {sleepStr && (
              <button
                type="button"
                onClick={() => onExplainMetric?.('sleep_minutes', day.date_ref)}
                className="flex items-center gap-1 font-medium hover:text-indigo-500 transition cursor-pointer"
                title="Clique para entender alteração de sono"
              >
                <Moon className="h-3 w-3 text-indigo-400" /> {sleepStr}
              </button>
            )}
            {m.hrv_ms && (
              <button
                type="button"
                onClick={() => onExplainMetric?.('hrv_ms', day.date_ref)}
                className="flex items-center gap-1 font-medium hover:text-emerald-500 transition cursor-pointer"
                title="Clique para entender alteração de HRV"
              >
                <Activity className="h-3 w-3 text-emerald-500" /> {Math.round(m.hrv_ms)} ms
              </button>
            )}
            {m.rhr_bpm && (
              <button
                type="button"
                onClick={() => onExplainMetric?.('rhr_bpm', day.date_ref)}
                className="flex items-center gap-1 font-medium hover:text-rose-500 transition cursor-pointer"
                title="Clique para entender alteração de FC de Repouso"
              >
                <Heart className="h-3 w-3 text-rose-500" /> {Math.round(m.rhr_bpm)} bpm
              </button>
            )}
            {m.steps && m.steps > 0 && (
              <span className="hidden sm:inline font-medium" title="Passos">
                • {m.steps.toLocaleString('pt-BR')} passos
              </span>
            )}
            {m.weight_kg && (
              <button
                type="button"
                onClick={() => onExplainMetric?.('weight_kg', day.date_ref)}
                className="flex items-center gap-1 font-medium hover:text-cyan-500 transition cursor-pointer"
                title="Clique para entender tendência de peso"
              >
                <Scale className="h-3 w-3 text-cyan-500" /> {m.weight_kg.toFixed(1)} kg
              </button>
            )}
          </div>
        )}
      </div>

      {/* Lista de Eventos do Dia */}
      {day.events && day.events.length > 0 ? (
        <div className="space-y-2.5">
          {day.events.map(ev => {
            const Icon = getEventIcon(ev)
            const style = getEventColor(ev)
            const isManual = ev.source === 'manual'

            return (
              <div
                key={ev.id}
                className={`flex items-start justify-between gap-3 p-3.5 rounded-2xl border ${style.bg} ${style.border} transition hover:shadow-sm`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 border ${style.border} ${style.text}`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center flex-wrap gap-1.5 mb-1">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">{ev.title}</span>
                      {ev.time_ref && (
                        <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 bg-black/5 dark:bg-white/10 px-1.5 py-0.5 rounded-md">
                          {ev.time_ref}
                        </span>
                      )}
                      <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md ${style.badge}`}>
                        {ev.category}
                      </span>
                      {ev.significance === 'significativa' && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center gap-0.5">
                          <AlertTriangle className="h-2.5 w-2.5" /> Significativa
                        </span>
                      )}
                      {ev.source_type === 'change_point' && (
                        <span className="text-[10px] font-black px-1.5 py-0.2 rounded-md bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30 flex items-center gap-0.5">
                          <Zap className="h-2.5 w-2.5" /> Quebra de Patamar
                        </span>
                      )}
                    </div>
                    {ev.description && (
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{ev.description}</p>
                    )}
                    {ev.source_type === 'change_point' && onExplainMetric && (
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            const metaMetric = ev.metadata?.metric || 'hrv_ms'
                            onExplainMetric(metaMetric, ev.date_ref)
                          }}
                          className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Compass className="h-3 w-3" /> Entender o que antecedeu esta mudança de patamar
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Ações (excluir evento manual) */}
                {isManual && onDeleteManualEvent && (
                  <button
                    onClick={() => onDeleteManualEvent(ev.id)}
                    title="Remover evento manual"
                    className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="p-3 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-xs text-slate-400 text-center">
          Nenhum evento registrado nesta data.
        </div>
      )}
    </div>
  )
}
