import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'

import { PersonalAssociationsCard } from './PersonalAssociationsCard'
import { requestJson } from '../../lib/api'

vi.mock('../../lib/api', async () => {
  const actual = await vi.importActual<typeof import('../../lib/api')>('../../lib/api')
  return {
    ...actual,
    requestJson: vi.fn(),
  }
})

const requestJsonMock = vi.mocked(requestJson)

const mockResponse = {
  total: 1,
  items: [
    {
      id: 'pa-1',
      target_metric: 'hrv_ms',
      factor: 'alcohol',
      factor_name: 'Consumo de Álcool',
      window_hours: 24,
      sample_size: 12,
      effect_size: -1.2,
      mean_delta_pct: -28.5,
      correlation: -0.65,
      shrinkage_factor: 0.8,
      confidence: 'high',
      data_coverage_pct: 75.0,
      user_feedback_balance: 2,
      headline: 'Consumo de Álcool associado a redução de 28.5% no HRV',
      evidence_text: 'No seu histórico pessoal (n=12), episódios de consumo de álcool foram acompanhados por redução média de 28.5% no HRV (janela de 24h).',
      metadata: {
        positive_feedback_count: 2,
        negative_feedback_count: 0,
      },
    },
  ],
}

describe('PersonalAssociationsCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders card header and loaded personal associations', async () => {
    requestJsonMock.mockResolvedValueOnce(mockResponse)

    render(<PersonalAssociationsCard />)

    expect(screen.getByText('Padrões Pessoais Aprendidos')).toBeInTheDocument()
    expect(screen.getByText(/N-of-1 Bayesiano/i)).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('Consumo de Álcool')).toBeInTheDocument()
    })

    expect(screen.getByText(/Consumo de Álcool associado a redução de 28.5% no HRV/i)).toBeInTheDocument()
    expect(screen.getByText(/n = 12 observações/i)).toBeInTheDocument()
    expect(screen.getByText(/Janela: 24h/i)).toBeInTheDocument()
    expect(screen.getByText(/Shrinkage Bayesiano: 80%/i)).toBeInTheDocument()
    expect(screen.getByText(/Calibrado \(\+2\)/i)).toBeInTheDocument()
    expect(screen.getByText('Alta confiança')).toBeInTheDocument()
  })

  it('handles empty state when no associations are found', async () => {
    requestJsonMock.mockResolvedValueOnce({ total: 0, items: [] })

    render(<PersonalAssociationsCard />)

    await waitFor(() => {
      expect(screen.getByText(/Nenhuma associação com histórico suficiente/i)).toBeInTheDocument()
    })
  })

  it('triggers recompute when clicking Recalcular button', async () => {
    const user = userEvent.setup()
    requestJsonMock.mockResolvedValueOnce(mockResponse)
    requestJsonMock.mockResolvedValueOnce({ status: 'ok', computed_count: 1, items: [] })
    requestJsonMock.mockResolvedValueOnce(mockResponse)

    render(<PersonalAssociationsCard />)

    await waitFor(() => {
      expect(screen.getByText('Consumo de Álcool')).toBeInTheDocument()
    })

    const recomputeBtn = screen.getByRole('button', { name: /Recalcular/i })
    await user.click(recomputeBtn)

    await waitFor(() => {
      expect(requestJsonMock).toHaveBeenCalledWith(
        '/api/context/associations/recompute',
        expect.objectContaining({ method: 'POST' })
      )
    })
  })

  it('filters by metric when clicking metric pill', async () => {
    const user = userEvent.setup()
    requestJsonMock.mockResolvedValueOnce(mockResponse)
    requestJsonMock.mockResolvedValueOnce({ total: 0, items: [] })

    render(<PersonalAssociationsCard />)

    await waitFor(() => {
      expect(screen.getByText('Consumo de Álcool')).toBeInTheDocument()
    })

    const hrvBtn = screen.getByRole('button', { name: 'HRV' })
    await user.click(hrvBtn)

    await waitFor(() => {
      expect(requestJsonMock).toHaveBeenCalledWith(
        expect.stringContaining('metric=hrv_ms')
      )
    })
  })
})
