import React, { useState, useEffect } from 'react'
import { Modal, ConfirmDialog, FormField, Input, Button } from './ui'
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
  Copy,
  Check,
} from 'lucide-react'
import { requestJson, ApiError } from '../lib/api'

interface GoogleHealthStatus {
  connected: boolean
  authenticated: boolean
  token_valid?: boolean
  reauthentication_required: boolean
  last_sync: string | null
  authorized_scopes: string[]
  scopes?: {
    activity: boolean
    health_metrics: boolean
    sleep: boolean
    nutrition: boolean
  }
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
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)

  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [copiedUri, setCopiedUri] = useState(false)

  const handleCopyUri = () => {
    const uri = status?.redirect_uri || 'http://127.0.0.1:8887/api/google-health/callback'
    void navigator.clipboard.writeText(uri)
    setCopiedUri(true)
    setTimeout(() => setCopiedUri(false), 2000)
  }

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
      setError(caught instanceof ApiError ? caught.message : 'Não foi possível verificar o status da conexão com o Google Health.')
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
        setSuccessMsg('Conta Google conectada com sucesso.')
        void fetchStatus()
        if (onSyncSuccess) onSyncSuccess()
      } else if (event.data?.type === 'GOOGLE_AUTH_ERROR') {
        setError(`Não foi possível concluir a autorização. ${event.data.error || 'O acesso foi cancelado.'}`)
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
        setError(caught instanceof ApiError ? caught.message : 'Não foi possível salvar as credenciais.')
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
        setError(res.message || 'Informe o Client ID e o Client Secret antes de conectar.')
      }
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Não foi possível iniciar a conexão com o Google Health.')
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
      setError(caught instanceof ApiError ? caught.message : 'Não foi possível sincronizar os dados com o Google Health.')
    } finally {
      setSyncing(false)
    }
  }

  const handleDisconnect = () => {
    setShowDisconnectConfirm(true)
  }

  const handleDisconnectConfirm = async () => {
    setDisconnecting(true)
    try {
      await requestJson('/api/google-health/disconnect', { method: 'POST' })
      setSuccessMsg('Conta Google Health desconectada com sucesso.')
      setShowDisconnectConfirm(false)
      void fetchStatus()
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Não foi possível desconectar o Google Health.')
    } finally {
      setDisconnecting(false)
    }
  }

  return (
    <>
      <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Conectar ao Google Health"
      description="Sincronize dados de saúde de dispositivos compatíveis"
      icon={
        <div className="h-10 w-10 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center justify-center shadow-xs">
          <Shield className="h-5 w-5" />
        </div>
      }
      size="lg"
      closeButtonAriaLabel="Fechar"
      contentClassName="text-left"
    >

        {/* Feedback Alerts */}
        {error && (
          <div className="mb-4 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3.5 text-xs text-rose-700 dark:text-rose-300 space-y-2">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
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
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Status da conexão:</span>
              {status.connected ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Conectado e ativo
                </span>
              ) : status.reauthentication_required ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  <AlertCircle className="w-3.5 h-3.5" /> Reconexão necessária
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700">
                  Desconectado
                </span>
              )}
            </div>

            {status.last_sync && (
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Última sincronização: <span className="font-medium text-slate-700 dark:text-slate-300">{new Date(status.last_sync).toLocaleString('pt-BR')}</span>
              </div>
            )}

            {status.masked_client_id && (
              <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
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

            {status.scopes && (status.connected || status.authenticated) && (
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
                <div className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  Módulos Autorizados (Consentimento):
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border ${
                      status.scopes.activity
                        ? 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    Atividade Física: {status.scopes.activity ? 'Autorizado' : 'Não concedido'}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border ${
                      status.scopes.health_metrics
                        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    Métricas Vitais: {status.scopes.health_metrics ? 'Autorizado' : 'Não concedido'}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border ${
                      status.scopes.sleep
                        ? 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    Sono: {status.scopes.sleep ? 'Autorizado' : 'Não concedido'}
                  </span>
                </div>
                {status.connected && (!status.scopes.activity || !status.scopes.health_metrics || !status.scopes.sleep) && (
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    Consentimento parcial: métricas de módulos não concedidos serão ignoradas.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Credentials Form (when not configured or explicitly opened) */}
        {(showConfig || !status?.has_client_id) && (
          <div className="p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40 mb-5 space-y-3.5">
            <div className="flex items-center gap-2 text-xs font-bold text-blue-900 dark:text-blue-300">
              <Key className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Configuração Google Cloud Console</span>
            </div>

            {/* Link amigável com a URL para acessar e obter Client ID e Client Secret */}
            <div className="rounded-xl bg-blue-100/70 dark:bg-blue-900/30 border border-blue-200/80 dark:border-blue-800/60 p-3 space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs font-semibold text-blue-950 dark:text-blue-200">
                  Onde obter o Client ID e Client Secret?
                </span>
                <a
                  href="https://console.cloud.google.com/apis/credentials"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-sm transition"
                >
                  <span>Acessar Google Cloud Console</span>
                  <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                </a>
              </div>

              <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed space-y-1">
                <p>
                  URL das Credenciais:{' '}
                  <a
                    href="https://console.cloud.google.com/apis/credentials"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-xs text-blue-700 dark:text-blue-300 hover:underline inline-flex items-center gap-0.5 font-medium break-all"
                  >
                    https://console.cloud.google.com/apis/credentials
                    <ExternalLink className="w-2.5 h-2.5 shrink-0 ml-0.5" />
                  </a>
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  No Google Cloud Console, clique em <strong>+ Criar credenciais</strong> &rarr; <strong>ID do cliente OAuth</strong> (tipo: <em>Aplicativo da Web</em>).
                </p>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                <span>Adicione a URI de redirecionamento autorizada:</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyUri}
                  leftIcon={copiedUri ? Check : Copy}
                  className="text-blue-600 dark:text-blue-400 font-semibold text-xs py-1 px-2"
                >
                  {copiedUri ? 'Copiado!' : 'Copiar URI'}
                </Button>
              </div>
              <code className="text-xs bg-slate-200/80 dark:bg-slate-800/80 p-2 rounded-lg font-mono select-all block break-all text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700">
                {status?.redirect_uri || 'http://127.0.0.1:8887/api/google-health/callback'}
              </code>
            </div>

            <div className="space-y-3 pt-1">
              <FormField id="google-client-id" label="Google Client ID (.apps.googleusercontent.com)">
                <Input
                  id="google-client-id"
                  type="text"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  placeholder="Ex: 721724668570-...apps.googleusercontent.com"
                />
              </FormField>

              <FormField id="google-client-secret" label="Google Client Secret">
                <Input
                  id="google-client-secret"
                  type="password"
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                  placeholder={status?.has_client_secret ? '•••••••••••••••• (Já salvo no servidor — deixe em branco para manter)' : 'Ex: GOCSPX-...'}
                />
              </FormField>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-2 pt-2">
          {!status?.connected ? (
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={handleSaveCredentialsAndConnect}
              disabled={loading}
              loading={loading}
              leftIcon={ExternalLink}
              className="w-full bg-blue-600 hover:bg-blue-500"
            >
              Conectar com Google no Navegador
            </Button>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={handleTriggerSync}
                disabled={syncing}
                loading={syncing}
                leftIcon={RefreshCw}
                className="bg-emerald-600 hover:bg-emerald-500 text-white"
              >
                Sincronizar Agora
              </Button>

              <Button
                type="button"
                variant="destructive"
                size="md"
                onClick={handleDisconnect}
                leftIcon={LogOut}
              >
                Desconectar
              </Button>
            </div>
          )}

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="w-full"
          >
            Fechar
          </Button>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={showDisconnectConfirm}
        onClose={() => setShowDisconnectConfirm(false)}
        onConfirm={handleDisconnectConfirm}
        title="Desconectar Google Health?"
        description="Deseja desconectar sua conta Google Health? A sincronização automática será interrompida até você conectar novamente."
        confirmLabel="Desconectar"
        cancelLabel="Cancelar"
        isDestructive={true}
        loading={disconnecting}
      />
    </>
  )
}
