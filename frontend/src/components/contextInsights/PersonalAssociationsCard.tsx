import React, { useEffect, useState } from 'react'
import {
  Activity,
  AlertCircle,
  BrainCircuit,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Filter,
  RefreshCw,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
} from 'lucide-react'
import { fetchPersonalAssociations, recomputePersonalAssociations } from './api'
import type { PersonalAssociation } from './types'

interface PersonalAssociationsCardProps {
  initialMetric?: string
}

export const PersonalAssociationsCard: React.FC<PersonalAssociationsCardProps> = ({
  initialMetric,
}) => {
  const [associations, setAssociations] = useState<PersonalAssociation[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [recomputing, setRecomputing] = useState<boolean>(false)
  const [selectedMetric, setSelectedMetric] = useState<string>(initialMetric || '')
  const [expanded, setExpanded] = useState<boolean>(false)

  const loadData = () => {
    setLoading(true)
    fetchPersonalAssociations(selectedMetric || undefined)
      .then(res => {
        if (res && Array.isArray(res.items)) {
          setAssociations(res.items.filter(it => Boolean(it && it.target_metric)))
        } else {
          setAssociations([])
        }
      })
      .catch(() => {
        setAssociations([])
      })
      .finally(() => {
        setLoading(false)
      })
  }

  useEffect(() => {
    loadData()
  }, [selectedMetric])

  const handleRecompute = async () => {
    setRecomputing(true)
    try {
      await recomputePersonalAssociations(selectedMetric || undefined)
      loadData()
    } catch (e: any) {
      alert(e?.message || 'Falha ao recalcular padrões.')
    } finally {
      setRecomputing(false)
    }
  }

  const metricTabs = [
    { key: '', label: 'Todos' },
    { key: 'hrv_ms', label: 'HRV' },
    { key: 'rhr_bpm', label: 'FC Repouso' },
    { key: 'sleep_minutes', label: 'Sono' },
    { key: 'weight_kg', label: 'Peso' },
  ]

  const getConfidenceBadge = (confidence: string) => {
    if (confidence === 'high') {
      return (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          Alta confiança
        </span>
      )
    }
    if (confidence === 'moderate') {
      return (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
          Moderada
        </span>
      )
    }
    return (
      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
        Em aprendizado
      </span>
    )
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
            <BrainCircuit className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              Padrões Pessoais Aprendidos
              <span className="text-[10px] bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold px-2 py-0.5 rounded-full">
                N-of-1 Bayesiano
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Relações estatísticas empíricas individuais calibradas com seus hábitos e feedback.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRecompute}
            disabled={recomputing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition disabled:opacity-50"
            title="Recalcular correlações e regularização bayesiana"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${recomputing ? 'animate-spin text-indigo-500' : ''}`} />
            <span className="hidden sm:inline">Recalcular</span>
          </button>
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {metricTabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setSelectedMetric(tab.key)}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              selectedMetric === tab.key
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Body */}
      {loading ? (
        <div className="py-8 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
          <RefreshCw className="h-5 w-5 animate-spin text-indigo-500" />
          <span>Calculando correlações históricas...</span>
        </div>
      ) : associations.length === 0 ? (
        <div className="p-5 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400 space-y-1">
          <p className="font-semibold text-slate-500 dark:text-slate-400">
            Nenhuma associação com histórico suficiente encontrada.
          </p>
          <p>
            Conforme você registrar eventos manuais e sincronizar treinos e sono, o motor aprenderá
            como seu corpo responde individualmente a cada fator.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {(expanded ? associations : associations.slice(0, 3)).map(item => (
            <div
              key={item.id}
              className="p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/40 space-y-2 hover:border-indigo-300 dark:hover:border-indigo-800 transition"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    {item.factor_name}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-200/60 dark:bg-slate-700 px-1.5 py-0.5 rounded">
                    {(item.target_metric || '').replace('_', ' ')}
                  </span>
                </div>
                {getConfidenceBadge(item.confidence)}
              </div>

              <p className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                {item.headline}
              </p>

              <div className="text-[11px] text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-x-3 gap-y-1 pt-1.5 border-t border-slate-200/50 dark:border-slate-700/50">
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  n = {item.sample_size} observações
                </span>
                <span>•</span>
                <span>Janela: {item.window_hours}h</span>
                <span>•</span>
                <span>Shrinkage Bayesiano: {(item.shrinkage_factor * 100).toFixed(0)}%</span>
                {item.user_feedback_balance !== 0 && (
                  <>
                    <span>•</span>
                    <span
                      className={`font-semibold flex items-center gap-0.5 ${
                        item.user_feedback_balance > 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-amber-600 dark:text-amber-400'
                      }`}
                    >
                      {item.user_feedback_balance > 0 ? (
                        <>
                          <ThumbsUp className="h-3 w-3" /> Calibrado (+{item.user_feedback_balance})
                        </>
                      ) : (
                        <>
                          <ThumbsDown className="h-3 w-3" /> Atenuado ({item.user_feedback_balance})
                        </>
                      )}
                    </span>
                  </>
                )}
              </div>
            </div>
          ))}

          {associations.length > 3 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="w-full text-center text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline pt-1"
            >
              {expanded
                ? 'Ver menos'
                : `Ver todos os ${associations.length} padrões aprendidos`}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
