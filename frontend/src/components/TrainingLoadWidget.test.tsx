import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TrainingLoadWidget } from './TrainingLoadWidget'

describe('TrainingLoadWidget (UX_UI_56)', () => {
  it('renders compact informative empty state instead of null when no data is provided (U22-P1-62)', () => {
    const { container } = render(
      <TrainingLoadWidget
        dailyLoad={null}
        rollingLoad={null}
        optimalMin={null}
        optimalMax={null}
        workoutCount={0}
      />
    )

    // Must not be empty
    expect(container.firstChild).not.toBeNull()
    expect(screen.getByText('Carga de treino e recuperação')).toBeInTheDocument()
    expect(
      screen.getByText('Ainda não temos dados de carga cardiovascular')
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Sincronize seu relógio/i)
    ).toBeInTheDocument()
  })

  it('renders load data and calculates Faixa Ótima status badge when load is within bounds', () => {
    render(
      <TrainingLoadWidget
        dailyLoad={42}
        rollingLoad={180}
        optimalMin={150}
        optimalMax={250}
        workoutCount={4}
        workoutDurationMin={185}
      />
    )

    expect(screen.getByText('42')).toBeInTheDocument()
    expect(screen.getByText('180')).toBeInTheDocument()
    expect(screen.getByText('150 - 250')).toBeInTheDocument()
    expect(screen.getByText(/4 treinos \(185m\)/i)).toBeInTheDocument()
    expect(screen.getByTitle(/Sua carga está dentro da faixa estimada/i)).toBeInTheDocument()
  })

  it('displays Abaixo da Faixa when rolling load is less than optimalMin', () => {
    render(
      <TrainingLoadWidget
        dailyLoad={10}
        rollingLoad={80}
        optimalMin={150}
        optimalMax={250}
        workoutCount={1}
        workoutDurationMin={30}
      />
    )

    expect(screen.getByText('Abaixo da Faixa')).toBeInTheDocument()
  })

  it('displays Sobrecarga Aguda when rolling load exceeds optimalMax', () => {
    render(
      <TrainingLoadWidget
        dailyLoad={95}
        rollingLoad={320}
        optimalMin={150}
        optimalMax={250}
        workoutCount={6}
        workoutDurationMin={310}
      />
    )

    expect(screen.getByText('Sobrecarga Aguda')).toBeInTheDocument()
  })

  it('toggles model reference explanation on user click (U22-P1-61)', () => {
    render(
      <TrainingLoadWidget
        dailyLoad={50}
        rollingLoad={200}
        optimalMin={150}
        optimalMax={250}
        workoutCount={3}
      />
    )

    const toggleBtn = screen.getByRole('button', {
      name: /Entenda o modelo e a referência de carga de treino/i,
    })
    expect(toggleBtn).toHaveAttribute('aria-expanded', 'false')

    // Click to expand
    fireEvent.click(toggleBtn)
    expect(toggleBtn).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText(/O que representa:/i)).toBeInTheDocument()
    expect(screen.getByText(/Janela Temporal:/i)).toBeInTheDocument()
    expect(screen.getByText(/Modelo Fisiológico:/i)).toBeInTheDocument()
    expect(screen.getByText(/Tipo de Referência:/i)).toBeInTheDocument()
    expect(screen.getByText(/Banister TRIMP \/ Firstbeat/i)).toBeInTheDocument()

    // Click to collapse
    fireEvent.click(toggleBtn)
    expect(toggleBtn).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText(/O que representa:/i)).not.toBeInTheDocument()
  })
})
