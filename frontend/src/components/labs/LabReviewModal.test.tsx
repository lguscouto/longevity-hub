import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { requestJson } from '../../lib/api'
import { LabReviewModal } from './LabReviewModal'

vi.mock('../../lib/api', () => ({ requestJson: vi.fn() }))

describe('LabReviewModal', () => {
  it('exige validação, decisão sobre duplicata e confirmação antes de salvar', async () => {
    vi.mocked(requestJson).mockResolvedValueOnce({ records: [{ normalized_value: 90, normalized_unit: 'mg/dL', duplicate: true, error: null }] })
    const submit = vi.fn().mockResolvedValue(undefined)
    render(<LabReviewModal isOpen records={[{ collected_at: '2026-01-23', metric_key: 'glucose_mgdl', metric_name: 'Glicose', value: 90, unit: 'mg/dL', category: 'Metabolismo' }]} onClose={vi.fn()} onSubmit={submit} />)
    expect(screen.getByRole('button', { name: 'Confirmar e salvar' })).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: 'Validar prévia' }))
    expect(await screen.findByText(/Normalizado: 90 mg\/dL.*possível duplicata/)).toBeVisible()
    await userEvent.click(screen.getByLabelText('Conferi os resultados com o laudo.'))
    expect(screen.getByRole('button', { name: 'Confirmar e salvar' })).toBeDisabled()
    await userEvent.click(screen.getByLabelText('Revisei as possíveis duplicatas e desejo incluí-las.'))
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar e salvar' }))
    expect(submit).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({ raw_value: '90', raw_unit: 'mg/dL' })]), true)
  })
})
