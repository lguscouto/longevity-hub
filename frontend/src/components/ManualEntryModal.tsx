import React, { useState } from 'react'
import { PlusCircle } from 'lucide-react'

import { ApiError } from '../lib/api'
import { formatLocalDateKey } from '../lib/formatters'
import { Modal, FormField, Input } from './ui'

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
    date_ref: formatLocalDateKey(),
    systolic_bp: 120,
    diastolic_bp: 78,
    waist_cm: 82,
    grip_strength_kg: 48,
    weight_kg: 74.5,
    vo2_max: 46.5,
    spo2_avg_pct: 98.0 as number | undefined,
    respiratory_rate_rpm: 14.0 as number | undefined,
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Registrar Métricas Manuais"
      ariaLabel="Registrar Métrica Manual"
      icon={<PlusCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />}
      size="md"
      closeButtonAriaLabel="Fechar modal"
    >
      <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
        <FormField id="manual-entry-date" label="Data de Referência">
          <Input
            id="manual-entry-date"
            type="date"
            value={formData.date_ref}
            onChange={(event) => setFormData({ ...formData, date_ref: event.target.value })}
          />
        </FormField>

        <div className="grid grid-cols-2 gap-3">
          <FormField id="manual-entry-systolic" label="Pressão Sistólica (mmHg)">
            <Input
              id="manual-entry-systolic"
              type="number"
              inputMode="decimal"
              value={formData.systolic_bp}
              onChange={(event) => setFormData({ ...formData, systolic_bp: +event.target.value })}
            />
          </FormField>
          <FormField id="manual-entry-diastolic" label="Pressão Diastólica (mmHg)">
            <Input
              id="manual-entry-diastolic"
              type="number"
              inputMode="decimal"
              value={formData.diastolic_bp}
              onChange={(event) => setFormData({ ...formData, diastolic_bp: +event.target.value })}
            />
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FormField id="manual-entry-waist" label="Circunferência da Cintura (cm)">
            <Input
              id="manual-entry-waist"
              type="number"
              step="0.5"
              inputMode="decimal"
              value={formData.waist_cm}
              onChange={(event) => setFormData({ ...formData, waist_cm: +event.target.value })}
            />
          </FormField>
          <FormField id="manual-entry-grip" label="Dinamometria / Grip (kg)">
            <Input
              id="manual-entry-grip"
              type="number"
              step="0.5"
              inputMode="decimal"
              value={formData.grip_strength_kg}
              onChange={(event) => setFormData({ ...formData, grip_strength_kg: +event.target.value })}
            />
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FormField id="manual-entry-weight" label="Peso (kg)">
            <Input
              id="manual-entry-weight"
              type="number"
              step="0.1"
              inputMode="decimal"
              value={formData.weight_kg}
              onChange={(event) => setFormData({ ...formData, weight_kg: +event.target.value })}
            />
          </FormField>
          <FormField id="manual-entry-vo2" label="VO2 Max Estimado">
            <Input
              id="manual-entry-vo2"
              type="number"
              step="0.1"
              inputMode="decimal"
              value={formData.vo2_max}
              onChange={(event) => setFormData({ ...formData, vo2_max: +event.target.value })}
            />
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FormField id="manual-entry-spo2" label="SpO2 Oxigenação (%)">
            <Input
              id="manual-entry-spo2"
              type="number"
              step="0.1"
              inputMode="decimal"
              placeholder="Ex: 98.5"
              onChange={(event) => setFormData({ ...formData, spo2_avg_pct: +event.target.value })}
            />
          </FormField>
          <FormField id="manual-entry-resp" label="Freq. Respiratória (rpm)">
            <Input
              id="manual-entry-resp"
              type="number"
              step="0.5"
              inputMode="decimal"
              placeholder="Ex: 14"
              onChange={(event) => setFormData({ ...formData, respiratory_rate_rpm: +event.target.value })}
            />
          </FormField>
        </div>

        {error && <p role="alert" className="text-xs text-rose-600 dark:text-rose-400 font-medium">{error}</p>}

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 border-t border-slate-200 dark:border-slate-800 pt-4 mt-4">
          <button type="button" onClick={onClose} className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold border border-slate-200 dark:border-slate-700 transition text-center min-h-[44px]">
            Cancelar
          </button>
          <button type="submit" className="w-full sm:w-auto px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition shadow-md text-center min-h-[44px]" disabled={isSaving}>
            {isSaving ? 'Salvando…' : 'Salvar Registro'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
