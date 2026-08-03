import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { LabResultsTable } from './LabResultsTable'

describe('LabResultsTable', () => {
  it('normalizes legacy HDL/LDL aliases for cardiovascular ratios', () => {
    render(
      <LabResultsTable
        labs={[
          { collected_at: '2026-07-30', metric_key: 'triglycerides', metric_name: 'Triglicérides', value: 90, unit: 'mg/dL' },
          { collected_at: '2026-07-30', metric_key: 'hdl', metric_name: 'Colesterol HDL', value: 60, unit: 'mg/dL' },
          { collected_at: '2026-07-30', metric_key: 'total_cholesterol', metric_name: 'Colesterol Total', value: 180, unit: 'mg/dL' },
          { collected_at: '2026-07-30', metric_key: 'ldl', metric_name: 'Colesterol LDL', value: 100, unit: 'mg/dL' },
        ]}
        onAddBatchLabs={vi.fn()}
      />,
    )

    expect(screen.getByText('1.50')).toBeInTheDocument()
    expect(screen.getByText('20.0 mg/dL')).toBeInTheDocument()
    expect(screen.queryByText('(Sem TG/HDL)')).not.toBeInTheDocument()
    expect(screen.queryByText('(Sem dados)')).not.toBeInTheDocument()
  })

  it('submits canonical cardiovascular metric keys from the batch form labels', async () => {
    const user = userEvent.setup()
    const onAddBatchLabs = vi.fn()

    render(<LabResultsTable labs={[]} onAddBatchLabs={onAddBatchLabs} />)

    await user.click(screen.getByRole('button', { name: /novo painel de exames/i }))
    await user.type(screen.getByLabelText(/Colesterol HDL/i), '62')
    await user.type(screen.getByLabelText(/Colesterol LDL/i), '91')
    await user.click(screen.getByRole('button', { name: /salvar painel completo/i }))

    expect(onAddBatchLabs).toHaveBeenCalledTimes(1)
    const records = onAddBatchLabs.mock.calls[0][0] as Array<{ metric_key: string; metric_name: string }>

    expect(records).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ metric_key: 'hdl_cholesterol', metric_name: 'Colesterol HDL' }),
        expect.objectContaining({ metric_key: 'ldl_cholesterol', metric_name: 'Colesterol LDL' }),
      ]),
    )
    expect(records.map((record) => record.metric_key)).not.toContain('hdl')
    expect(records.map((record) => record.metric_key)).not.toContain('ldl')
  })
})
