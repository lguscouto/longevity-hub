import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'

import { TimelineView } from './TimelineView'
import { requestJson } from '../../lib/api'

vi.mock('../../lib/api', async () => {
  const actual = await vi.importActual<typeof import('../../lib/api')>('../../lib/api')
  return {
    ...actual,
    requestJson: vi.fn(),
  }
})

const requestJsonMock = vi.mocked(requestJson)

const mockFeed = {
  total: 2,
  items: [
    {
      id: 'ev-1',
      timestamp: '2026-09-24T18:30:00Z',
      date_ref: '2026-09-24',
      time_ref: '18:30',
      event_type: 'workout',
      category: 'exercise',
      title: 'Treino: Musculação - Superiores',
      description: '45 min • 320 kcal • Volume: 2500 kg',
      source: 'hevy',
      source_type: 'workout',
      confidence: 'high',
      significance: 'notável',
      metadata: {},
    },
    {
      id: 'ev-2',
      timestamp: '2026-09-24T22:00:00Z',
      date_ref: '2026-09-24',
      time_ref: '22:00',
      event_type: 'alcohol',
      category: 'lifestyle',
      title: 'Consumo de álcool: 2 doses',
      description: 'Vinho tinto • 2 doses',
      source: 'manual',
      source_type: 'manual_entry',
      confidence: 'high',
      significance: 'notável',
      metadata: {},
    },
  ],
  days: [
    {
      date_ref: '2026-09-24',
      day_of_week: 'QUI',
      display_date: '24/09',
      events: [
        {
          id: 'ev-1',
          timestamp: '2026-09-24T18:30:00Z',
          date_ref: '2026-09-24',
          time_ref: '18:30',
          event_type: 'workout',
          category: 'exercise',
          title: 'Treino: Musculação - Superiores',
          description: '45 min • 320 kcal • Volume: 2500 kg',
          source: 'hevy',
          source_type: 'workout',
          confidence: 'high',
          significance: 'notável',
          metadata: {},
        },
        {
          id: 'ev-2',
          timestamp: '2026-09-24T22:00:00Z',
          date_ref: '2026-09-24',
          time_ref: '22:00',
          event_type: 'alcohol',
          category: 'lifestyle',
          title: 'Consumo de álcool: 2 doses',
          description: 'Vinho tinto • 2 doses',
          source: 'manual',
          source_type: 'manual_entry',
          confidence: 'high',
          significance: 'notável',
          metadata: {},
        },
      ],
      metrics_summary: {
        sleep_minutes: 450,
        hrv_ms: 55,
        rhr_bpm: 58,
        steps: 8500,
        weight_kg: 74.2,
      },
    },
  ],
}

const mockWeeks = [
  {
    week_start: '2026-09-21',
    week_end: '2026-09-27',
    title: '21–27 Setembro',
    avg_sleep_min: 440,
    avg_sleep_formatted: '7h 20m',
    hrv_delta_pct: 2.5,
    rhr_delta_bpm: 57.5,
    training_load_delta_pct: 12.0,
    workout_count: 4,
    key_events: [],
  },
]

describe('TimelineView', () => {
  beforeEach(() => {
    requestJsonMock.mockReset()
    requestJsonMock.mockImplementation((url: RequestInfo | URL) => {
      const urlStr = String(url)
      if (urlStr.includes('/api/timeline/summary/weekly')) {
        return Promise.resolve(mockWeeks as any)
      }
      if (urlStr.includes('/api/timeline/summary/monthly')) {
        return Promise.resolve([] as any)
      }
      if (urlStr.includes('/api/timeline/timezone')) {
        return Promise.resolve({ timezone: 'America/Sao_Paulo' } as any)
      }
      return Promise.resolve(mockFeed as any)
    })
  })

  it('renders Timeline header and Day view events', async () => {
    render(<TimelineView />)

    expect(screen.getByText('Linha do Tempo')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Adicionar Evento/i })).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('Treino: Musculação - Superiores')).toBeInTheDocument()
      expect(screen.getByText('Consumo de álcool: 2 doses')).toBeInTheDocument()
      expect(screen.getByText('QUI')).toBeInTheDocument()
    })
  })

  it('switches zoom to Semana and displays weekly cards', async () => {
    const user = userEvent.setup()
    render(<TimelineView />)

    const weekBtn = screen.getByRole('button', { name: 'Semana' })
    await user.click(weekBtn)

    await waitFor(() => {
      expect(screen.getByText('21–27 Setembro')).toBeInTheDocument()
      expect(screen.getByText('7h 20m')).toBeInTheDocument()
    })
  })

  it('opens and closes Add Event modal', async () => {
    const user = userEvent.setup()
    render(<TimelineView />)

    const addBtn = screen.getByRole('button', { name: /Adicionar Evento/i })
    await user.click(addBtn)

    expect(screen.getByText('Adicionar Evento de Contexto')).toBeInTheDocument()
    expect(screen.getByText('Selecione o Tipo de Evento')).toBeInTheDocument()

    const cancelBtn = screen.getByRole('button', { name: 'Cancelar' })
    await user.click(cancelBtn)

    expect(screen.queryByText('Adicionar Evento de Contexto')).not.toBeInTheDocument()
  })
})
