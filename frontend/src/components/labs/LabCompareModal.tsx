import React, { useEffect, useMemo, useState } from 'react'
import { Button, Modal, Select } from '../ui'
import { getMetricDisplayName, normalizeLabMetricKey, recordOriginLabel, type LabResult } from './labMarkers'

export const LabCompareModal: React.FC<{ isOpen: boolean; dates: string[]; labs: LabResult[]; onClose: () => void }> = ({ isOpen, dates, labs, onClose }) => {
  const [first, setFirst] = useState('')
  const [second, setSecond] = useState('')
  useEffect(() => { if (isOpen) { setFirst(dates[0] || ''); setSecond(dates[1] || '') } }, [isOpen])
  const rows = useMemo(() => {
    const grouped = new Map<string, { name: string; a: LabResult[]; b: LabResult[] }>()
    for (const lab of labs) {
      if (lab.collected_at !== first && lab.collected_at !== second) continue
      const key = normalizeLabMetricKey(lab.metric_key)
      const row = grouped.get(key) || { name: getMetricDisplayName(lab), a: [], b: [] }
      if (lab.collected_at === first) row.a.push(lab)
      if (lab.collected_at === second) row.b.push(lab)
      grouped.set(key, row)
    }
    return Array.from(grouped.entries()).sort((a, b) => a[1].name.localeCompare(b[1].name))
  }, [labs, first, second])
  const show = (items: LabResult[]) => items.length ? items.map((item, index) => <div key={item.id || index} className="mb-2"><strong>{item.value} {item.unit}</strong><div>Referência registrada: {item.ref_min ?? '—'} – {item.ref_max ?? '—'} {item.unit}</div><div>Origem: {recordOriginLabel(item.record_origin)}</div></div>) : 'Sem resultado nesta coleta'
  return <Modal isOpen={isOpen} onClose={onClose} title="Comparar coletas" description="Cada coleta mantém a própria unidade e referência registrada." size="4xl" footer={<Button onClick={onClose} variant="secondary">Fechar</Button>}>
    <div className="flex flex-wrap gap-4 mb-4"><label>Primeira coleta<Select aria-label="Primeira coleta" value={first} onChange={e => setFirst(e.target.value)}><option value="">Selecione</option>{dates.map(date => <option key={date}>{date}</option>)}</Select></label><label>Segunda coleta<Select aria-label="Segunda coleta" value={second} onChange={e => setSecond(e.target.value)}><option value="">Selecione</option>{dates.map(date => <option key={date}>{date}</option>)}</Select></label></div>
    {!first || !second || first === second ? <p>Selecione duas datas diferentes.</p> : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th>Marcador</th><th>{first}</th><th>{second}</th></tr></thead><tbody>{rows.map(([key, row]) => <tr key={key}><th className="align-top">{row.name}</th><td className="align-top">{show(row.a)}</td><td className="align-top">{show(row.b)}</td></tr>)}</tbody></table></div>}
  </Modal>
}
