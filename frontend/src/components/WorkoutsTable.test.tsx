import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'

import { WorkoutsTable } from './WorkoutsTable'
import { requestJson } from '../lib/api'

vi.mock('../lib/api', async () => {
  const actual = await vi.importActual<typeof import('../lib/api')>('../lib/api')
  return {
    ...actual,
    requestJson: vi.fn(),
  }
})

const requestJsonMock = vi.mocked(requestJson)

const mockWorkouts = [
  {
    id: '1787006220',
    workout_date: '2026-08-18',
    workout_time: '15:30',
    category: 'Corrida',
    activity_type: 'Corrida',
    duration_min: 32.5,
    calories: 320,
    distance_km: 5.2,
    avg_hr: 145,
    max_hr: 168,
    training_effect: 32,
    steps: 4200,
    city: 'São Paulo',
    device: 'Amazfit Band 7',
    source: 'Zepp',
  },
  {
    id: '1787006221',
    workout_date: '2026-08-17',
    workout_time: '18:00',
    category: 'Treino Força',
    activity_type: 'Treino Força',
    duration_min: 45.0,
    calories: 250,
    distance_km: 0.0,
    avg_hr: 118,
    max_hr: 142,
    training_effect: 25,
    steps: 1200,
    city: 'Campinas',
    device: 'Amazfit Band 7',
    source: 'Zepp',
  },
]

describe('WorkoutsTable', () => {
  beforeEach(() => {
    requestJsonMock.mockReset()
  })

  it('renders workouts loaded from API', async () => {
    requestJsonMock.mockResolvedValueOnce(mockWorkouts)

    render(<WorkoutsTable />)

    expect(await screen.findByText('Histórico Detalhado de Treinos')).toBeInTheDocument()
    expect(await screen.findByText('São Paulo')).toBeInTheDocument()
    expect(screen.getByText('Campinas')).toBeInTheDocument()
    expect(screen.getByText('5.2 km')).toBeInTheDocument()
    expect(screen.getByText('32.5 min')).toBeInTheDocument()
    expect(screen.getByText('320 kcal')).toBeInTheDocument()
    expect(screen.getByText(/145/)).toBeInTheDocument()
  })

  it('filters workouts by search term in real time', async () => {
    const user = userEvent.setup()
    requestJsonMock.mockResolvedValueOnce(mockWorkouts)

    render(<WorkoutsTable />)

    expect(await screen.findByText('São Paulo')).toBeInTheDocument()
    expect(screen.getByText('Campinas')).toBeInTheDocument()

    const searchInput = screen.getByPlaceholderText(/buscar esporte ou cidade/i)
    await user.type(searchInput, 'Campinas')

    expect(screen.queryByText('São Paulo')).not.toBeInTheDocument()
    expect(screen.getByText('Campinas')).toBeInTheDocument()
  })

  it('shows empty state when no workouts exist', async () => {
    requestJsonMock.mockResolvedValueOnce([])

    render(<WorkoutsTable />)

    expect(await screen.findByText('Nenhuma sessão de treino encontrada.')).toBeInTheDocument()
  })

  it('renders dates formatted in Brazilian standard dd/mm/yyyy', async () => {
    requestJsonMock.mockResolvedValueOnce(mockWorkouts)

    render(<WorkoutsTable />)

    expect(await screen.findByText('18/08/2026')).toBeInTheDocument()
    expect(screen.getByText('17/08/2026')).toBeInTheDocument()
  })

  it('renders Carregar mais button when items count matches limit', async () => {
    requestJsonMock.mockResolvedValueOnce(mockWorkouts)

    render(<WorkoutsTable initialLimit={2} />)

    expect(await screen.findByText('Carregar mais treinos (+50)')).toBeInTheDocument()
  })
})

