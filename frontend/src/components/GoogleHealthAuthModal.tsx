import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  X,
  CheckCircle2,
  AlertCircle,
  Shield,
  ExternalLink,
  RefreshCw,
  LogOut,
  Key,
  HelpCircle,
  Sparkles,
} from 'lucide-react'
import { requestJson, ApiError } from '../lib/api'

interface GoogleHealthStatus {
  connected: boolean
  authenticated: boolean
  reauthentication_required: boolean
  last_sync: string | null
  authorized_scopes: string[]
  last_error: string | null
  has_client_id: boolean
  client_id?: string | null
  has_client_secret?: boolean
  masked_client_id: string | null
  token_path: string
  has_token_file: boolean
  token_expiry: string | null
  api_version: string
  service: string
  redirect_uri: string
}

interface GoogleHealthAuthModalProps {
  isOpen: boolean
  onClose: () => void
  onSyncSuccess?: () => void
}

export const GoogleHealthAuthModal: React.FC<GoogleHealthAuthModalProps> = ({
  isOpen,
  onClose,
  onSyncSuccess,
}) => {
  const [status, setStatus] = useState<GoogleHealthStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [showConfig, setShowConfig] = useState(false)

  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')

  const fetchStatus = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await requestJson<GoogleHealthStatus>('/api/google-health/status')
      setStatus(data)
      if (data.client_id) {
        setClientId(data.client_id)
      }
      if (!data.has_client_id && !data.connected) {
        setShowConfig(true)
      }
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Falha ao obter status do Google Health.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      void fetchStatus()
    }
  }, [isOpen])

  useEffect(() => {
    const handleAuthMessage = (event: MessageEvent) => {
      if (event.data?.type === 'GOOGLE_AUTH_SUCCESS') {
        setSuccessMsg('Conta Google conectada com sucesso!')
        void fetchStatus()
        if (onSyncSuccess) onSyncSuccess()
      } else if (event.data?.type === 'GOOGLE_AUTH_ERROR') {
        setError(`Erro de autorização: ${event.data.error || 'Acesso cancelado.'}`)
      }
    }

    window.addEventListener('message', handleAuthMessage)
    return () => window.removeEventListener('message', handleAuthMessage)
  }, [onSyncSuccess])

  if (!isOpen) return null

  const handleSaveCredentialsAndConnect = async () => {
    setError(null)
    setSuccessMsg(null)

    if (clientId.trim()) {
      try {
        await requestJson('/api/google-health/credentials', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client_id: clientId.trim(),
            client_secret: clientSecret.trim() ? clientSecret.trim() : undefined,
          }),
        })
      } catch (caught) {
        setError(caught instanceof ApiError ? caught.message : 'Falha ao salvar credenciais.')
        return
      }
    }

    try {
      const res = await requestJson<{ auth_url: string; status: string; message?: string }>('/api/google-health/auth-url')
      if (res.status === 'ok' && res.auth_url) {
        const width = 600
        const height = 750
        const left = window.screenX + (window.outerWidth - width) / 2
        const top = window.screenY + (window.outerHeight - height) / 2
        window.open(
          res.auth_url,
          'google_health_auth',
          `width=${width},height=${height},left=${left},top=${top},status=no,menubar=no,toolbar=no`
        )
      } else {
        setError(res.message || 'Informe o Google Client ID e Secret antes de conectar.')
      }
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Falha ao iniciar autenticação.')
    }
  }

  const handleTriggerSync = async () => {
    setSyncing(true)
    setError(null)
    setSuccessMsg(null)
    try {
      const res = await requestJson<{ status: string; summary: string; records_inserted: number }>('/api/google-health/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days: 30 }),
      })
      setSuccessMsg(res.summary || 'Sincronização concluída com sucesso!')
      void fetchStatus()
      if (onSyncSuccess) onSyncSuccess()
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Falha ao sincronizar com Google Health.')
    } finally {
      setSyncing(false)
    }
  }

  const handleDisconnect = async () => {
    if (!window.confirm('Deseja realmente desconectar sua conta Google Health?')) return
    try {
      await requestJson('/api/google-health/disconnect', { method: 'POST' })
      setSuccessMsg('Conta Google Health desconectada.')
      void fetchStatus()
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Falha ao desconectar.')
    }
  }

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 dark:bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl text-left">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 dark:hover:text-white p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          aria-label="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Conexão Google Health API v4</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Pixel Watch, Fitbit e Android Health Connect</p>
          </div>
        </div>

        {/* Feedback Alerts */}
        {error && (
          <div className="mb-4 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3.5 text-xs text-rose-700 dark:text-rose-300 space-y-2">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
            {(error.includes('fitbit.google.com') || error.includes('ACCOUNT_NOT_LINKED') || error.includes('não vinculada')) && (
              <div className="pt-1 pl-6">
                <a
                  href="https://fitbit.google.com/auth/signup"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] shadow-sm transition"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Ativar Perfil Google Health / Fitbit (1 clique)
                </a>
              </div>
            )}
          </div>
        )}

        {successMsg && (
          <div className="mb-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-xs text-emerald-700 dark:text-emerald-300 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Status Card */}
        {status && (
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 mb-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Estado da Conexão:</span>
              {status.connected ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Conectado & Ativo
                </span>
              ) : status.reauthentication_required ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  <AlertCircle className="w-3.5 h-3.5" /> Reautenticação Necessária
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700">
                  Desconectado
                </span>
              )}
            </div>

            {status.last_sync && (
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                Última sincronização: <span className="font-medium text-slate-700 dark:text-slate-300">{new Date(status.last_sync).toLocaleString('pt-BR')}</span>
              </div>
            )}

            {status.masked_client_id && (
              <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
                <span>Client ID: <code className="text-slate-700 dark:text-slate-300 font-mono">{status.masked_client_id}</code></span>
                <button
                  type="button"
                  onClick={() => setShowConfig(!showConfig)}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold"
                >
                  {showConfig ? 'Ocultar chaves' : 'Alterar chaves'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Credentials Form (when not configured or explicitly opened) */}
        {(showConfig || !status?.has_client_id) && (
          <div className="p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40 mb-5 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-blue-900 dark:text-blue-300">
              <Key className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Configuração Google Cloud Console</span>
            </div>

            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
              Adicione a URI autorizada no seu Google Cloud Console:
              <br />
              <code className="text-[10px] bg-slate-200 dark:bg-slate-800 p-1 rounded font-mono select-all block mt-1">
                {status?.redirect_uri || 'http://127.0.0.1:8887/api/google-health/callback'}
              </code>
            </p>

            <div className="space-y-2 pt-1">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Google Client ID (.apps.googleusercontent.com)
                </label>
                <input
                  type="text"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  placeholder="Ex: 721724668570-...apps.googleusercontent.com"
                  className="w-full text-xs p-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Google Client Secret
                </label>
                <input
                  type="password"
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                  placeholder={status?.has_client_secret ? '•••••••••••••••• (Já salvo no servidor — deixe em branco para manter)' : 'Ex: GOCSPX-...'}
                  className="w-full text-xs p-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-2 pt-2">
          {!status?.connected ? (
            <button
              type="button"
              onClick={handleSaveCredentialsAndConnect}
              disabled={loading}
              className="w-full py-3 rounded-2xl text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white transition shadow-lg flex items-center justify-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Conectar com Google no Navegador</span>
            </button>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleTriggerSync}
                disabled={syncing}
                className="py-3 rounded-2xl text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 transition glow-emerald shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                <span>{syncing ? 'Sincronizando...' : 'Sincronizar Agora'}</span>
              </button>

              <button
                type="button"
                onClick={handleDisconnect}
                className="py-3 rounded-2xl text-xs font-semibold bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60 transition flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Desconectar</span>
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
