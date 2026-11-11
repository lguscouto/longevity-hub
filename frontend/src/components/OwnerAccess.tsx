import React, { useEffect, useState } from 'react'
import App from '../App'
import { requestJson } from '../lib/api'
import { Button, FormField, Input } from './ui'

function isTrainerRoute() {
  return /^#(?:personal|trainer|treinador|personal-trainer)(?:$|[?&#/])/i.test(window.location.hash)
}

export function OwnerAccess() {
  const [trainerRoute, setTrainerRoute] = useState(isTrainerRoute)
  const [authenticated, setAuthenticated] = useState(false)
  const [checking, setChecking] = useState(true)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const change = () => setTrainerRoute(isTrainerRoute())
    window.addEventListener('hashchange', change)
    return () => window.removeEventListener('hashchange', change)
  }, [])

  useEffect(() => {
    if (!authenticated) return
    let active = true
    const verify = () => {
      requestJson('/api/owner/session').catch(() => {
        if (active) setAuthenticated(false)
      })
    }
    const timer = window.setInterval(verify, 60_000)
    const visibility = () => { if (document.visibilityState === 'visible') verify() }
    document.addEventListener('visibilitychange', visibility)
    return () => { active = false; window.clearInterval(timer); document.removeEventListener('visibilitychange', visibility) }
  }, [authenticated])

  useEffect(() => {
    let active = true
    requestJson('/api/owner/session').then(() => {
      if (active) setAuthenticated(true)
    }).catch(() => {}).finally(() => {
      if (active) setChecking(false)
    })
    return () => { active = false }
  }, [])

  async function login(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await requestJson('/api/owner/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      setPassword('')
      setAuthenticated(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível entrar.')
    } finally { setBusy(false) }
  }

  async function logout() {
    try { await requestJson('/api/owner/logout', { method: 'POST' }) } finally {
      setAuthenticated(false)
      window.location.hash = ''
    }
  }

  const localHost = ['localhost', '127.0.0.1', '[::1]', '::1'].includes(window.location.hostname)
  const localAccess = localHost && window.location.protocol === 'http:'
  if (window.location.protocol !== 'https:' && !localHost) {
    return <main className="p-8"><h1 className="text-xl font-semibold">Conexão segura necessária</h1><p className="mt-2">Para acessar este endereço, abra a versão HTTPS do Longevidade Hub.</p></main>
  }
  if (checking) return <main className="p-8">Verificando acesso…</main>
  if (trainerRoute && !authenticated) return <App />
  if (authenticated) return <App onOwnerLogout={logout} />
  return <main className="flex min-h-screen items-center justify-center p-4">
    <div className="glass-panel w-full max-w-md rounded-radius-xl p-6 sm:p-8">
      <h1 className="text-xl font-semibold">Acesso ao Longevidade Hub</h1>
      <p className="mt-2 text-sm">Entre com seu usuário e sua senha para abrir o painel.</p>
      <form onSubmit={login} className="mt-6 space-y-4">
        <FormField id="owner-username" label="Usuário">
          <Input id="owner-username" required autoComplete="username" autoCapitalize="none" maxLength={64} value={username} onChange={e => setUsername(e.target.value)} />
        </FormField>
        <FormField id="owner-password" label="Senha" helperText={localAccess
          ? 'Para entrar com PIN, use os 4 dígitos cadastrados.'
          : 'Use a senha de acesso remoto. O PIN funciona apenas no computador servidor.'}>
          <Input id="owner-password" type="password" required autoComplete="current-password" aria-describedby="owner-password-helper" value={password} onChange={e => setPassword(e.target.value)} />
        </FormField>
        {error && <p role="alert" className="text-red-600">{error}</p>}
        <Button disabled={busy} variant="primary" type="submit">{busy ? 'Entrando…' : 'Entrar'}</Button>
      </form>
      <a href="#personal" className="mt-6 inline-block underline">Acessar o portal do personal</a>
    </div>
  </main>
}
