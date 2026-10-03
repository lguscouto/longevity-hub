import React, { useEffect, useMemo, useState } from 'react'
import {
  X,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Activity,
  Shield,
  Eye,
  KeyRound,
  Clock,
  ChevronDown,
} from 'lucide-react'
import { Modal, IconButton, Button } from './ui'

export interface SyncSourceDetail {
  records_inserted?: number
  records_skipped?: number
  status?: string
  summary?: string
  warnings?: string[]
  data_covered_until?: string
  last_sync?: string
}

export interface SyncResult {
  status: 'ok' | 'error' | 'warning' | 'partial' | 'expired' | 'disconnected' | 'stale'
  message?: string
  zepp_records_imported?: number
  google_health_records_imported?: number
  total_sources?: number
  zepp?: SyncSourceDetail | number
  google_health?: SyncSourceDetail | number
  warnings?: string[]
  unprocessable_records?: number
  data_covered_until?: string
  last_sync?: string
}

export interface SyncProgressModalProps {
  isOpen: boolean
  onClose: () => void
  isSyncing: boolean
  syncResult?: SyncResult | null
  onViewHistory?: () => void
  onReauthenticate?: () => void
  onRetrySync?: () => void
}

function getRecordCount(raw: unknown, explicitField?: number): number {
  if (typeof explicitField === 'number') return explicitField
  if (typeof raw === 'number') return raw
  if (raw && typeof raw === 'object' && 'records_inserted' in raw) {
    const recs = (raw as Record<string, unknown>).records_inserted
    if (typeof recs === 'number') return recs
  }
  return 0
}

function getSkippedCount(raw: unknown): number {
  if (raw && typeof raw === 'object' && 'records_skipped' in raw) {
    const skipped = (raw as Record<string, unknown>).records_skipped
    if (typeof skipped === 'number') return skipped
  }
  return 0
}

