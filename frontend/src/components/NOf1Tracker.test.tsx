import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { NOf1Tracker } from './NOf1Tracker'

describe('experimentos pessoais', () => {
  it('mostra lacunas e evita estatísticas fictícias quando não há dados', () => {
    render(<NOf1Tracker experiments={[{ id: 1, title: 'Teste sintético', hypothesis: 'Observar sono', metric_key: 'hrv_ms',
      control_start: '2025-01-01', control_end: '2025-01-03', treatment_start: '2025-01-04', treatment_end: '2025-01-06',
      control_observations: 1, control_missing: 2, treatment_observations: 0, treatment_missing: 3,
      adherence: '2 dias', simultaneous_changes: 'Rotina' }]} onCreateExperiment={vi.fn()} />)
    expect(screen.getByText('Dados insuficientes')).toBeVisible()
    expect(screen.getByText(/observações: 1 · dias sem dados até hoje: 2/)).toBeVisible()
    expect(screen.getByText(/Aderência informada: 2 dias · Mudanças simultâneas: Rotina/)).toBeVisible()
    expect(screen.getByText(/Estatísticas exploratórias não demonstram causalidade/)).toBeVisible()
  })
})
