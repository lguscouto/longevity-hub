import React, { useState } from 'react'
import { Calculator, Dna, Sparkles } from 'lucide-react'

type ModelStatus = 'complete' | 'incomplete'

type ModelPayload = Record<string, unknown>

interface PhenoAgeRecord extends ModelPayload {
  pheno_age?: number
  chronological_age?: number
  age_delta?: number
  calculated_at?: string
  status?: string
  missing?: unknown
  missing_biomarkers?: unknown
  phenoage?: unknown
  kdm?: unknown
}

interface KdmRecord extends ModelPayload {
  status?: string
  kdm_age?: number
  chronological_age?: number
  kdm_delta?: number
  calculated_at?: string
  biomarkers_used?: unknown
  missing?: unknown
  missing_biomarkers?: unknown
  kdm?: unknown
  result?: unknown
}

interface PhenoAgeWidgetProps {
  latestRecord?: PhenoAgeRecord | null
  latestKdmRecord?: KdmRecord | null
  onRecalculate: (inputData: any) => void
}

const BIOMARKER_LABELS: Record<string, string> = {
  glucose_mgdl: 'Glicose',
  fasting_glucose: 'Glicose',
  creatinine_mgdl: 'Creatinina',
  creatinine: 'Creatinina',
  albumin_gdl: 'Albumina',
  albumin: 'Albumina',
  hscrp_mgl: 'hs-CRP',
  hscrp: 'hs-CRP',
  lymphocyte_pct: 'Linfócitos',
  mcv_fl: 'MCV',
  mcv: 'MCV',
  rdw_pct: 'RDW',
  rdw: 'RDW',
  alk_phos_ul: 'Fosfatase Alcalina',
  alk_phos: 'Fosfatase Alcalina',
  wbc_1000ul: 'WBC',
  wbc: 'WBC',
  rhr_bpm: 'Frequência cardíaca de repouso',
  systolic_bp: 'Pressão sistólica',
  diastolic_bp: 'Pressão diastólica',
}

function asRecord(value: unknown): ModelPayload | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as ModelPayload) : null
}

function nestedOrSelf(value: unknown, keys: string[]): ModelPayload | null {
  const root = asRecord(value)
  if (!root) return null

  for (const key of keys) {
    const nested = asRecord(root[key])
    if (nested) return nested
  }

  return root
}

function nestedOnly(value: unknown, keys: string[]): ModelPayload | null {
  const root = asRecord(value)
  if (!root) return null

  for (const key of keys) {
    const nested = nestedOrSelf(root[key], ['result', 'kdm', 'kdm_result'])
    if (nested) return nested
  }

  return null
}

function firstNumber(record: ModelPayload | null, keys: string[]): number | null {
  if (!record) return null
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'number' && Number.isFinite(value)) return value
    if (typeof value === 'string' && value.trim() !== '') {
      const parsed = Number(value)
      if (Number.isFinite(parsed)) return parsed
    }
  }
  return null
}

function firstString(record: ModelPayload | null, keys: string[]): string | undefined {
  if (!record) return undefined
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return undefined
}

function normalizeStatus(value: unknown): ModelStatus | undefined {
  if (typeof value !== 'string') return undefined
  const normalized = value.toLowerCase().trim()
  if (['complete', 'ok', 'available', 'success'].includes(normalized)) return 'complete'
  if (['incomplete', 'insufficient', 'insufficient_data', 'missing', 'unavailable'].includes(normalized)) return 'incomplete'
  return undefined
}

function firstStatus(record: ModelPayload | null, keys: string[]): ModelStatus | undefined {
  if (!record) return undefined
  for (const key of keys) {
    const status = normalizeStatus(record[key])
    if (status) return status
  }
  return undefined
}

function parseMarkerList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item).trim())
      .filter(Boolean)
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return []

    if (trimmed.startsWith('[')) {
      try {
        return parseMarkerList(JSON.parse(trimmed) as unknown)
      } catch {
        // Fall back to comma splitting below.
      }
    }

    return trimmed
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  }

  return []
}

function firstMarkerList(record: ModelPayload | null, keys: string[]): string[] {
  if (!record) return []
  for (const key of keys) {
    const list = parseMarkerList(record[key])
    if (list.length > 0) return list
  }
  return []
}

function markerLabel(marker: string): string {
  const normalized = marker.toLowerCase().trim()
  return BIOMARKER_LABELS[normalized] ?? marker
}

function formatMarkerList(markers: string[]): string {
  return markers.map(markerLabel).join(', ')
}

function formatAge(value: number): string {
  return `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(value)} anos`
}

function formatDelta(delta: number): string {
  const formatted = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(delta)
  return `${delta > 0 ? '+' : ''}${formatted} anos vs. cronológica`
}

interface ModelScoreProps {
  title: string
  titleClassName: string
  unavailableLabel: string
  emptyDetail: string
  age: number | null
  delta: number | null
  complete: boolean
  calculatedAt?: string
  missingMarkers: string[]
  usedMarkers: string[]
  className?: string
}

