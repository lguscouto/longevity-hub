import React, { useEffect, useState } from 'react'
import { ShieldCheck, AlertTriangle, Layers, RefreshCw } from 'lucide-react'
import { requestJson } from '../lib/api'
import { formatLocalDateKey, formatConfidenceLabel } from '../lib/dataSemantics'
import { Input, IconButton } from './ui'

interface MetricItem {
  date_ref: string
  metric_key: string
  source: string
  observed_at?: string | null
  sample_count?: number
  coverage_pct?: number
  quality_status: string
  warnings: string[]
}

interface QualitySummary {
  date_ref: string
  coverage_pct: number
  confidence: string
  metrics_available: number
  metrics_expected: number
  warnings: string[]
  sources: string[]
  items: MetricItem[]
}

export const DataQualityPanel: React.FC = () => {
  const todayStr = formatLocalDateKey()
  const [selectedDate, setSelectedDate] = useState(todayStr)
  const [summary, setSummary] = useState<QualitySummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  const fetchQuality = async () => {
    setLoading(true)
    setError(false)
    try {
      const data = await requestJson<QualitySummary>(`/api/quality/daily?date_ref=${selectedDate}`)
      setSummary(data)
    } catch {
      setSummary(null)
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchQuality()
  }, [selectedDate])

  return (
    <div className="surface-card p-6 rounded-radius-xl border border-slate-200 dark:border-slate-800 space-y-4">
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-radius-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400">
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Qualidade e cobertura dos dados</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Verifique a origem e a qualidade dos dados coletados.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="min-h-[36px] text-xs py-1"
          />
          <IconButton
            variant="secondary"
            size="sm"
            onClick={() => void fetchQuality()}
            icon={RefreshCw}
            aria-label="Atualizar dados"
            loading={loading}
          />
        </div>
      </div>

      {error && <p role="status" className="text-sm text-rose-700 dark:text-rose-300">Não foi possível carregar a qualidade dos dados.</p>}

      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-radius-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
            <span className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 block mb-1">Confiança dos dados</span>
            <span className="text-lg font-black text-slate-900 dark:text-white">{formatConfidenceLabel(summary?.confidence, true)}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400 block mt-1">
              {summary?.metrics_available ?? 0} de {summary?.metrics_expected ?? 7} métricas validadas
            </span>
          </div>

          <div className="p-4 rounded-radius-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
            <span className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 block mb-1">Cobertura dos dados</span>
            <span className="text-lg font-black text-slate-900 dark:text-white">{typeof summary.coverage_pct === 'number' && Number.isFinite(summary.coverage_pct) ? `${summary.coverage_pct}%` : 'Indisponível'}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400 block mt-1">Quantidade de registros nas últimas 24h</span>
          </div>

          <div className="p-4 rounded-radius-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
            <span className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 block mb-1">Dispositivos conectados</span>
            <div className="flex items-center gap-1.5 mt-1">
              <Layers className="h-4 w-4 text-indigo-500" aria-hidden="true" />
              <span className="text-sm font-bold text-slate-900 dark:text-white">{(summary?.sources || []).join(', ') || 'Nenhuma'}</span>
            </div>
          </div>
        </div>
      )}

      {summary && (summary.warnings || []).length > 0 && (
        <div className="p-3 rounded-radius-lg bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs space-y-1">
          <div className="flex items-center gap-1.5 font-bold">
            <AlertTriangle className="h-4 w-4 text-amber-500" aria-hidden="true" />
            <span>Alertas sobre seus dados</span>
          </div>
          <ul className="list-disc list-inside space-y-0.5 opacity-90 pl-1">
            {(summary.warnings || []).map((w, idx) => (
              <li key={idx}>{w}</li>
            ))}
          </ul>
        </div>
      )}
      {summary && (summary.items || []).length > 0 && (
        <details className="text-sm text-slate-700 dark:text-slate-300">
          <summary className="cursor-pointer font-semibold">Fontes registradas por indicador</summary>
          <p className="mt-2 text-xs">A fonte e a observação referem-se ao registro de qualidade; a proveniência histórica e a última alteração do valor podem estar incompletas.</p>
          <ul className="mt-2 space-y-1">
            {summary.items.map(item => {
              const labels: Record<string, string> = { hrv_ms: 'Variabilidade cardíaca', rhr_bpm: 'Frequência cardíaca de repouso', steps: 'Passos', sleep_minutes: 'Sono', spo2_avg_pct: 'Oxigenação', respiratory_rate_rpm: 'Frequência respiratória', pai_score: 'PAI' }
              return <li key={item.metric_key}>{labels[item.metric_key] || item.metric_key}: {item.source || 'origem não informada'} · Observado em: {item.observed_at || 'não informado'}</li>
            })}
          </ul>
        </details>
      )}
    </div>
  )
}
