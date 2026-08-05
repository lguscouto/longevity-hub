import React, { useEffect, useState } from 'react'
import { Activity, Compass, ArrowUpRight, ArrowDownRight, ShieldCheck } from 'lucide-react'
import { requestJson } from '../lib/api'

interface Factor {
  metric: string
  label: string
  change_pct: number
  impact: 'positive' | 'negative' | 'neutral'
}

interface GuidanceResponse {
  state: 'optimal' | 'moderate' | 'recover' | 'insufficient_data'
  label: string
  confidence: string
  score?: number | null
  factors: Factor[]
  primary_action: string
  limitations: string[]
}

interface DailyGuidanceCardProps {
  selectedDate: string
  refreshKey?: number
}

export const DailyGuidanceCard: React.FC<DailyGuidanceCardProps> = ({ selectedDate, refreshKey }) => {
  const [guidance, setGuidance] = useState<GuidanceResponse | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let isMounted = true
    setLoading(true)
    requestJson<GuidanceResponse>(`/api/daily-guidance?date_ref=${selectedDate}`)
      .then((data) => {
        if (isMounted) setGuidance(data)
      })
      .catch(() => {
        if (isMounted) setGuidance(null)
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [selectedDate, refreshKey])

  if (!guidance) return null

  const stateKey = guidance?.state in { optimal: 1, moderate: 1, recover: 1, insufficient_data: 1 }
    ? guidance.state
    : 'insufficient_data'

  const stateColors = {
    optimal: 'from-emerald-500/15 via-emerald-500/5 to-transparent border-emerald-500/30 text-emerald-600 dark:text-emerald-400',
    moderate: 'from-amber-500/15 via-amber-500/5 to-transparent border-amber-500/30 text-amber-600 dark:text-amber-400',
    recover: 'from-violet-500/15 via-violet-500/5 to-transparent border-violet-500/30 text-violet-600 dark:text-violet-400',
    insufficient_data: 'from-slate-500/15 via-slate-500/5 to-transparent border-slate-500/30 text-slate-600 dark:text-slate-400',
  }[stateKey]

  const factorsList = Array.isArray(guidance?.factors) ? guidance.factors : []
  const limitationsList = Array.isArray(guidance?.limitations) ? guidance.limitations : []

  return (
    <div className={`p-6 rounded-3xl glass-card border bg-gradient-to-br ${stateColors} shadow-sm space-y-4`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-white/40 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200 dark:border-slate-800">
            <Compass className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider opacity-75">Como estou hoje?</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-900/10 dark:bg-white/10 uppercase">
                {guidance?.confidence || 'unavailable'}
              </span>
            </div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">{guidance?.label || 'Orientação Diária'}</h2>
          </div>
        </div>

        {guidance?.score != null && (
          <div className="text-right">
            <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{guidance.score}</span>
            <span className="text-[10px] font-bold uppercase block text-slate-500 dark:text-slate-400">Score Prontidão</span>
          </div>
        )}
      </div>

      <div className="p-4 rounded-2xl bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
          Ação Recomendada Hoje
        </span>
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          {guidance?.primary_action || 'Sem dados suficientes para recomendar intensidade.'}
        </p>
      </div>

      {limitationsList.length > 0 && (
        <div className="p-3 rounded-xl bg-slate-500/10 border border-slate-500/20 text-xs text-slate-600 dark:text-slate-400 space-y-1">
          <span className="font-bold">Limitações de Dados:</span>
          <ul className="list-disc list-inside">
            {limitationsList.map((lim, idx) => (
              <li key={idx}>{lim}</li>
            ))}
          </ul>
        </div>
      )}

      {factorsList.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Fatores Chave:</span>
          {factorsList.map((factor, idx) => (
            <span
              key={idx}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold border ${
                factor.impact === 'negative'
                  ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                  : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
              }`}
            >
              {factor.impact === 'negative' ? <ArrowDownRight className="h-3.5 w-3.5" /> : <ArrowUpRight className="h-3.5 w-3.5" />}
              {factor.label} {factor.change_pct !== 0 && `(${factor.change_pct > 0 ? '+' : ''}${factor.change_pct}%)`}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