const ModelScore: React.FC<ModelScoreProps> = ({
  title,
  titleClassName,
  unavailableLabel,
  emptyDetail,
  age,
  delta,
  complete,
  calculatedAt,
  missingMarkers,
  usedMarkers,
  className = '',
}) => (
  <div className={`text-center space-y-1 ${className}`}>
    <span className={`text-[10px] uppercase font-bold block mb-0.5 ${titleClassName}`}>{title}</span>
    {complete && age !== null ? (
      <>
        <span className="text-xl font-extrabold text-slate-900 dark:text-white block">{formatAge(age)}</span>
        {delta !== null && (
          <span className={`text-[10px] font-bold block ${delta < 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
            {formatDelta(delta)}
          </span>
        )}
        {calculatedAt && <span className="text-[10px] text-slate-500 block">Calculado em {calculatedAt}</span>}
        {usedMarkers.length > 0 && (
          <span className="text-[10px] text-slate-500 block">Insumos: {formatMarkerList(usedMarkers)}</span>
        )}
      </>
    ) : (
      <>
        <span className="text-sm font-extrabold text-slate-800 dark:text-slate-200 block">{unavailableLabel}</span>
        <span className="text-[10px] text-slate-500 block">{emptyDetail}</span>
        {calculatedAt && <span className="text-[10px] text-slate-500 block">Última tentativa em {calculatedAt}</span>}
        {missingMarkers.length > 0 && (
          <span className="text-[10px] text-amber-600 dark:text-amber-300 font-medium block">Faltam: {formatMarkerList(missingMarkers)}</span>
        )}
      </>
    )}
  </div>
)

export const PhenoAgeWidget: React.FC<PhenoAgeWidgetProps> = ({ latestRecord, latestKdmRecord, onRecalculate }) => {
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({
    chronological_age: 32,
    glucose_mgdl: 88,
    creatinine_mgdl: 0.85,
    albumin_gdl: 4.6,
    hscrp_mgl: 0.4,
    lymphocyte_pct: 32,
    mcv_fl: 89,
    rdw_pct: 12.2,
    alk_phos_ul: 62,
    wbc_1000ul: 5.5,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onRecalculate(formData)
    setShowModal(false)
  }

  const phenoRecord = nestedOrSelf(latestRecord, ['phenoage', 'phenoage_result', 'result'])
  const phenoAge = firstNumber(phenoRecord, ['pheno_age', 'biological_age'])
  const phenoDelta = firstNumber(phenoRecord, ['age_delta', 'pheno_delta'])
  const phenoStatus = firstStatus(phenoRecord, ['status', 'phenoage_status', 'calculation_status'])
  const phenoComplete = (phenoStatus === 'complete' || phenoStatus === undefined) && phenoAge !== null
  const phenoMissing = firstMarkerList(phenoRecord, ['missing', 'missing_biomarkers', 'missing_markers'])
  const phenoCalculatedAt = firstString(phenoRecord, ['calculated_at', 'date', 'created_at'])

  const kdmRecord = nestedOrSelf(latestKdmRecord, ['kdm', 'kdm_result', 'result']) ?? nestedOnly(latestRecord, ['kdm', 'kdm_result'])
  const kdmAge = firstNumber(kdmRecord, ['kdm_age', 'biological_age'])
  const kdmChronologicalAge = firstNumber(kdmRecord, ['chronological_age']) ?? firstNumber(phenoRecord, ['chronological_age'])
  const kdmDelta = firstNumber(kdmRecord, ['kdm_delta', 'age_delta']) ?? (kdmAge !== null && kdmChronologicalAge !== null ? kdmAge - kdmChronologicalAge : null)
  const kdmStatus = firstStatus(kdmRecord, ['status', 'kdm_status', 'calculation_status'])
  const kdmComplete = (kdmStatus === 'complete' || kdmStatus === undefined) && kdmAge !== null
  const kdmMissing = firstMarkerList(kdmRecord, ['missing_biomarkers', 'missing', 'missing_markers'])
  const kdmUsed = firstMarkerList(kdmRecord, ['biomarkers_used', 'used_biomarkers', 'markers_used'])
  const kdmCalculatedAt = firstString(kdmRecord, ['calculated_at', 'date', 'created_at'])

  return (
    <>
      <div className="p-6 rounded-3xl glass-panel border border-cyan-500/20 bg-gradient-to-br from-cyan-950/20 via-slate-900/60 to-slate-950 flex flex-col justify-between space-y-5 h-full">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
              <Dna className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Idade Biológica</h3>
                <span className="text-[9px] uppercase font-extrabold px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border border-cyan-500/20">PhenoAge / KDM</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400">Modelos Morgan Levine (2018) e Klemera-Doubal quando o backend envia cálculo completo</p>
            </div>
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="px-3 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 flex items-center gap-1 transition glow-cyan"
          >
            <Calculator className="h-3.5 w-3.5" /> Calcular
          </button>
        </div>

        {/* Display Score Box (somente dados calculados pelo backend) */}
        <div className="grid grid-cols-2 gap-3 bg-slate-100/90 dark:bg-slate-950/70 p-4 rounded-2xl border border-slate-200 dark:border-slate-800/80">
          <ModelScore
            title="Morgan Levine PhenoAge"
            titleClassName="text-cyan-600 dark:text-cyan-400"
            unavailableLabel="PhenoAge indisponível"
            emptyDetail="Dados insuficientes para publicar idade biológica."
            age={phenoAge}
            delta={phenoDelta}
            complete={phenoComplete}
            calculatedAt={phenoCalculatedAt}
            missingMarkers={phenoMissing}
            usedMarkers={phenoComplete ? ['glucose_mgdl', 'creatinine_mgdl', 'albumin_gdl', 'hscrp_mgl', 'lymphocyte_pct', 'mcv_fl', 'rdw_pct', 'alk_phos_ul', 'wbc_1000ul'] : []}
          />

          <ModelScore
            title="KDM Biological Age"
            titleClassName="text-indigo-600 dark:text-indigo-400"
            unavailableLabel="KDM indisponível"
            emptyDetail="Sem cálculo KDM completo enviado pelo backend."
            age={kdmAge}
            delta={kdmDelta}
            complete={kdmComplete}
            calculatedAt={kdmCalculatedAt}
            missingMarkers={kdmMissing}
            usedMarkers={kdmUsed}
            className="border-l border-slate-200 dark:border-slate-800 pl-2"
          />
        </div>

        <div className="text-[10px] text-slate-600 dark:text-slate-400 flex items-start gap-1">
          <Sparkles className="h-3 w-3 text-cyan-600 dark:text-cyan-400 shrink-0 mt-0.5" />
          <span>Valores de idade biológica só aparecem quando o backend retorna um cálculo completo; estados incompletos mostram quais biomarcadores faltam.</span>
        </div>
      </div>

      {/* Modal Calculator */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 dark:bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl">
            <div className="flex items-center justify-between mb-4 border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Calculator className="h-5 w-5 text-cyan-600 dark:text-cyan-400" /> Calculadora de PhenoAge
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white text-sm">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1">Idade Cronológica</label>
                <input type="number" step="0.1" value={formData.chronological_age} onChange={e => setFormData({...formData, chronological_age: +e.target.value})} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-slate-900 dark:text-white focus:border-cyan-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1">Glicose (mg/dL)</label>
                <input type="number" step="0.1" value={formData.glucose_mgdl} onChange={e => setFormData({...formData, glucose_mgdl: +e.target.value})} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-slate-900 dark:text-white focus:border-cyan-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1">Creatinina (mg/dL)</label>
                <input type="number" step="0.01" value={formData.creatinine_mgdl} onChange={e => setFormData({...formData, creatinine_mgdl: +e.target.value})} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-slate-900 dark:text-white focus:border-cyan-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1">Albumina (g/dL)</label>
                <input type="number" step="0.1" value={formData.albumin_gdl} onChange={e => setFormData({...formData, albumin_gdl: +e.target.value})} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-slate-900 dark:text-white focus:border-cyan-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1">hs-CRP (mg/L)</label>
                <input type="number" step="0.01" value={formData.hscrp_mgl} onChange={e => setFormData({...formData, hscrp_mgl: +e.target.value})} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-slate-900 dark:text-white focus:border-cyan-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1">Linfócitos (%)</label>
                <input type="number" step="0.1" value={formData.lymphocyte_pct} onChange={e => setFormData({...formData, lymphocyte_pct: +e.target.value})} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-slate-900 dark:text-white focus:border-cyan-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1">MCV (fL)</label>
                <input type="number" step="0.1" value={formData.mcv_fl} onChange={e => setFormData({...formData, mcv_fl: +e.target.value})} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-slate-900 dark:text-white focus:border-cyan-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1">RDW (%)</label>
                <input type="number" step="0.1" value={formData.rdw_pct} onChange={e => setFormData({...formData, rdw_pct: +e.target.value})} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-slate-900 dark:text-white focus:border-cyan-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1">Fosfatase Alcalina (U/L)</label>
                <input type="number" step="1" value={formData.alk_phos_ul} onChange={e => setFormData({...formData, alk_phos_ul: +e.target.value})} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-slate-900 dark:text-white focus:border-cyan-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1">WBC (10^3/uL)</label>
                <input type="number" step="0.1" value={formData.wbc_1000ul} onChange={e => setFormData({...formData, wbc_1000ul: +e.target.value})} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-slate-900 dark:text-white focus:border-cyan-500 focus:outline-none" />
              </div>

              <div className="col-span-2 mt-4 flex justify-end gap-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition">Cancelar</button>
                <button type="submit" className="px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 font-bold glow-cyan">Calcular & Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
