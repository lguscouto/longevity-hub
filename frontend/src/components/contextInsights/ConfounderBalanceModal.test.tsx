import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'

import { ConfounderBalanceModal } from './ConfounderBalanceModal'
import { requestJson } from '../../lib/api'
import type { ConfounderReport } from './types'

vi.mock('../../lib/api', async () => {
  const actual = await vi.importActual<typeof import('../../lib/api')>('../../lib/api')
  return {
    ...actual,
    requestJson: vi.fn(),
  }
})

const requestJsonMock = vi.mocked(requestJson)

const mockSevereReport: ConfounderReport = {
  experiment_id: 1,
  control_period: {
    start: '2026-08-01',
    end: '2026-08-14',
    days: 14,
  },
  treatment_period: {
    start: '2026-08-15',
    end: '2026-08-28',
    days: 14,
  },
  has_severe_confounding: true,
  imbalanced_factors_count: 2,
  warning_summary:
    'Resultado com possível confundidor: durante o período com a intervenção, foram observadas variações expressivas em covariáveis exógenas (consumo de álcool (-40.0%) e volume de treino (+28.0%)). A melhora ou alteração nas métricas não pode ser atribuída exclusivamente ao protocolo testado.',
  disclaimer:
    'Aviso Metodológico (N-of-1): Associação temporal não confirma causalidade isolada. Fatores exógenos não controlados podem mascarar os efeitos.',
  covariates: [
    {
      key: 'alcohol_frequency',
      name: 'Consumo de Álcool (frequência de dias)',
      category: 'substance',
      control_mean: 35.7,
      treatment_mean: 0.0,
      unit: '%',
      delta_pct: -100.0,
      standardized_diff: -0.92,
      is_imbalanced: true,
      detail_text: '5d de 14d no controle vs 0d de 14d na intervenção',
    },
    {
      key: 'workout_volume_daily',
      name: 'Volume de Treino (carga total média diária)',
      category: 'exercise',
      control_mean: 1200,
      treatment_mean: 1650,
      unit: 'kg/dia',
      delta_pct: 37.5,
      standardized_diff: 0.45,
      is_imbalanced: true,
      detail_text: '1200 kg/dia vs 1650 kg/dia',
    },
    {
      key: 'weekend_ratio',
      name: 'Proporção de Fins de Semana (Sex/Sáb/Dom)',
      category: 'routine',
      control_mean: 42.9,
      treatment_mean: 42.9,
      unit: '%',
      delta_pct: 0.0,
      standardized_diff: 0.0,
      is_imbalanced: false,
      detail_text: '42.9% dos dias no controle vs 42.9% na intervenção',
    },
  ],
}

const mockBalancedReport: ConfounderReport = {
  experiment_id: 2,
  control_period: {
    start: '2026-07-01',
    end: '2026-07-14',
    days: 14,
  },
  treatment_period: {
    start: '2026-07-15',
    end: '2026-07-28',
    days: 14,
  },
  has_severe_confounding: false,
  imbalanced_factors_count: 0,
  warning_summary:
    'Covariáveis balanceadas: não foram detectadas distorções exógenas expressivas (álcool, treino, rotina de fim de semana e suplementação concomitante) entre os períodos comparados.',
  disclaimer:
    'Aviso Metodológico (N-of-1): Associação temporal não confirma causalidade isolada.',
  covariates: [
    {
      key: 'alcohol_frequency',
      name: 'Consumo de Álcool (frequência de dias)',
      category: 'substance',
      control_mean: 14.3,
      treatment_mean: 14.3,
      unit: '%',
      delta_pct: 0.0,
      standardized_diff: 0.0,
      is_imbalanced: false,
      detail_text: '2d de 14d no controle vs 2d de 14d na intervenção',
    },
  ],
}

describe('ConfounderBalanceModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does not render when isOpen is false', () => {
    render(<ConfounderBalanceModal isOpen={false} onClose={vi.fn()} />)
    expect(screen.queryByText('Balanço de Confundidores & Covariáveis')).not.toBeInTheDocument()
  })

  it('renders severe confounding alert and imbalanced covariate rows', async () => {
    requestJsonMock.mockResolvedValueOnce(mockSevereReport)

    render(
      <ConfounderBalanceModal
        isOpen={true}
        onClose={vi.fn()}
        experimentId={1}
        experimentTitle="Teste Magnésio Treonato"
      />
    )

    expect(screen.getByText('Balanço de Confundidores & Covariáveis')).toBeInTheDocument()
    expect(screen.getByText('Teste Magnésio Treonato')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText(/Possível Confundidor Detectado/i)).toBeInTheDocument()
      expect(screen.getByText(/consumo de álcool \(-40\.0%\)/i)).toBeInTheDocument()
    })

    // Verifica badges de desequilíbrio e balanceado
    expect(screen.getAllByText('Desequilibrado').length).toBe(2)
    expect(screen.getByText('Balanceado')).toBeInTheDocument()

    // Verifica salvaguarda clínica
    expect(screen.getByText(/Princípio Clínico: Associação Temporal ≠ Causalidade/i)).toBeInTheDocument()
  })

  it('renders balanced state when has_severe_confounding is false', async () => {
    render(
      <ConfounderBalanceModal
        isOpen={true}
        onClose={vi.fn()}
        initialData={mockBalancedReport}
      />
    )

    expect(screen.getByText(/Covariáveis Balanceadas \(Baixo Risco de Viés\)/i)).toBeInTheDocument()
    expect(screen.getByText('Balanceado')).toBeInTheDocument()
  })

  it('triggers onClose when close button is clicked', async () => {
    const user = userEvent.setup()
    const handleClose = vi.fn()

    render(
      <ConfounderBalanceModal
        isOpen={true}
        onClose={handleClose}
        initialData={mockBalancedReport}
      />
    )

    const closeBtn = screen.getByRole('button', { name: 'Fechar' })
    await user.click(closeBtn)

    expect(handleClose).toHaveBeenCalledTimes(1)
  })
})
