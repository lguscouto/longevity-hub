import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'

import { InsightDrawer } from './InsightDrawer'
import { requestJson } from '../../lib/api'

vi.mock('../../lib/api', async () => {
  const actual = await vi.importActual<typeof import('../../lib/api')>('../../lib/api')
  return {
    ...actual,
    requestJson: vi.fn(),
  }
})

const requestJsonMock = vi.mocked(requestJson)

const mockExplanation = {
  metric: 'hrv_ms',
  metric_name: 'HRV (VFC)',
  unit: 'ms',
  target_date: '2026-09-24',
  observed_value: 38.0,
  baseline_value: 58.0,
  delta_absolute: -20.0,
  delta_percent: -34.5,
  robust_z_score: -2.8,
  significance: 'significativa',
  analysis_confidence: 'alta',
  data_coverage_days: 28,
  total_baseline_days: 30,
  factors: [
    {
      factor_key: 'alcohol',
      factor_name: 'Consumo de Álcool',
      strength: 'forte',
      strength_score: 0.85,
      summary: '2 doses de álcool registradas na noite anterior.',
      window_hours: 24,
      event_id: 'ev-alcohol-1',
      event_title: 'Consumo de álcool: 2 doses',
      event_timestamp: '2026-09-23T22:30:00Z',
      personal_evidence: 'Histórico pessoal (n=4): redução média de 30% no HRV após consumo.',
      personal_stats: {
        sample_size: 4,
        mean_delta_pct: -30.0,
        shrinkage_factor: 0.27,
        confidence: 'low',
      },
      details: {},
    },
  ],
  summary_headline: 'HRV (VFC) apresentou queda de 34.5% em relação ao baseline pessoal de 30 dias.',
  structured_explanation: 'A principal associação identificada foi Consumo de Álcool (forte).',
  disclaimer: 'Associação temporal não implica causalidade definitiva.',
  provenance: {
    engine_version: '1.0.0',
    timestamp: '2026-09-25T11:00:00Z',
    baseline_method: 'median_mad',
  },
}

describe('InsightDrawer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <InsightDrawer
        isOpen={false}
        onClose={vi.fn()}
        metric="hrv_ms"
        date="2026-09-24"
      />
    )
    expect(container.firstChild).toBeNull()
  })

  it('fetches and displays context explanation with factors and baseline metrics', async () => {
    requestJsonMock.mockResolvedValueOnce(mockExplanation)

    render(
      <InsightDrawer
        isOpen={true}
        onClose={vi.fn()}
        metric="hrv_ms"
        date="2026-09-24"
      />
    )

    // Verifica loading inicial
    expect(screen.getByText(/Processando baseline e fatores associados/i)).toBeInTheDocument()

    // Aguarda dados renderizarem
    await waitFor(() => {
      expect(screen.getByText('HRV (VFC) — Entender Mudança')).toBeInTheDocument()
    })

    // Valores observados e baseline
    expect(screen.getByText('38')).toBeInTheDocument()
    expect(screen.getByText(/58 ms/i)).toBeInTheDocument()
    expect(screen.getByText('-34.5%')).toBeInTheDocument()
    expect(screen.getByText(/Z-Score: -2.8/i)).toBeInTheDocument()

    // Fatores associados
    expect(screen.getByText('Consumo de Álcool')).toBeInTheDocument()
    expect(screen.getByText('Associação forte')).toBeInTheDocument()
    expect(screen.getByText(/2 doses de álcool registradas/i)).toBeInTheDocument()

    // Evidência pessoal individual (Fase 3)
    expect(screen.getByText(/Histórico pessoal \(n=4\): redução média de 30%/i)).toBeInTheDocument()
    expect(screen.getByText(/n = 4 \(calibrado\)/i)).toBeInTheDocument()

    // Confiança e cobertura
    expect(screen.getByText('Alta')).toBeInTheDocument()
    expect(screen.getByText('28 de 30 dias')).toBeInTheDocument()

    // Salvaguarda
    expect(screen.getByText(/Associação temporal não implica causalidade/i)).toBeInTheDocument()
  })

  it('submits feedback when user clicks Parece correto button', async () => {
    const user = userEvent.setup()
    requestJsonMock.mockResolvedValueOnce(mockExplanation)
    requestJsonMock.mockResolvedValueOnce({ status: 'ok', feedback_id: 'fb-123' })

    render(
      <InsightDrawer
        isOpen={true}
        onClose={vi.fn()}
        metric="hrv_ms"
        date="2026-09-24"
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Parece correto')).toBeInTheDocument()
    })

    const thumbsUpBtn = screen.getByText('Parece correto')
    await user.click(thumbsUpBtn)

    await waitFor(() => {
      expect(screen.getByText(/Obrigado! Feedback registrado/i)).toBeInTheDocument()
    })

    expect(requestJsonMock).toHaveBeenCalledWith(
      '/api/context/feedback',
      expect.objectContaining({
        method: 'POST',
      })
    )
  })

  it('triggers AI synthesis when clicking Aprofundar com Copiloto IA', async () => {
    const user = userEvent.setup()
    requestJsonMock.mockResolvedValueOnce(mockExplanation)
    requestJsonMock.mockResolvedValueOnce({
      text: 'A análise sugere que a ingesta de 2 doses de álcool reduziu sua recuperação vagal noturna.',
      is_ai_generated: true,
      provider: 'openai',
      model: 'gpt-4o',
    })

    render(
      <InsightDrawer
        isOpen={true}
        onClose={vi.fn()}
        metric="hrv_ms"
        date="2026-09-24"
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Aprofundar com Copiloto IA')).toBeInTheDocument()
    })

    const aiButton = screen.getByText('Aprofundar com Copiloto IA')
    await user.click(aiButton)

    await waitFor(() => {
      expect(
        screen.getByText(/A análise sugere que a ingesta de 2 doses de álcool/i)
      ).toBeInTheDocument()
    })
  })

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup()
    requestJsonMock.mockResolvedValueOnce(mockExplanation)
    const onCloseMock = vi.fn()

    render(
      <InsightDrawer
        isOpen={true}
        onClose={onCloseMock}
        metric="hrv_ms"
        date="2026-09-24"
      />
    )

    await waitFor(() => {
      expect(screen.getByText('HRV (VFC) — Entender Mudança')).toBeInTheDocument()
    })

    const closeBtn = screen.getByRole('button', { name: '' }) // X button
    await user.click(closeBtn)

    expect(onCloseMock).toHaveBeenCalledTimes(1)
  })
})
