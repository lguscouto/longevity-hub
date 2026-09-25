import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'

import { TimelineDayView } from './TimelineDayView'
import type { TimelineDaySummary } from './types'

describe('TimelineDayView', () => {
  const mockDay: TimelineDaySummary = {
    date_ref: '2026-09-21',
    day_of_week: 'SEG',
    display_date: '21/09',
    events: [
      {
        id: 'cp-event-1',
        timestamp: '2026-09-21T08:00:00Z',
        date_ref: '2026-09-21',
        time_ref: '08:00',
        event_type: 'metric_change',
        category: 'metric',
        title: 'Mudança de Patamar: HRV reduziu 28.5%',
        description: 'HRV manteve-se 28.5% abaixo do baseline prévio por 5 dias consecutivos (de 60 para 42 ms).',
        source: 'derived',
        source_type: 'change_point',
        source_key: 'change_point:2026-09-21:hrv_ms',
        confidence: 'high',
        significance: 'significativa',
        metadata: {
          metric: 'hrv_ms',
          persisted_days: 5,
        },
      },
    ],
    metrics_summary: {
      hrv_ms: 42.0,
      rhr_bpm: 64.0,
      sleep_minutes: 420.0,
      weight_kg: 74.5,
    },
  }

  it('renders Day view header, metric summary pills and change_point event with badge', () => {
    render(<TimelineDayView day={mockDay} />)

    expect(screen.getByText('SEG')).toBeInTheDocument()
    expect(screen.getByText('21/09')).toBeInTheDocument()
    expect(screen.getByText('(2026-09-21)')).toBeInTheDocument()

    // Métricas do dia
    expect(screen.getByText('42 ms')).toBeInTheDocument()
    expect(screen.getByText('64 bpm')).toBeInTheDocument()
    expect(screen.getByText('7h 00m')).toBeInTheDocument()

    // Evento de quebra de patamar
    expect(screen.getByText('Mudança de Patamar: HRV reduziu 28.5%')).toBeInTheDocument()
    expect(screen.getByText('Quebra de Patamar')).toBeInTheDocument()
    expect(screen.getByText('Significativa')).toBeInTheDocument()
    expect(
      screen.getByText(/HRV manteve-se 28.5% abaixo do baseline prévio por 5 dias/i)
    ).toBeInTheDocument()
  })

  it('triggers onExplainMetric when clicking Entender o que antecedeu esta mudança de patamar', async () => {
    const user = userEvent.setup()
    const onExplainMock = vi.fn()

    render(<TimelineDayView day={mockDay} onExplainMetric={onExplainMock} />)

    const explainBtn = screen.getByText('Entender o que antecedeu esta mudança de patamar')
    expect(explainBtn).toBeInTheDocument()

    await user.click(explainBtn)
    expect(onExplainMock).toHaveBeenCalledWith('hrv_ms', '2026-09-21')
  })
})
