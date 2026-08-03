import React, { useRef, useState } from 'react'
import { Activity, Zap, FileSpreadsheet, Download } from 'lucide-react'

import { ApiError, requestJson } from '../lib/api'

interface CGMSummary {
  date_ref: string
  mean_glucose: number
  glucose_sd?: number
  cv_pct?: number
  time_in_range_pct?: number
  time_above_range_pct?: number
  time_below_range_pct?: number
  total_readings: number
}

interface CGMDashboardProps {
  summaries: CGMSummary[]
  onRefreshData?: () => void
}

export const CGMDashboard: React.FC<CGMDashboardProps> = ({ summaries, onRefreshData }) => {
  const latest = summaries[0]
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [messageTone, setMessageTone] = useState<'success' | 'error' | 'warning' | null>(null)

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    setMessage(null)
    setMessageTone(null)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const body = await requestJson<{ status?: string; message?: string; detail?: string }>('/api/cgm/upload-csv', {
        method: 'POST',
        body: formData,
      })

      if (body.status === 'ok') {
        setMessage(body.message ?? 'CSV importado com sucesso')
        setMessageTone('success')
        onRefreshData?.()
      } else {
        setMessage(body.detail ?? body.message ?? 'Erro ao importar CSV')
        setMessageTone('warning')
      }
    } catch (caught) {
      const detail = caught instanceof ApiError ? caught.message : 'Falha na requisição de upload do CSV'
      setMessage(detail)
      setMessageTone('error')
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleExportCSV = () => {
    window.open('/api/cgm/export-csv', '_blank')
  }

  const metricTone = latest ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500 dark:text-slate-300'

  return (
    <div className="glass-panel rounded-3xl p-6 border border-slate-200 dark:border-slate-800 space-y-6 shadow-sm">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-500 dark:text-amber-400" /> Glicemia Contínua (CGM - Continuous Glucose Monitor)
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400">Variabilidade glicêmica, Média de 24h e Tempo no Alvo de Longevidade (70-140 mg/dL)</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="file"
            accept=".csv"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition glow-amber shadow-md"
          >
            <FileSpreadsheet className="h-4 w-4" />
            {isUploading ? 'Importando...' : 'Importar CSV Libre / Dexcom'}
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition shadow-sm"
          >
            <Download className="h-4 w-4 text-cyan-600 dark:text-cyan-400" /> Exportar CSV
          </button>
        </div>
      </div>

      {message && (
        <div
          role="alert"
          className={`p-3 rounded-xl border text-xs font-medium ${
            messageTone === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
              : messageTone === 'warning'
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-400'
          }`}
        >
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-card p-4 rounded-2xl border border-amber-500/20 bg-slate-50 dark:bg-slate-900/60 shadow-sm">
          <span className="text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400">Glicemia Média 24h</span>
          <div className={`text-2xl font-extrabold mt-1 ${metricTone}`}>
            {latest ? `${latest.mean_glucose} mg/dL` : '—'}
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">{latest ? 'Alvo Blueprint: < 90 mg/dL' : 'Sem dados para a data'}</span>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-amber-500/20 bg-slate-50 dark:bg-slate-900/60 shadow-sm">
          <span className="text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400">Time-In-Range (70-140)</span>
          <div className={`text-2xl font-extrabold mt-1 ${latest ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-300'}`}>
            {latest ? `${latest.time_in_range_pct}%` : '—'}
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">{latest ? 'Alvo Longevidade: > 95%' : 'Sem dados para a data'}</span>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-amber-500/20 bg-slate-50 dark:bg-slate-900/60 shadow-sm">
          <span className="text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400">Variabilidade (CV %)</span>
          <div className={`text-2xl font-extrabold mt-1 ${latest ? 'text-cyan-600 dark:text-cyan-400' : 'text-slate-500 dark:text-slate-300'}`}>
            {latest ? `${latest.cv_pct}%` : '—'}
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">{latest ? 'Alvo Estabilidade: < 15%' : 'Sem dados para a data'}</span>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-amber-500/20 bg-slate-50 dark:bg-slate-900/60 shadow-sm">
          <span className="text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400">Total de Leituras</span>
          <div className={`text-2xl font-extrabold mt-1 ${latest ? 'text-slate-900 dark:text-slate-200' : 'text-slate-500 dark:text-slate-300'}`}>
            {latest ? `${latest.total_readings}` : '—'}
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">{latest ? 'Sensor Ativo 24/7' : 'Sem dados para a data'}</span>
        </div>
      </div>
    </div>
  )
}
