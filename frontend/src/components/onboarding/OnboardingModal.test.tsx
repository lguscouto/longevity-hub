import React from 'react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { OnboardingModal } from './OnboardingModal'
import { requestJson } from '../../lib/api'
import { ProfileData } from '../profile/ProfileTypes'

vi.mock('../../lib/api', () => ({
  requestJson: vi.fn(),
  ApiError: class ApiError extends Error {
    status?: number
    constructor(message: string, status?: number) {
      super(message)
      this.status = status
    }
  },
}))

const requestJsonMock = vi.mocked(requestJson)

const mockProfile: ProfileData = {
  name: 'Paciente',
  chronological_age: 40,
  height_cm: 170,
  current_weight_kg: 72,
  target_weight_kg: 70,
  onboarding_completed: false,
}

describe('OnboardingModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    requestJsonMock.mockImplementation((url: string | URL | Request) => {
      const u = String(url)
      if (u.includes('/api/zepp/status')) {
        return Promise.resolve({ configured: false, user_id: null, masked_app_token: null })
      }
      if (u.includes('/api/workouts/hevy/status')) {
        return Promise.resolve({ connected: false, has_api_key: false, masked_api_key: null })
      }
      if (u.includes('/api/google-health/status')) {
        return Promise.resolve({ connected: false })
      }
      if (u.includes('/api/ai/settings')) {
        return Promise.resolve({
          active_provider: 'openrouter',
          selected_model: 'deepseek/deepseek-v4-flash-0731',
          privacy_mode: 'minimal',
        })
      }
      if (u.includes('/api/profile/onboarding-complete')) {
        return Promise.resolve({ status: 'ok' })
      }
      if (u.includes('/api/profile')) {
        return Promise.resolve({ status: 'ok' })
      }
      return Promise.resolve({})
    })
  })

  it('renders step 1 with personal fields by default when open', async () => {
    render(
      <OnboardingModal
        isOpen={true}
        onClose={vi.fn()}
        profile={mockProfile}
        onComplete={vi.fn()}
      />
    )

    expect(screen.getByText('Bem-vindo ao Longevidade Hub')).toBeInTheDocument()
    expect(screen.getByText('Dados Pessoais e Parâmetros Clínicos')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Ex: Carlos')).toBeInTheDocument()
    expect(screen.getByText('Próximo')).toBeInTheDocument()
    expect(screen.getByText('Pular por enquanto')).toBeInTheDocument()
  })

  it('navigates between steps forward and backward', async () => {
    const user = userEvent.setup()
    render(
      <OnboardingModal
        isOpen={true}
        onClose={vi.fn()}
        profile={mockProfile}
        onComplete={vi.fn()}
      />
    )

    // Passo 1 -> Passo 2 (Provedores)
    await user.click(screen.getByRole('button', { name: /Próximo/i }))
    expect(screen.getByText('Provedores de Saúde e Dispositivos Suportados')).toBeInTheDocument()
    expect(screen.getByText('Zepp OS (Amazfit)')).toBeInTheDocument()
    expect(screen.getByText('Hevy (Musculação & Carga)')).toBeInTheDocument()

    // Passo 2 -> Passo 3 (IA)
    await user.click(screen.getByRole('button', { name: /Próximo/i }))
    expect(screen.getByText('Copiloto Clínico de Longevidade por IA')).toBeInTheDocument()
    expect(screen.getByText('OpenRouter')).toBeInTheDocument()

    // Passo 3 -> Passo 4 (Resumo)
    await user.click(screen.getByRole('button', { name: /Próximo/i }))
    expect(screen.getByText('Resumo da Configuração Inicial')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Concluir e Começar/i })).toBeInTheDocument()

    // Passo 4 -> Voltar para Passo 3
    await user.click(screen.getByRole('button', { name: /Voltar/i }))
    expect(screen.getByText('Copiloto Clínico de Longevidade por IA')).toBeInTheDocument()
  })

  it('allows clicking "Pular por enquanto" to finalize onboarding without blocking', async () => {
    const user = userEvent.setup()
    const handleClose = vi.fn()
    const handleComplete = vi.fn()

    render(
      <OnboardingModal
        isOpen={true}
        onClose={handleClose}
        profile={mockProfile}
        onComplete={handleComplete}
      />
    )

    await user.click(screen.getByRole('button', { name: /Pular por enquanto/i }))

    await waitFor(() => {
      expect(requestJsonMock).toHaveBeenCalledWith(
        '/api/profile/onboarding-complete',
        expect.objectContaining({ method: 'POST' })
      )
      expect(handleComplete).toHaveBeenCalledWith(
        expect.objectContaining({ onboarding_completed: true }),
        false
      )
      expect(handleClose).toHaveBeenCalled()
    })
  })

  it('submits profile and finishes onboarding successfully on step 4', async () => {
    const user = userEvent.setup()
    const handleClose = vi.fn()
    const handleComplete = vi.fn()

    render(
      <OnboardingModal
        isOpen={true}
        onClose={handleClose}
        profile={mockProfile}
        onComplete={handleComplete}
      />
    )

    // Preenche nome
    const nameInput = screen.getByPlaceholderText('Ex: Carlos')
    await user.clear(nameInput)
    await user.type(nameInput, 'Carlos Longevidade')

    // Avança até o passo 4
    await user.click(screen.getByRole('button', { name: /Próximo/i }))
    await user.click(screen.getByRole('button', { name: /Próximo/i }))
    await user.click(screen.getByRole('button', { name: /Próximo/i }))

    expect(screen.getByText('Carlos Longevidade')).toBeInTheDocument()

    // Clica em Concluir
    await user.click(screen.getByRole('button', { name: /Concluir e Começar/i }))

    await waitFor(() => {
      expect(requestJsonMock).toHaveBeenCalledWith(
        '/api/profile',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"name":"Carlos Longevidade"'),
        })
      )
      expect(handleComplete).toHaveBeenCalled()
      expect(handleClose).toHaveBeenCalled()
    })
  })
})
