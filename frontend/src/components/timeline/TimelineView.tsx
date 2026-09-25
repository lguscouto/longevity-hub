import React, { useEffect, useState } from 'react'
import {
  Activity,
  Calendar,
  CalendarDays,
  Filter,
  Layers,
  PlusCircle,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react'
import {
  deleteHealthEvent,
  fetchMonthlySummaries,
  fetchTimelineFeed,
  fetchWeeklySummaries,
  syncUserTimezone,
  triggerTimelineReconcile,
} from './api'
import { AddHealthEventModal } from './AddHealthEventModal'
import { TimelineDayView } from './TimelineDayView'
import { TimelineMonthView } from './TimelineMonthView'
import { TimelineWeekView } from './TimelineWeekView'
import { InsightDrawer } from '../contextInsights/InsightDrawer'
import { PersonalAssociationsCard } from '../contextInsights/PersonalAssociationsCard'
import type {
  TimelineDaySummary,
  TimelineMonthSummary,
  TimelineResponse,
  TimelineWeekSummary,
} from './types'

type ZoomLevel = 'day' | 'week' | 'month'

export const TimelineView: React.FC = () => {
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>('day')
  const [loading, setLoading] = useState<boolean>(true)
  const [reconciling, setReconciling] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  // Dados por nível de visualização
  const [dayFeed, setDayFeed] = useState<TimelineResponse | null>(null)
  const [weeksData, setWeeksData] = useState<TimelineWeekSummary[]>([])
  const [monthsData, setMonthsData] = useState<TimelineMonthSummary[]>([])

  // Filtros
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [onlySignificant, setOnlySignificant] = useState<boolean>(false)
  const [daysRange, setDaysRange] = useState<number>(30)

  // Drawer contextual
  const [drawerMetric, setDrawerMetric] = useState<string | null>(null)
  const [drawerDate, setDrawerDate] = useState<string | null>(null)

  // Modal de adição
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false)

  // Sincroniza timezone do navegador silenciosamente na montagem
  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
      if (tz) {
        syncUserTimezone(tz).catch(() => {})
      }
    } catch {}
  }, [])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      if (zoomLevel === 'day') {
        const endDate = new Date().toISOString().split('T')[0]
        const d = new Date()
        d.setDate(d.getDate() - daysRange)
        const startDate = d.toISOString().split('T')[0]

        const res = await fetchTimelineFeed({
          startDate,
          endDate,
          category: selectedCategory || undefined,
          significance: onlySignificant ? 'significativa' : undefined,
          limit: 300,
        })
        setDayFeed(res)
      } else if (zoomLevel === 'week') {
        const weeks = await fetchWeeklySummaries(undefined, undefined, 8)
        setWeeksData(weeks)
      } else if (zoomLevel === 'month') {
        const months = await fetchMonthlySummaries(6)
        setMonthsData(months)
      }
    } catch (err: any) {
      setError(err?.message || 'Falha ao carregar a Linha do Tempo.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [zoomLevel, selectedCategory, onlySignificant, daysRange])

  const handleReconcile = async () => {
    setReconciling(true)
    try {
      await triggerTimelineReconcile()
      await loadData()
    } catch (err: any) {
      setError(err?.message || 'Erro ao reconciliar eventos.')
    } finally {
      setReconciling(false)
    }
  }

  const handleDeleteEvent = async (eventId: string) => {
    if (!window.confirm('Tem certeza de que deseja remover este evento manual?')) return
    try {
      await deleteHealthEvent(eventId)
      await loadData()
    } catch (err: any) {
      alert(err?.message || 'Não foi possível excluir o evento.')
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Barra de Ações e Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-3xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 shadow-sm backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              Linha do Tempo
            </h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              Contexto Longitudinal
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Correlação cronológica de treinos, exames, intervenções e estilo de vida.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          {/* Controle Segmentado de Zoom (Dia | Semana | Mês) */}
          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/80">
            <button
              onClick={() => setZoomLevel('day')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                zoomLevel === 'day'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Dia
            </button>
            <button
              onClick={() => setZoomLevel('week')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                zoomLevel === 'week'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Semana
            </button>
            <button
              onClick={() => setZoomLevel('month')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                zoomLevel === 'month'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Mês
            </button>
          </div>

          {/* Botão de Reconciliação */}
          <button
            onClick={handleReconcile}
            disabled={reconciling}
            title="Reconcilia treinos, exames e suplementos para a Timeline"
            className="flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-semibold bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shadow-sm transition disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${reconciling ? 'animate-spin text-emerald-500' : ''}`} />
            {reconciling ? 'Reconciliando...' : 'Reconciliar'}
          </button>

          {/* Botão Principal: Adicionar Evento */}
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 shadow-md transition"
          >
            <PlusCircle className="h-4 w-4" /> Adicionar Evento
          </button>
        </div>
      </div>

      {/* Barra de Filtros (visível no modo Dia) */}
      {zoomLevel === 'day' && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-white/40 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/60 text-xs">
          <div className="flex items-center flex-wrap gap-2">
            <span className="text-slate-400 font-semibold flex items-center gap-1">
              <Filter className="h-3.5 w-3.5" /> Filtro:
            </span>
            {[
              { key: '', label: 'Todos' },
              { key: 'exercise', label: 'Treinos' },
              { key: 'clinical', label: 'Exames' },
              { key: 'intervention', label: 'Suplementos' },
              { key: 'lifestyle', label: 'Estilo de vida' },
              { key: 'symptom', label: 'Sintomas' },
            ].map(cat => (
              <button
                key={cat.key}
                onClick={() => setSelectedCategory(cat.key)}
                className={`px-2.5 py-1 rounded-xl font-medium transition ${
                  selectedCategory === cat.key
                    ? 'bg-emerald-500 text-white shadow-sm font-bold'
                    : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 cursor-pointer text-slate-600 dark:text-slate-400">
              <input
                type="checkbox"
                checked={onlySignificant}
                onChange={e => setOnlySignificant(e.target.checked)}
                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span>Apenas significativas</span>
            </label>

            <select
              value={daysRange}
              onChange={e => setDaysRange(Number(e.target.value))}
              className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium"
            >
              <option value={7}>Últimos 7 dias</option>
              <option value={14}>Últimos 14 dias</option>
              <option value={30}>Últimos 30 dias</option>
              <option value={60}>Últimos 60 dias</option>
              <option value={90}>Últimos 90 dias</option>
            </select>
          </div>
        </div>
      )}

      {/* Padrões Pessoais Aprendidos (Fase 3) */}
      <PersonalAssociationsCard />

      {/* Conteúdo Principal */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-3">
          <RefreshCw className="h-6 w-6 animate-spin text-emerald-500" />
          <span>Carregando Linha do Tempo...</span>
        </div>
      ) : error ? (
        <div className="p-6 rounded-3xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs">
          {error}
        </div>
      ) : (
        <div>
          {zoomLevel === 'day' && (
            <div>
              {dayFeed && dayFeed.days.length > 0 ? (
                <div className="space-y-2 mt-2">
                  {dayFeed.days.map(d => (
                    <TimelineDayView
                      key={d.date_ref}
                      day={d}
                      onDeleteManualEvent={handleDeleteEvent}
                      onExplainMetric={(m, dateRef) => {
                        setDrawerMetric(m)
                        setDrawerDate(dateRef)
                      }}
                    />
                  ))}
                </div>
              ) : (
                <div className="p-12 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl text-slate-400 text-xs">
                  Nenhum evento registrado no período selecionado. Use o botão "+ Adicionar Evento" para registrar contexto pessoal.
                </div>
              )}
            </div>
          )}

          {zoomLevel === 'week' && (
            <TimelineWeekView
              weeks={weeksData}
              onSelectWeek={(start, end) => {
                setZoomLevel('day')
              }}
            />
          )}

          {zoomLevel === 'month' && (
            <TimelineMonthView
              months={monthsData}
              onSelectMonth={() => {
                setZoomLevel('week')
              }}
            />
          )}
        </div>
      )}

      {/* Modal para Adicionar Evento */}
      <AddHealthEventModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={loadData}
      />

      {/* Drawer Contextual (Entender Mudança) */}
      <InsightDrawer
        isOpen={Boolean(drawerMetric && drawerDate)}
        onClose={() => {
          setDrawerMetric(null)
          setDrawerDate(null)
        }}
        metric={drawerMetric || ''}
        date={drawerDate || ''}
        onOpenAddEvent={d => {
          setDrawerMetric(null)
          setDrawerDate(null)
          setIsAddModalOpen(true)
        }}
      />
    </div>
  )
}
