import React, { useEffect, useState } from 'react'
import { ShieldCheck, ShieldAlert, Shield } from 'lucide-react'
import { requestJson } from '../lib/api'

interface DataConfidenceBadgeProps {
  selectedDate: string
}

interface QualitySummary {
  date_ref: string
  coverage_pct: number
  confidence: 'high' | 'medium' | 'low' | 'unavailable'
  metrics_available: number
  metrics_expected: number
  warnings: string[]
}

export const DataConfidenceBadge: React.FC<DataConfidenceBadgeProps> = ({ selectedDate }) => {
  const [summary, setSummary] = useState<QualitySummary | null>(null)

  useEffect(() => {
    let isMounted = true
    requestJson<QualitySummary>(`/api/quality/daily?date_ref=${selectedDate}`)
      .then((data) => {
        if (isMounted) setSummary(data)
      })
      .catch(() => {
        if (isMounted) setSummary(null)
      })
    return () => {
      isMounted = false
    }
  }, [selectedDate])

  if (!summary) return null

  const config = {
    high: {
      label: 'Confiança Alta',
      bg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
      icon: ShieldCheck,
    },
    medium: {
      label: 'Confiança Média',
      bg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
      icon: Shield,
    },
    low: {
      label: 'Confiança Baixa',
      bg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
      icon: ShieldAlert,
    },
    unavailable: {
      label: 'Dados Parciais',
      bg: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20',
      icon: ShieldAlert,
    },
  }[summary.confidence]

  const Icon = config.icon

  return (
    <div
      title={`${summary.metrics_available}/${summary.metrics_expected} métricas ativas (${summary.coverage_pct}% cobertura)`}
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${config.bg} transition-all`}
    >
      <Icon className="h-3.5 w-3.5" />
      <span>{config.label}</span>
      <span className="opacity-75 font-normal">({summary.coverage_pct}%)</span>
    </div>
  )
}
