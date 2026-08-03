import React, { useEffect, useMemo, useState } from 'react'
import { X, RefreshCw, CheckCircle2, AlertCircle, Activity, Shield, Eye } from 'lucide-react'

interface SyncResult {
  status: 'ok' | 'error'
  message?: string
  zepp_records_imported?: number
  google_fit_records_imported?: number
  total_sources?: number
  zepp?: { records_inserted?: number; status?: string; summary?: string } | number
  google_fit?: { records_inserted?: number; status?: string; summary?: string } | number
}

interface SyncProgressModalProps {
  isOpen: boolean
  onClose: () => void
  isSyncing: boolean
  syncResult?: SyncResult | null
  onViewHistory?: () => void
}

function getRecordCount(raw: any, explicitField?: number): number {
  if (typeof explicitField === 'number') return explicitField
  if (typeof raw === 'number') return raw
  if (raw && typeof raw === 'object' && typeof raw.records_inserted === 'number') return raw.records_inserted
  return 0
}

export const SyncProgressModal: React.FC<SyncProgressModalProps> = ({
  isOpen,
  onClose,
  isSyncing,
  syncResult,
  onViewHistory,
}: SyncProgressModalProps) => {
  const [elapsedSeconds, setElapsedSeconds] = useState(0)

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined
    if (isOpen && isSyncing) {
      setElapsedSeconds(0)
      timer = setInterval(() => {
        setElapsedSeconds((previous) => previous + 1)
      }, 1000)
    }
    return () => {
      if (timer) clearInterval(timer)
    }
  }, [isOpen, isSyncing])

  const zeppCount = getRecordCount(syncResult?.zepp, syncResult?.zepp_records_imported)
  const googleCount = getRecordCount(syncResult?.google_fit, syncResult?.google_fit_records_imported)
  const importedTotal = zeppCount + googleCount
  const isSuccess = !isSyncing && syncResult?.status === 'ok'
  const hasError = !isSyncing && syncResult?.status === 'error'

  const heading = useMemo(() => {
    if (isSyncing) return 'Sincronizando Fontes de Longevidade...'
    if (isSuccess) {
      return importedTotal > 0 ? 'Sincronização Concluída!' : 'Sincronização Concluída, sem novos registros'
    }
    if (hasError) return 'Sincronização com erro'
    return 'Concluir Sincronização'
  }, [hasError, importedTotal, isSuccess, isSyncing])

  const description = useMemo(() => {
    if (isSyncing) return `Reconciliando Zepp + Google Fit Hub (${elapsedSeconds}s)`
    if (isSuccess) {
      return importedTotal > 0
        ? 'As métricas sincronizadas foram persistidas com sucesso.'
        : 'A sincronização foi concluída, mas não havia novos registros para importar.'
    }
    if (hasError) return syncResult?.message ?? 'A sincronização encontrou um erro e não foi concluída.'
    return 'Aguardando atualização das fontes.'
  }, [elapsedSeconds, hasError, importedTotal, isSuccess, isSyncing, syncResult?.message])

  if (!isOpen) return null

  const statusTone = isSuccess
    ? 'border-emerald-500/30 bg-white dark:bg-slate-900'
    : hasError
      ? 'border-rose-500/40 bg-white dark:bg-slate-900'
      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 dark:bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div className={`relative w-full max-w-md rounded-3xl glass-card border p-6 shadow-2xl text-center ${statusTone}`}>
        {!isSyncing && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 dark:hover:text-white p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        <div className="flex flex-col items-center justify-center mb-6">
          {isSyncing ? (
            <div className="relative w-20 h-20 mb-4 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin glow-emerald" />
              <RefreshCw className="w-8 h-8 text-emerald-600 dark:text-emerald-400 animate-pulse" />
            </div>
          ) : isSuccess ? (
            <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/40 flex items-center justify-center mb-4 text-emerald-600 dark:text-emerald-400 glow-emerald">
              <CheckCircle2 className="w-10 h-10" />
            </div>
          ) : hasError ? (
            <div className="w-20 h-20 rounded-full bg-rose-500/10 border border-rose-500/40 flex items-center justify-center mb-4 text-rose-600 dark:text-rose-400">
              <AlertCircle className="w-10 h-10" />
            </div>
          ) : (
            <div className="w-20 h-20 rounded-full bg-amber-500/10 border border-amber-500/40 flex items-center justify-center mb-4 text-amber-600 dark:text-amber-400">
              <AlertCircle className="w-10 h-10" />
            </div>
          )}

          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">{heading}</h2>
          <p className={`text-xs mt-1 ${hasError ? 'text-rose-600 dark:text-rose-300' : 'text-slate-600 dark:text-slate-400'}`}>{description}</p>
        </div>

        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 mb-6 overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              isSyncing
                ? 'w-3/4 bg-gradient-to-r from-emerald-500 to-cyan-500 animate-pulse'
                : isSuccess
                  ? 'w-full bg-emerald-500'
                  : hasError
                    ? 'w-full bg-rose-500'
                    : 'w-full bg-amber-500'
            }`}
          />
        </div>

        <div className="space-y-2 mb-6 text-left">
          <div className={`flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border text-xs ${hasError ? 'border-rose-500/30' : 'border-slate-200 dark:border-slate-800'}`}>
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-medium">
              <Activity className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Zepp / Amazfit Wearable (HRV, Sono, RHR)</span>
            </div>
            <span className={isSyncing ? 'text-cyan-600 dark:text-cyan-400 font-semibold animate-pulse' : hasError ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-emerald-600 dark:text-emerald-400 font-bold'}>
              {isSyncing ? 'Processando...' : `${zeppCount} recs`}
            </span>
          </div>

          <div className={`flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border text-xs ${hasError ? 'border-rose-500/30' : 'border-slate-200 dark:border-slate-800'}`}>
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-medium">
              <Shield className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              <span>Google Fit Hub (Passos & Pressão Arterial)</span>
            </div>
            <span className={isSyncing ? 'text-cyan-600 dark:text-cyan-400 font-semibold animate-pulse' : hasError ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-emerald-600 dark:text-emerald-400 font-bold'}>
              {isSyncing ? 'Processando...' : `${googleCount} recs`}
            </span>
          </div>
        </div>

        {!isSyncing && (
          <div className="flex flex-col gap-2">
            {onViewHistory && (
              <button
                onClick={() => {
                  onClose()
                  onViewHistory()
                }}
                className="w-full py-3 rounded-2xl text-slate-950 font-bold text-xs transition bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 shadow-md"
              >
                <Eye className="w-4 h-4 inline mr-1.5 -mt-0.5" />
                Ver Histórico de Sincronizações
              </button>
            )}
            <button
              onClick={onClose}
              className={`w-full py-3 rounded-2xl text-slate-950 font-bold text-xs transition-all shadow-md ${
                isSuccess
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 glow-emerald'
                  : hasError
                    ? 'bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-400 hover:to-amber-400'
                    : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400'
              }`}
            >
              {isSuccess ? 'Fechar e Atualizar Dashboard' : hasError ? 'Fechar' : 'Fechar'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
