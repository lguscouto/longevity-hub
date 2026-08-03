import React, { useState } from 'react'
import { PlusCircle } from 'lucide-react'

import { ApiError } from '../lib/api'

interface ManualEntryModalProps {
  isOpen: boolean
  onClose: () => void
  onSaveMetric: (metricData: any) => Promise<void>
}

export const ManualEntryModal: React.FC<ManualEntryModalProps> = ({
  isOpen,
  onClose,
  onSaveMetric,
}) => {
  const [formData, setFormData] = useState({
    date_ref: new Date().toISOString().slice(0, 10),
    systolic_bp: 120,
    diastolic_bp: 78,
    waist_cm: 82,
    grip_strength_kg: 48,
    weight_kg: 74.5,
    vo2_max: 46.5,
  })
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    setIsSaving(true)

    try {
      await onSaveMetric(formData)
      onClose()
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Não foi possível salvar o registro.')
    } finally {
      setIsSaving(false)
    }
  }

  const inputClass = "w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-slate-900 dark:text-white font-medium focus:border-emerald-500 focus:outline-none"
  const labelClass = "block text-slate-600 dark:text-slate-400 mb-1 font-semibold"

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 dark:bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Registrar Métrica Manual"
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl text-slate-900 dark:text-slate-100"
      >
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 mb-4">
          <div className="flex items-center gap-2">
            <PlusCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Registrar Métricas Manuais</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-900 dark:hover:text-white" aria-label="Fechar modal">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label htmlFor="manual-entry-date" className={labelClass}>Data de Referência</label>
            <input
              id="manual-entry-date"
              type="date"
              value={formData.date_ref}
              onChange={(event) => setFormData({ ...formData, date_ref: event.target.value })}
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="manual-entry-systolic" className={labelClass}>Pressão Sistólica (mmHg)</label>
              <input
                id="manual-entry-systolic"
                type="number"
                value={formData.systolic_bp}
                onChange={(event) => setFormData({ ...formData, systolic_bp: +event.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="manual-entry-diastolic" className={labelClass}>Pressão Diastólica (mmHg)</label>
              <input
                id="manual-entry-diastolic"
                type="number"
                value={formData.diastolic_bp}
                onChange={(event) => setFormData({ ...formData, diastolic_bp: +event.target.value })}
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="manual-entry-waist" className={labelClass}>Circunferência da Cintura (cm)</label>
              <input
                id="manual-entry-waist"
                type="number"
                step="0.5"
                value={formData.waist_cm}
                onChange={(event) => setFormData({ ...formData, waist_cm: +event.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="manual-entry-grip" className={labelClass}>Dinamometria / Grip (kg)</label>
              <input
                id="manual-entry-grip"
                type="number"
                step="0.5"
                value={formData.grip_strength_kg}
                onChange={(event) => setFormData({ ...formData, grip_strength_kg: +event.target.value })}
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="manual-entry-weight" className={labelClass}>Peso (kg)</label>
              <input
                id="manual-entry-weight"
                type="number"
                step="0.1"
                value={formData.weight_kg}
                onChange={(event) => setFormData({ ...formData, weight_kg: +event.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="manual-entry-vo2" className={labelClass}>VO2 Max Estimado</label>
              <input
                id="manual-entry-vo2"
                type="number"
                step="0.1"
                value={formData.vo2_max}
                onChange={(event) => setFormData({ ...formData, vo2_max: +event.target.value })}
                className={inputClass}
              />
            </div>
          </div>

          {error && <p role="alert" className="text-xs text-rose-600 dark:text-rose-300 font-medium">{error}</p>}

          <div className="flex justify-end gap-2 border-t border-slate-200 dark:border-slate-800 pt-4 mt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold border border-slate-200 dark:border-slate-700 transition">
              Cancelar
            </button>
            <button type="submit" className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold glow-emerald transition shadow-md" disabled={isSaving}>
              {isSaving ? 'Salvando…' : 'Salvar Registro'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
