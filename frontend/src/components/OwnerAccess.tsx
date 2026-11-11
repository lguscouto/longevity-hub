import React, { useEffect, useState } from 'react'
import App from '../App'
import { requestJson } from '../lib/api'

function isTrainerRoute() {
  return /^#(?:personal|trainer|treinador|personal-trainer)(?:$|[?&#/])/i.test(window.location.hash)
}

export function OwnerAccess() {
  const [trainerRoute, setTrainerRoute] = useState(isTrainerRoute)
  const [authenticated, setAuthenticated] = useState(false)
  const [checking, setChecking] = useState(true)
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
        body: JSON.stringify({ password }),
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
  if (window.location.protocol !== 'https:' && !localHost) {
    return <main className="p-8"><h1 className="text-xl font-semibold">Conexão segura necessária</h1><p className="mt-2">Para acessar este endereço, abra a versão HTTPS do Longevidade Hub.</p></main>
  }
  if (checking) return <main className="p-8">Verificando acesso…</main>
  if (trainerRoute && !authenticated) return <App />
  if (authenticated) return <><div className="flex justify-end px-4 pt-2"><button type="button" onClick={logout} className="rounded px-3 py-2 text-sm underline focus-visible:outline focus-visible:outline-2">Sair da conta do proprietário</button></div><App /></>
  return <main className="flex min-h-screen items-center justify-center p-4">
    <div className="glass-panel w-full max-w-md rounded-3xl p-6 sm:p-8">
      <h1 className="text-xl font-semibold">Acesso ao Longevidade Hub</h1>
      <p className="mt-2 text-sm">Entre com a senha do proprietário.</p>
      <form onSubmit={login} className="mt-6 space-y-4">
        <label htmlFor="owner-password" className="block text-sm">Senha</label>
        <input id="owner-password" type="password" required autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} className="w-full rounded border p-3 text-slate-900" />
        {error && <p role="alert" className="text-red-600">{error}</p>}
        <button disabled={busy} className="rounded bg-blue-700 px-5 py-3 text-white disabled:opacity-50" type="submit">Entrar</button>
      </form>
      <a href="#personal" className="mt-6 inline-block underline">Acessar o portal do personal</a>
    </div>
  </main>
}
