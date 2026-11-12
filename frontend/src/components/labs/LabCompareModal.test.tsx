import { render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { LabCompareModal } from './LabCompareModal'

describe('LabCompareModal', () => {
  it('mantém a referência e a unidade de cada coleta, inclusive resultados repetidos', () => {
    render(<LabCompareModal isOpen dates={['2026-02-01', '2025-01-01']} labs={[
      { id: 1, collected_at: '2026-02-01', metric_key: 'testosterone_total', metric_name: 'Testosterona', value: 700, unit: 'ng/dL', ref_min: 200, ref_max: 800, record_origin: 'patient_lab' },
      { id: 2, collected_at: '2025-01-01', metric_key: 'total_testosterone', metric_name: 'Testosterona', value: 20, unit: 'nmol/L', ref_min: 8, ref_max: 30, record_origin: 'imported' },
      { id: 3, collected_at: '2025-01-01', metric_key: 'total_testosterone', metric_name: 'Testosterona', value: 21, unit: 'nmol/L', ref_min: 8, ref_max: 30, record_origin: 'imported' },
    ]} onClose={vi.fn()} />)
    const table = screen.getByRole('table')
    expect(within(table).getByText('700 ng/dL')).toBeVisible()
    expect(within(table).getByText('20 nmol/L')).toBeVisible()
    expect(within(table).getByText('21 nmol/L')).toBeVisible()
    expect(within(table).getByText(/200 – 800 ng\/dL/)).toBeVisible()
  })
})
