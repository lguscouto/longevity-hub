import React, { useEffect, useState } from 'react'
import { ShieldCheck, AlertTriangle, Layers, RefreshCw } from 'lucide-react'
import { requestJson } from '../lib/api'

interface MetricItem {
  date_ref: string
  metric_key: string
  source: string
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
  const todayStr = new Date().toISOString().slice(0, 10)
  const [selectedDate, setSelectedDate] = useState(todayStr)
  const [summary, setSummary] = useState<QualitySummary | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchQuality = async () => {
    setLoading(true)
    try {
      const data = await requestJson<QualitySummary>(`/api/quality/daily?date_ref=${selectedDate}`)
      setSummary(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchQuality()
  }, [selectedDate])

  return (
    <div className="glass-card p-6 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4">
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Auditoria de Qualidade & Cobertura dos Dados</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Proveniência dos sensores Zepp e integridade biométrica</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-900 dark:text-white font-medium"
          />
          <button
            onClick={() => void fetchQuality()}
            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
            title="Atualizar auditoria"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
            <span className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 block mb-1">Status de Confiança</span>
            <span className="text-lg font-black text-slate-900 dark:text-white capitalize">{summary?.confidence || 'unavailable'}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400 block mt-1">
              {summary?.metrics_available ?? 0} de {summary?.metrics_expected ?? 7} métricas validadas
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
            <span className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 block mb-1">Cobertura Birométrica</span>
            <span className="text-lg font-black text-slate-900 dark:text-white">{summary?.coverage_pct ?? 0}%</span>
            <span className="text-xs text-slate-500 dark:text-slate-400 block mt-1">Densidade de amostras por 24h</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
            <span className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 block mb-1">Fontes Ativas</span>
            <div className="flex items-center gap-1.5 mt-1">
              <Layers className="h-4 w-4 text-indigo-500" />
              <span className="text-sm font-bold text-slate-900 dark:text-white">{(summary?.sources || []).join(', ') || 'Nenhuma'}</span>
            </div>
          </div>
        </div>
      )}

      {summary && (summary.warnings || []).length > 0 && (
        <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs space-y-1">
          <div className="flex items-center gap-1.5 font-bold">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <span>Alertas de Cobertura e Qualidade</span>
          </div>
          <ul className="list-disc list-inside space-y-0.5 opacity-90 pl-1">
            {(summary.warnings || []).map((w, idx) => (
              <li key={idx}>{w}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
