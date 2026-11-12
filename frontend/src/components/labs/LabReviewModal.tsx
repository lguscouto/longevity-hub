import React, { useEffect, useState } from 'react'
import { ApiError, requestJson } from '../../lib/api'
import { Button, Input, Modal, Checkbox } from '../ui'
import type { LabBatchRecord } from './labMarkers'

type Row = { page: number | null; collected_at: string; metric_key: string; metric_name: string; raw_value: string; raw_unit: string; ref_min: string; ref_max: string; method: string }
type Validation = { records: Array<{ normalized_value: number | null; normalized_unit: string | null; duplicate: boolean; error: string | null }> }
type Preview = { pages: Array<{ page: number; text: string; warning: string | null }>; suggestions: Array<{ page: number; collected_at: string | null; metric_key: string; raw_name: string; raw_value: string; raw_unit: string }> }

const blank = (): Row => ({ page: null, collected_at: '', metric_key: '', metric_name: '', raw_value: '', raw_unit: '', ref_min: '', ref_max: '', method: '' })

export const LabReviewModal: React.FC<{ isOpen: boolean; records: LabBatchRecord[]; onClose: () => void; onSubmit: (records: object[], allowDuplicates: boolean) => Promise<void> }> = ({ isOpen, records, onClose, onSubmit }) => {
  const [rows, setRows] = useState<Row[]>([])
  const [pages, setPages] = useState<Preview['pages']>([])
  const [file, setFile] = useState<File | null>(null)
  const [validation, setValidation] = useState<Validation | null>(null)
  const [allowDuplicates, setAllowDuplicates] = useState(false)
  const [reviewed, setReviewed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isOpen) return
    setRows(records.length ? records.map(item => ({ ...blank(), collected_at: item.collected_at, metric_key: item.metric_key, metric_name: item.metric_name, raw_value: String(item.value), raw_unit: item.unit, ref_min: item.ref_min == null ? '' : String(item.ref_min), ref_max: item.ref_max == null ? '' : String(item.ref_max) })) : [blank()])
    setPages([]); setFile(null); setValidation(null); setAllowDuplicates(false); setReviewed(false); setError('')
  }, [isOpen, records])

  const change = (index: number, field: keyof Row, value: string) => {
    setRows(current => current.map((row, i) => i === index ? { ...row, [field]: value } : row))
    setValidation(null); setReviewed(false); setAllowDuplicates(false)
  }
  const payload = () => rows.map(row => ({ collected_at: row.collected_at, metric_key: row.metric_key.trim(), metric_name: row.metric_name.trim(), value: Number(row.raw_value.replace(',', '.')), unit: row.raw_unit.trim(), raw_value: row.raw_value.replace(',', '.'), raw_unit: row.raw_unit.trim(), ref_min: row.ref_min === '' ? null : Number(row.ref_min.replace(',', '.')), ref_max: row.ref_max === '' ? null : Number(row.ref_max.replace(',', '.')), notes: [row.page ? `Página ${row.page}` : '', row.method ? `Método: ${row.method}` : ''].filter(Boolean).join('; ') || null }))
  const isComplete = rows.length > 0 && rows.every(row => row.collected_at && row.metric_key.trim() && row.metric_name.trim() && row.raw_unit.trim() && row.raw_value.trim() && Number.isFinite(Number(row.raw_value.replace(',', '.'))) && (row.ref_min === '' || Number.isFinite(Number(row.ref_min.replace(',', '.')))) && (row.ref_max === '' || Number.isFinite(Number(row.ref_max.replace(',', '.')))))
  const upload = async () => {
    if (!file) return
    setBusy(true); setError(''); setValidation(null); setReviewed(false); setAllowDuplicates(false)
    try {
      const form = new FormData(); form.append('file', file)
      const result = await requestJson<Preview>('/api/labs/preview', { method: 'POST', body: form })
      setPages(result.pages)
      setRows(result.suggestions.length ? result.suggestions.map(item => ({ ...blank(), page: item.page, collected_at: item.collected_at || '', metric_key: item.metric_key, metric_name: item.raw_name, raw_value: item.raw_value, raw_unit: item.raw_unit })) : [blank()])
    } catch (caught) { setError(caught instanceof ApiError ? caught.message : 'Falha ao ler o arquivo.') } finally { setBusy(false) }
  }
  const validate = async () => {
    if (!isComplete) { setError('Preencha data, marcador, nome, valor exato e unidade em cada linha.'); return }
    setBusy(true); setError(''); setValidation(null); setReviewed(false); setAllowDuplicates(false)
    try { setValidation(await requestJson<Validation>('/api/labs/validate-preview', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ records: payload() }) })) }
    catch (caught) { setError(caught instanceof ApiError ? caught.message : 'Falha ao validar a prévia.') } finally { setBusy(false) }
  }
  const save = async () => {
    if (!validation || !reviewed || validation.records.some(item => item.error) || (validation.records.some(item => item.duplicate) && !allowDuplicates)) return
    setBusy(true); setError('')
    try { await onSubmit(payload(), allowDuplicates); onClose() } catch (caught) {
      if (caught instanceof ApiError && caught.status === 409) { setValidation(null); setReviewed(false); setAllowDuplicates(false); setError('Possível conflito ou duplicata. Valide a prévia novamente.') }
      else setError(caught instanceof Error ? caught.message : 'Não foi possível salvar o lote.')
    } finally { setBusy(false) }
  }

  return <Modal isOpen={isOpen} onClose={onClose} title="Revisar exames" description="Confira cada campo com o laudo antes de confirmar." size="4xl" footer={<div className="flex flex-wrap gap-2"><Button type="button" variant="secondary" onClick={validate} disabled={busy}>Validar prévia</Button><Button type="button" onClick={save} disabled={busy || !validation || !reviewed || validation.records.some(item => !!item.error) || (validation.records.some(item => item.duplicate) && !allowDuplicates)}>Confirmar e salvar</Button></div>}>
    <fieldset disabled={busy} className="space-y-4">
      <div><label htmlFor="lab-preview-file">Laudo em PDF, PNG ou JPEG</label><Input id="lab-preview-file" type="file" accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg" onChange={e => setFile(e.target.files?.[0] || null)} /><Button type="button" variant="secondary" disabled={!file} onClick={upload}>Ler arquivo localmente</Button></div>
      {pages.map(page => <details key={page.page}><summary>Página {page.page}: texto extraído</summary>{page.warning && <p role="status">{page.warning}</p>}<pre className="whitespace-pre-wrap text-xs">{page.text || 'Nenhum texto extraído. Preencha os campos manualmente.'}</pre></details>)}
      <p>Resultados extraídos podem conter erros. Confira os valores e referências no documento original.</p>
      {rows.map((row, index) => <div key={index} className="border rounded-radius-lg p-3 space-y-2"><h4>Resultado {index + 1}{row.page ? ` — página ${row.page}` : ''}</h4><div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {([['collected_at', 'Data da coleta', 'date'], ['metric_key', 'Chave do marcador', 'text'], ['metric_name', 'Nome no laudo', 'text'], ['raw_value', 'Valor original', 'text'], ['raw_unit', 'Unidade original', 'text'], ['ref_min', 'Referência mínima', 'text'], ['ref_max', 'Referência máxima', 'text'], ['method', 'Método', 'text']] as const).map(([field, label, type]) => <label key={field}>{label}<Input aria-label={`${label} ${index + 1}`} type={type} value={row[field]} onChange={event => change(index, field, event.target.value)} /></label>)}
      </div>{validation?.records[index] && <p role="status">{validation.records[index].error || `Normalizado: ${validation.records[index].normalized_value} ${validation.records[index].normalized_unit}`}{validation.records[index].duplicate ? ' — possível duplicata' : ''}</p>}<Button type="button" variant="ghost" onClick={() => { setRows(current => current.filter((_, i) => i !== index)); setValidation(null); setReviewed(false) }}>Remover resultado</Button></div>)}
      <Button type="button" variant="secondary" onClick={() => { setRows(current => [...current, blank()]); setValidation(null); setReviewed(false) }}>Adicionar resultado</Button>
      {validation?.records.some(item => item.duplicate) && <label className="flex min-h-11 items-center gap-2"><Checkbox checked={allowDuplicates} onChange={e => setAllowDuplicates(e.target.checked)} /> Revisei as possíveis duplicatas e desejo incluí-las.</label>}
      {validation && <label className="flex min-h-11 items-center gap-2"><Checkbox checked={reviewed} onChange={e => setReviewed(e.target.checked)} /> Conferi os resultados com o laudo.</label>}
      {error && <p role="alert">{error}</p>}
    </fieldset>
  </Modal>
}
