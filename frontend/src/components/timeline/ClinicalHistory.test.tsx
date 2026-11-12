import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { requestJson } from '../../lib/api'
import { ClinicalHistory } from './ClinicalHistory'

vi.mock('../../lib/api', () => ({ requestJson: vi.fn() }))

describe('ClinicalHistory', () => {
  beforeEach(() => vi.mocked(requestJson).mockReset())
  it('exibe resultados, intervenção e sintoma sem sugerir causa', async () => {
    vi.mocked(requestJson).mockResolvedValueOnce([{ metric_key: 'glucose', metric_name: 'Glicose' }])
      .mockResolvedValueOnce({ labs: [{ id: 1, metric_name: 'Glicose', collected_at: '2026-01-02', value: 90, unit: 'mg/dL', record_origin: 'patient_lab' }], interventions: [{ id: 2, name: 'Rotina', start_date: '2026-01-01', end_date: null, dosage: null }], symptoms: [{ date_ref: '2026-01-03', symptom_severity: 2, notes: null }], changes: [] })
    render(<ClinicalHistory />)
    await userEvent.selectOptions(await screen.findByLabelText('Marcador do histórico'), 'glucose')
    await userEvent.click(screen.getByRole('button', { name: 'Comparar registros' }))
    expect(await screen.findByText(/Glicose: 90 mg\/dL/)).toBeVisible()
    expect(screen.getByText(/Intervenção: Rotina/)).toBeVisible()
    expect(screen.getByText(/intensidade de sintomas 2\/5/)).toBeVisible()
    expect(screen.getByText(/não comprova causa/)).toBeVisible()
  })
})
