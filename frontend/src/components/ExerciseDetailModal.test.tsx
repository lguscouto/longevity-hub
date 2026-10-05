import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ExerciseDetailModal } from './ExerciseDetailModal'

const mockMedia = {
  catalog_id: 'ex-bench-01',
  name: 'Barbell Bench Press',
  target_pt: 'Peitoral Maior',
  body_part_pt: 'Peito',
  equipment_pt: 'Barra Olímpica',
  secondary_muscles: ['Tríceps', 'Deltóide Anterior'],
  gif_url: 'https://cdn.example.com/bench_press.gif',
  instructions: {
    es: ['Acuéstese en el banco.', 'Baje la barra lentamente hacia el pecho.'],
    en: ['Lie flat on the bench.', 'Lower the bar slowly to your chest.'],
  },
}

describe('ExerciseDetailModal (UX_UI_56)', () => {
  it('does not render when isOpen is false', () => {
    const { container } = render(
      <ExerciseDetailModal
        isOpen={false}
        onClose={vi.fn()}
        exerciseTitle="Supino Reto"
        media={mockMedia}
      />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders modal with exercise title and details when isOpen is true', () => {
    render(
      <ExerciseDetailModal
        isOpen={true}
        onClose={vi.fn()}
        exerciseTitle="Supino Reto"
        media={mockMedia}
      />
    )

    expect(screen.getByText('Supino Reto')).toBeInTheDocument()
    expect(screen.getByText(/Foco Muscular: Peitoral Maior/i)).toBeInTheDocument()
    expect(screen.getByText(/Região: Peito/i)).toBeInTheDocument()
    expect(screen.getByText(/Equipamento: Barra Olímpica/i)).toBeInTheDocument()
    expect(screen.getByText(/Secundários: Tríceps, Deltóide Anterior/i)).toBeInTheDocument()
  })

  it('provides media playback controls (Play/Pause, Reiniciar) with accessible attributes (U22-P1-63)', () => {
    render(
      <ExerciseDetailModal
        isOpen={true}
        onClose={vi.fn()}
        exerciseTitle="Supino Reto"
        media={mockMedia}
      />
    )

    // The media control toolbar
    const pauseBtn = screen.getByRole('button', {
      name: /Pausar animação do exercício Supino Reto/i,
    })
    expect(pauseBtn).toBeInTheDocument()
    expect(pauseBtn).toHaveAttribute('aria-pressed', 'false')

    // Initial status
    expect(screen.getByRole('status')).toHaveTextContent('Reproduzindo')

    // Toggle pause
    fireEvent.click(pauseBtn)
    expect(pauseBtn).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('status')).toHaveTextContent('Pausado')

    // Toggle back to play
    const playBtn = screen.getByRole('button', {
      name: /Reproduzir animação do exercício Supino Reto/i,
    })
    fireEvent.click(playBtn)
    expect(playBtn).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('status')).toHaveTextContent('Reproduzindo')

    // Restart button
    const restartBtn = screen.getByRole('button', {
      name: /Reiniciar animação do exercício Supino Reto/i,
    })
    expect(restartBtn).toBeInTheDocument()
    fireEvent.click(restartBtn)
    expect(screen.getByRole('status')).toHaveTextContent('Reproduzindo')
  })

  it('allows switching execution instructions language between Spanish and English', () => {
    render(
      <ExerciseDetailModal
        isOpen={true}
        onClose={vi.fn()}
        exerciseTitle="Supino Reto"
        media={mockMedia}
      />
    )

    // Default is 'es'
    expect(screen.getByText('Acuéstese en el banco.')).toBeInTheDocument()

    // Switch to English
    fireEvent.click(screen.getByRole('button', { name: 'Inglês' }))
    expect(screen.getByText('Lie flat on the bench.')).toBeInTheDocument()
  })

  it('shows empty demonstration placeholder when media is null', () => {
    render(
      <ExerciseDetailModal
        isOpen={true}
        onClose={vi.fn()}
        exerciseTitle="Exercício Customizado"
        media={null}
      />
    )

    expect(
      screen.getByText('Ainda não há uma demonstração visual para este exercício.')
    ).toBeInTheDocument()
  })
})
