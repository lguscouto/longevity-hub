import React, { useEffect, useMemo, useState } from 'react'
import { requestJson } from '../../lib/api'
import { formatLocalDateKey } from '../../lib/formatters'
import type { LabResult } from '../labs/labMarkers'
import { Button, Input, Select } from '../ui'

type ClinicalHistoryResponse = {
  labs: Array<LabResult & { id: number }>
  interventions: Array<{ id: number; name: string; start_date: string; end_date: string | null; dosage: string | null }>
  symptoms: Array<{ date_ref: string; symptom_severity: number; notes: string | null }>
  symptom_events?: Array<{ id: string; date_ref: string; time_ref: string | null; title: string; description: string | null; source: string; severity?: number; intervention_id?: number; intervention_name?: string }>
  changes: Array<{ id: number; created_at: string; compound_name: string; action_type: string; old_value: string | null; new_value: string | null }>
}

export const ClinicalHistory: React.FC = () => {
  const [labs, setLabs] = useState<LabResult[]>([])
  const [metric, setMetric] = useState('')
  const [start, setStart] = useState(() => { const date = new Date(); date.setFullYear(date.getFullYear() - 1); return formatLocalDateKey(date) })
  const [end, setEnd] = useState(() => formatLocalDateKey())
  const [history, setHistory] = useState<ClinicalHistoryResponse | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let active = true
    requestJson<LabResult[]>('/api/labs').then(value => { if (active) setLabs(Array.isArray(value) ? value : []) })
      .catch(() => { if (active) setError('Não foi possível carregar os marcadores.') })
    return () => { active = false }
  }, [])
  const markers = useMemo(() => Array.from(new Map(labs.map(lab => [lab.metric_key, lab.metric_name])).entries()), [labs])
  const entries = useMemo(() => {
    if (!history) return []
    return [
      ...history.labs.map(item => ({ key: `lab-${item.id}`, date: item.collected_at.slice(0, 10), text: `${item.metric_name}: ${item.value} ${item.unit} — origem: ${item.record_origin || 'não informada'}` })),
      ...history.interventions.map(item => ({ key: `intervention-${item.id}`, date: item.start_date, text: `Intervenção: ${item.name}${item.dosage ? ` (${item.dosage})` : ''}; início ${item.start_date}, fim ${item.end_date || 'não informado'}` })),
      ...history.symptoms.map(item => ({ key: `symptom-${item.date_ref}`, date: item.date_ref, text: `Check-in: intensidade de sintomas ${item.symptom_severity}/5${item.notes ? ` — ${item.notes}` : ''}` })),
      ...(history.symptom_events || []).map(item => ({ key: `event-${item.id}`, date: item.date_ref, text: `Sintoma registrado ${item.time_ref || ''}: ${item.title}${item.severity ? ` (${item.severity}/5)` : ''}${item.description ? ` — ${item.description}` : ''}${item.intervention_id ? `; intervenção associada: ${item.intervention_name || 'não disponível no período'}` : ''}; origem: ${item.source}` })),
      ...history.changes.map(item => ({ key: `change-${item.id}`, date: item.created_at.slice(0, 10), text: `Alteração de ${item.compound_name}: ${item.action_type}${item.old_value ? `; anterior: ${item.old_value}` : ''}${item.new_value ? `; novo: ${item.new_value}` : ''}` })),
    ].sort((a, b) => a.date.localeCompare(b.date) || a.key.localeCompare(b.key))
  }, [history])

  const load = async () => {
    if (!metric || !start || !end || start > end) { setError('Selecione um marcador e um período válido.'); return }
    setLoading(true); setError(''); setHistory(null)
    try {
      const query = new URLSearchParams({ metric_key: metric, start_date: start, end_date: end })
      setHistory(await requestJson<ClinicalHistoryResponse>(`/api/timeline/clinical?${query}`))
    } catch { setError('Não foi possível carregar o histórico clínico.') } finally { setLoading(false) }
  }

  return <section className="surface-panel rounded-radius-xl p-4 space-y-3" aria-labelledby="clinical-history-title">
    <h3 id="clinical-history-title" className="font-bold">Histórico clínico conectado</h3>
    <p className="text-sm">Compare registros no mesmo período. A proximidade entre eventos não comprova causa.</p>
    <div className="flex flex-wrap gap-3 items-end">
      <label>Marcador<Select aria-label="Marcador do histórico" value={metric} onChange={e => setMetric(e.target.value)}><option value="">Selecione</option>{markers.map(([key, name]) => <option key={key} value={key}>{name}</option>)}</Select></label>
      <label>De<Input aria-label="Início do histórico" type="date" value={start} onChange={e => setStart(e.target.value)} /></label>
      <label>Até<Input aria-label="Fim do histórico" type="date" value={end} onChange={e => setEnd(e.target.value)} /></label>
      <Button type="button" onClick={load} disabled={loading}>{loading ? 'Carregando…' : 'Comparar registros'}</Button>
    </div>
    {error && <p role="alert">{error}</p>}
    {history && <p className="text-sm">{history.labs.length ? `${history.labs.length} resultado(s) neste período.` : 'Nenhum exame deste marcador no período.'} {history.interventions.length ? '' : 'Nenhuma intervenção registrada no período.'}</p>}
    {history && (entries.length ? <ol className="space-y-2">{entries.map(item => <li key={item.key}><time>{item.date}</time> — {item.text}</li>)}</ol> : <p>Nenhum registro nesse período.</p>)}
  </section>
}