export const SyncProgressModal: React.FC<SyncProgressModalProps> = ({
  isOpen,
  onClose,
  isSyncing,
  syncResult,
  onViewHistory,
  onReauthenticate,
  onRetrySync,
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
  const googleCount = getRecordCount(
    syncResult?.google_health,
    syncResult?.google_health_records_imported
  )
  const zeppSkipped = getSkippedCount(syncResult?.zepp)
  const googleSkipped = getSkippedCount(syncResult?.google_health)
  const unprocessableTotal =
    (syncResult?.unprocessable_records ?? 0) + zeppSkipped + googleSkipped
  const importedTotal = zeppCount + googleCount

  const allWarnings = useMemo(() => {
    const list: string[] = []
    if (syncResult?.warnings && Array.isArray(syncResult.warnings)) {
      list.push(...syncResult.warnings)
    }
    if (
      syncResult?.zepp &&
      typeof syncResult.zepp === 'object' &&
      Array.isArray(syncResult.zepp.warnings)
    ) {
      list.push(...syncResult.zepp.warnings)
    }
    if (
      syncResult?.google_health &&
      typeof syncResult.google_health === 'object' &&
      Array.isArray(syncResult.google_health.warnings)
    ) {
      list.push(...syncResult.google_health.warnings)
    }
    return list
  }, [syncResult])

  const isExpired =
    !isSyncing &&
    (syncResult?.status === 'expired' ||
      syncResult?.message?.toLowerCase().includes('token expirado') ||
      syncResult?.message?.toLowerCase().includes('reautenticar'))

  const isDisconnected = !isSyncing && syncResult?.status === 'disconnected'
  const isStale = !isSyncing && syncResult?.status === 'stale'
  const hasError = !isSyncing && (syncResult?.status === 'error' || Boolean(isExpired))
  const isWarning = !isSyncing && syncResult?.status === 'warning'
  const isPartial =
    !isSyncing &&
    (syncResult?.status === 'partial' ||
      (syncResult?.status === 'ok' && (unprocessableTotal > 0 || allWarnings.length > 0)))
  const isSuccess =
    !isSyncing && syncResult?.status === 'ok' && !isPartial && !isExpired && !hasError

  const dataCoveredUntil =
    syncResult?.data_covered_until ||
    (typeof syncResult?.zepp === 'object' ? syncResult?.zepp?.data_covered_until : undefined)

  const heading = useMemo(() => {
    if (isSyncing) return 'Sincronizando Fontes de Longevidade...'
    if (isExpired) return 'Token de Acesso Expirado'
    if (isDisconnected) return 'Fonte de Wearable Desconectada'
    if (isStale) return 'Dados Desatualizados (>24h)'
    if (isPartial) return 'Sincronização Parcial'
    if (isSuccess) {
      return importedTotal > 0
        ? 'Sincronização Concluída!'
        : 'Sincronização Concluída, sem novos registros'
    }
    if (isWarning) return 'Sincronização em Andamento'
    if (hasError) return 'Sincronização com erro'
    return 'Concluir Sincronização'
  }, [hasError, importedTotal, isDisconnected, isExpired, isPartial, isStale, isSuccess, isSyncing, isWarning])

  const description = useMemo(() => {
    if (isSyncing) return `Reconciliando Zepp + Google Health Hub (${elapsedSeconds}s)`
    if (isExpired) {
      return (
        syncResult?.message ??
        'A autorização com a fonte expirou. Por favor, reautentique para continuar a sincronizar dados.'
      )
    }
    if (isDisconnected) {
      return (
        syncResult?.message ??
        'Nenhum dispositivo wearable ou conta de saúde está conectada. Vincule uma fonte nas configurações.'
      )
    }
    if (isStale) {
      return (
        syncResult?.message ??
        'A última sincronização ocorreu há mais de 24 horas. Dispare uma nova sincronização para métricas recentes.'
      )
    }
    if (isPartial) {
      return `${importedTotal} importados · ${unprocessableTotal || allWarnings.length} não processados. Verifique os avisos abaixo.`
    }
    if (isSuccess) {
      return importedTotal > 0
        ? `As métricas sincronizadas foram persistidas com sucesso.${
            dataCoveredUntil ? ` Dados cobertos até ${dataCoveredUntil}.` : ''
          }`
        : 'A sincronização foi concluída, mas não havia novos registros para importar.'
    }
    if (isWarning) {
      return (
        syncResult?.message ??
        'Sincronização com a nuvem Zepp já está em andamento. Aguarde a conclusão da sincronização atual.'
      )
    }
    if (hasError) {
      return syncResult?.message ?? 'A sincronização encontrou um erro e não foi concluída.'
    }
    return 'Aguardando atualização das fontes.'
  }, [
    allWarnings.length,
    dataCoveredUntil,
    elapsedSeconds,
    hasError,
    importedTotal,
    isDisconnected,
    isExpired,
    isPartial,
    isStale,
    isSuccess,
    isSyncing,
    isWarning,
    syncResult?.message,
    unprocessableTotal,
  ])

  if (!isOpen) return null

  const statusTone = isSuccess
    ? 'border-emerald-500/30 bg-white dark:bg-slate-900'
    : isPartial || isWarning || isStale
    ? 'border-amber-500/40 bg-white dark:bg-slate-900'
    : hasError || isExpired
    ? 'border-rose-500/40 bg-white dark:bg-slate-900'
    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      showCloseButton={false}
      ariaLabel={heading}
      size="md"
      className={statusTone}
      contentClassName="p-6 text-center"
    >
      {!isSyncing && (
        <div className="flex justify-end -mt-2 -mr-2 mb-1">
          <IconButton
            icon={X}
            onClick={onClose}
            aria-label="Fechar"
            variant="ghost"
            size="sm"
            className="text-slate-400 hover:text-slate-900 dark:hover:text-white"
          />
        </div>
      )}

      <div className="flex flex-col items-center justify-center mb-6">
        {isSyncing ? (
          <div className="relative w-20 h-20 mb-4 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin" />
            <RefreshCw className="w-8 h-8 text-emerald-600 dark:text-emerald-400 animate-pulse" />
          </div>
        ) : isSuccess ? (
          <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/40 flex items-center justify-center mb-4 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-10 h-10" />
          </div>
        ) : isPartial ? (
          <div className="w-20 h-20 rounded-full bg-amber-500/10 border border-amber-500/40 flex items-center justify-center mb-4 text-amber-600 dark:text-amber-400">
            <AlertTriangle className="w-10 h-10" />
          </div>
        ) : isExpired ? (
          <div className="w-20 h-20 rounded-full bg-rose-500/10 border border-rose-500/40 flex items-center justify-center mb-4 text-rose-600 dark:text-rose-400">
            <KeyRound className="w-10 h-10" />
          </div>
        ) : isStale ? (
          <div className="w-20 h-20 rounded-full bg-amber-500/10 border border-amber-500/40 flex items-center justify-center mb-4 text-amber-600 dark:text-amber-400">
            <Clock className="w-10 h-10" />
          </div>
        ) : isWarning ? (
          <div className="w-20 h-20 rounded-full bg-amber-500/10 border border-amber-500/40 flex items-center justify-center mb-4 text-amber-600 dark:text-amber-400">
            <AlertCircle className="w-10 h-10" />
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
        <p
          className={`text-xs mt-1 leading-relaxed ${
            hasError || isExpired
              ? 'text-rose-600 dark:text-rose-300'
              : isPartial || isWarning || isStale
              ? 'text-amber-600 dark:text-amber-400'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          {description}
        </p>
      </div>

      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 mb-6 overflow-hidden">
        <div
          className={`h-full transition-all duration-500 ${
            isSyncing
              ? 'w-3/4 bg-cyan-500 animate-pulse'
              : isSuccess
              ? 'w-full bg-emerald-500'
              : isPartial || isWarning || isStale
              ? 'w-full bg-amber-500'
              : 'w-full bg-rose-500'
          }`}
        />
      </div>

      <div className="space-y-2 mb-6 text-left">
        <div
          className={`flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border text-xs ${
            hasError
              ? 'border-rose-500/30'
              : isPartial || isWarning
              ? 'border-amber-500/30'
              : 'border-slate-200 dark:border-slate-800'
          }`}
        >
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-medium">
            <Activity className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>Zepp / Amazfit Wearable (HRV, Sono, RHR)</span>
          </div>
          <span
            className={
              isSyncing
                ? 'text-cyan-600 dark:text-cyan-400 font-semibold animate-pulse'
                : hasError
                ? 'text-rose-600 dark:text-rose-400 font-bold'
                : isWarning
                ? 'text-amber-600 dark:text-amber-400 font-bold'
                : 'text-emerald-600 dark:text-emerald-400 font-bold'
            }
          >
            {isSyncing ? 'Processando...' : isWarning ? 'Em andamento' : `${zeppCount} recs`}
          </span>
        </div>

        <div
          className={`flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border text-xs ${
            hasError
              ? 'border-rose-500/30'
              : isPartial || isWarning
              ? 'border-amber-500/30'
              : 'border-slate-200 dark:border-slate-800'
          }`}
        >
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-medium">
            <Shield className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
            <span>Google Health API (Passos, Sono, RHR, Peso)</span>
          </div>
          <span
            className={
              isSyncing
                ? 'text-cyan-600 dark:text-cyan-400 font-semibold animate-pulse'
                : hasError
                ? 'text-rose-600 dark:text-rose-400 font-bold'
                : isWarning
                ? 'text-amber-600 dark:text-amber-400 font-bold'
                : 'text-emerald-600 dark:text-emerald-400 font-bold'
            }
          >
            {isSyncing ? 'Processando...' : isWarning ? 'Em andamento' : `${googleCount} recs`}
          </span>
        </div>
      </div>

      {/* Detalhes expansíveis com progressive disclosure para avisos parciais */}
      {(allWarnings.length > 0 || unprocessableTotal > 0) && !isSyncing && (
        <details className="mb-6 text-left rounded-radius-md border border-amber-500/30 bg-amber-500/5 p-3 text-xs group">
          <summary className="font-semibold text-amber-800 dark:text-amber-300 cursor-pointer flex items-center justify-between select-none list-none">
            <span>
              Ver detalhes ({unprocessableTotal > 0 ? `${unprocessableTotal} não processados` : ''}
              {unprocessableTotal > 0 && allWarnings.length > 0 ? ' · ' : ''}
              {allWarnings.length > 0 ? `${allWarnings.length} avisos clínicos` : ''})
            </span>
            <ChevronDown className="h-4 w-4 text-amber-600 transition-transform group-open:rotate-180" />
          </summary>
          <div className="mt-3 pt-2 border-t border-amber-500/20 space-y-1.5 text-slate-700 dark:text-slate-300">
            {allWarnings.length > 0 ? (
              allWarnings.map((warn, index) => (
                <div key={index} className="flex items-start gap-1.5 font-mono text-xs leading-tight">
                  <span className="text-amber-600 dark:text-amber-400">•</span>
                  <span>{warn}</span>
                </div>
              ))
            ) : (
              <p className="text-slate-500 dark:text-slate-400">
                Registros não processados devido a timestamp fora da janela ou formato incompatível.
              </p>
            )}
          </div>
        </details>
      )}

      {!isSyncing && (
        <div className="flex flex-col gap-2">
          {isExpired && onReauthenticate && (
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={() => {
                onClose()
                onReauthenticate()
              }}
              leftIcon={KeyRound}
              className="w-full bg-rose-600 hover:bg-rose-500 text-white"
            >
              Reautenticar Fonte
            </Button>
          )}

          {hasError && onRetrySync && !isExpired && (
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={() => {
                onClose()
                onRetrySync()
              }}
              leftIcon={RefreshCw}
              className="w-full"
            >
              Tentar Novamente
            </Button>
          )}

          {onViewHistory && (
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={() => {
                onClose()
                onViewHistory()
              }}
              leftIcon={Eye}
              className="w-full text-slate-800 dark:text-slate-200"
            >
              Ver Histórico de Sincronizações
            </Button>
          )}

          <Button
            type="button"
            variant={isSuccess ? 'primary' : hasError ? 'destructive' : 'secondary'}
            size="md"
            onClick={onClose}
            className="w-full"
          >
            {isSuccess ? 'Fechar e Atualizar Dashboard' : 'Fechar'}
          </Button>
        </div>
      )}
    </Modal>
  )
}
