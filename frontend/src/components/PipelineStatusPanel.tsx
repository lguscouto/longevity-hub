import React from 'react'
import { Activity, AlertCircle, CheckCircle2, Clock, Database, XCircle } from 'lucide-react'

export interface PipelineRun {
  id?: number
  source: string
  run_at: string
  records_inserted: number
  status: string
  log_summary: string
}

export interface PipelineStatusPanelProps {
  runs: PipelineRun[]
  loading: boolean
  onRefresh: () => void
}

function formatRunAt(isoString: string): string {
  try {
    const d = new Date(isoString)
    if (Number.isNaN(d.getTime())) return isoString
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return isoString
  }
}

const SOURCE_CONFIG: Record<string, { label: string; icon: React.FC<{ className?: string }>; color: string }> = {
  Zepp: { label: 'Zepp / Amazfit Wearable', icon: Activity, color: 'text-emerald-600 dark:text-emerald-400' },
  GoogleFit: { label: 'Google Fit Hub', icon: Database, color: 'text-cyan-600 dark:text-cyan-400' },
}

function getSourceConfig(source: string): { label: string; icon: React.FC<{ className?: string }>; color: string } {
  return SOURCE_CONFIG[source] ?? { label: source, icon: Database, color: 'text-slate-500 dark:text-slate-400' }
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'sucesso' || status === 'ok') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
        <CheckCircle2 className="w-3 h-3" /> Sucesso
      </span>
    )
  }
  if (status === 'erro' || status === 'error') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 dark:text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
        <XCircle className="w-3 h-3" /> Falha
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
      <Clock className="w-3 h-3" /> {status}
    </span>
  )
}

function getRunMessage(run: PipelineRun): string {
  if (run.status === 'erro' || run.status === 'error') {
    return run.log_summary || 'Falha de importação'
  }
  if (run.records_inserted === 0) {
    return '0 registros válidos'
  }
  return run.log_summary || `${run.records_inserted} registro(s) importado(s)`
}

export const PipelineStatusPanel: React.FC<PipelineStatusPanelProps> = ({ runs, loading, onRefresh }) => {
  return (
    <div className="glass-panel rounded-3xl p-6 border border-slate-200 dark:border-slate-800 space-y-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Activity className="h-5 w-5 text-emerald-600 dark:text-emerald-400" /> Histórico de Sincronizações
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Últimas execuções do pipeline de importação</p>
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition disabled:opacity-50"
          aria-label="Atualizar histórico"
        >
          {loading ? 'Carregando...' : 'Atualizar'}
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12 text-slate-500 dark:text-slate-400 text-sm">
          <div className="animate-spin h-5 w-5 border-2 border-emerald-500 border-t-transparent rounded-full mr-3" />
          Carregando histórico...
        </div>
      )}

      {!loading && runs.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-slate-500">
          <Database className="h-12 w-12 mb-3 opacity-30" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Nenhuma fonte encontrada</p>
          <p className="text-xs mt-1 text-slate-500 dark:text-slate-400">Nenhuma execução de sincronização registrada ainda.</p>
          <p className="text-xs mt-4 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-400">
            Clique em <strong className="text-emerald-600 dark:text-emerald-400">Sync Zepp</strong> no cabeçalho para iniciar a primeira importação.
          </p>
        </div>
      )}

      {!loading && runs.length > 0 && (
        <div className="space-y-2">
          {runs.map((run) => {
            const sourceCfg = getSourceConfig(run.source)
            const Icon = sourceCfg.icon
            const runMessage = getRunMessage(run)
            const isError = run.status === 'erro' || run.status === 'error'
            const isZero = run.records_inserted === 0 && !isError

            return (
              <div
                key={run.id ?? `${run.source}-${run.run_at}`}
                className={`flex items-center justify-between p-3.5 rounded-2xl border text-xs transition ${
                  isError
                    ? 'bg-rose-500/10 dark:bg-rose-950/20 border-rose-500/20'
                    : isZero
                      ? 'bg-amber-500/10 dark:bg-amber-950/20 border-amber-500/20'
                      : 'bg-slate-50 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon className={`w-4 h-4 shrink-0 ${sourceCfg.color}`} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-900 dark:text-slate-200 text-xs">{sourceCfg.label}</span>
                      <StatusBadge status={run.status} />
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 truncate max-w-[280px]">
                      {runMessage}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 ml-3">
                  {!isError && (
                    <span className="text-[11px] font-mono text-slate-600 dark:text-slate-400">
                      {run.records_inserted} recs
                    </span>
                  )}
                  <span className="text-[10px] text-slate-500 whitespace-nowrap">
                    {formatRunAt(run.run_at)}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
