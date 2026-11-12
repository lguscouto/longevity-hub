import React, { useEffect, useState } from 'react'
import { requestJson } from '../lib/api'
import { Button, ConfirmDialog, Input, Select, Textarea } from './ui'

type Event = { id: string; title: string; time_ref?: string | null; description?: string | null; metadata: { checkin_event?: boolean; severity?: number; intervention_id?: number | null } }
type Intervention = { id: number; name: string }

export const CheckinEvents: React.FC<{ selectedDate: string; onUpdated?: () => void }> = ({ selectedDate, onUpdated }) => {
  const [open, setOpen] = useState(false)
  const [events, setEvents] = useState<Event[]>([])
  const [interventions, setInterventions] = useState<Intervention[]>([])
  const [title, setTitle] = useState('')
  const [time, setTime] = useState('')
  const [severity, setSeverity] = useState('1')
  const [intervention, setIntervention] = useState('')
  const [notes, setNotes] = useState('')
  const [editing, setEditing] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const clear = () => { setTitle(''); setTime(''); setSeverity('1'); setIntervention(''); setNotes(''); setEditing(null) }
  const load = async () => {
    const params = new URLSearchParams({ start_date: selectedDate, end_date: selectedDate, event_type: 'symptom', source: 'manual', limit: '500' })
    const [timeline, available] = await Promise.all([
      requestJson<{ items: Event[] }>(`/api/timeline?${params}`),
      requestJson<Intervention[]>('/api/interventions'),
    ])
    setEvents((timeline.items || []).filter(item => item.metadata?.checkin_event))
    setInterventions(Array.isArray(available) ? available : [])
  }
  useEffect(() => { if (!open) return; clear(); setError(''); load().catch(() => setError('Não foi possível carregar os eventos.')) }, [open, selectedDate])
  const save = async () => {
    if (!title.trim()) { setError('Informe o sintoma ou evento.'); return }
    setBusy(true); setError('')
    const metadata = { checkin_event: true, severity: Number(severity), intervention_id: intervention ? Number(intervention) : null }
    const body = { date_ref: selectedDate, time_ref: time || undefined, event_type: 'symptom', category: 'symptom', title: title.trim(), description: notes.trim(), metadata }
    try {
      await requestJson(editing ? `/api/timeline/events/${encodeURIComponent(editing)}` : '/api/timeline/events', { method: editing ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      clear(); await load(); onUpdated?.()
    } catch { setError('Não foi possível salvar o evento. Confira os dados e tente novamente.') } finally { setBusy(false) }
  }
  const remove = async () => {
    if (!deleting) return
    setBusy(true); setError('')
    try { await requestJson(`/api/timeline/events/${encodeURIComponent(deleting)}`, { method: 'DELETE' }); setDeleting(null); await load(); onUpdated?.() }
    catch { setError('Não foi possível excluir o evento.') } finally { setBusy(false) }
  }
  return <section className="space-y-3 border-t border-slate-200 dark:border-slate-800 pt-3">
    <Button type="button" variant="secondary" size="sm" aria-expanded={open} onClick={() => setOpen(value => !value)}>{open ? 'Ocultar eventos do check-in' : 'Registrar sintomas e eventos'}</Button>
    {open && <div className="space-y-3">
      <p className="text-xs">A associação ajuda a organizar o histórico; não comprova causa.</p>
      {events.map(item => <div key={item.id} className="text-sm"><span>{item.time_ref || 'Horário não informado'} — {item.title} (intensidade {item.metadata.severity}/5)</span>{' '}<Button type="button" size="sm" variant="ghost" onClick={() => { setEditing(item.id); setTitle(item.title); setTime(item.time_ref || ''); setNotes(item.description || ''); setSeverity(String(item.metadata.severity || 1)); setIntervention(item.metadata.intervention_id ? String(item.metadata.intervention_id) : '') }}>Editar</Button><Button type="button" size="sm" variant="ghost" onClick={() => setDeleting(item.id)}>Excluir</Button></div>)}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <label>Sintoma ou evento<Input aria-label="Sintoma ou evento" value={title} onChange={e => setTitle(e.target.value)} /></label>
        <label>Horário (opcional)<Input aria-label="Horário do evento" type="time" value={time} onChange={e => setTime(e.target.value)} /></label>
        <label>Intensidade<Select aria-label="Intensidade do evento" value={severity} onChange={e => setSeverity(e.target.value)}>{[1, 2, 3, 4, 5].map(value => <option key={value}>{value}</option>)}</Select></label>
        <label>Intervenção associada (opcional)<Select aria-label="Intervenção associada" value={intervention} onChange={e => setIntervention(e.target.value)}><option value="">Nenhuma</option>{interventions.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}</Select></label>
      </div>
      <label>Observações<Textarea aria-label="Observações do evento" value={notes} onChange={e => setNotes(e.target.value)} /></label>
      {error && <p role="alert">{error}</p>}
      <div className="flex gap-2"><Button type="button" onClick={save} disabled={busy}>{editing ? 'Salvar alterações' : 'Salvar evento'}</Button>{editing && <Button type="button" variant="secondary" onClick={clear}>Cancelar edição</Button>}</div>
    </div>}
    <ConfirmDialog isOpen={Boolean(deleting)} onClose={() => setDeleting(null)} onConfirm={remove} title="Excluir evento?" description="O registro manual será removido." confirmLabel="Excluir evento" isDestructive loading={busy} />
  </section>
}
