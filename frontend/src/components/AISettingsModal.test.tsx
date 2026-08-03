import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { AISettingsModal } from './AISettingsModal'
import { ThemeProvider } from '../context/ThemeContext'
import { requestJson } from '../lib/api'

vi.mock('../lib/api', async () => {
  const actual = await vi.importActual<typeof import('../lib/api')>('../lib/api')
  return {
    ...actual,
    requestJson: vi.fn(),
  }
})

const requestJsonMock = vi.mocked(requestJson)

function renderModal(props: React.ComponentProps<typeof AISettingsModal>) {
  return render(
    <ThemeProvider>
      <AISettingsModal {...props} />
    </ThemeProvider>,
  )
}

describe('AISettingsModal privacy and key-vault settings', () => {
  afterEach(() => {
    requestJsonMock.mockReset()
  })

  it('loads the saved privacy mode, labels configured keys as Windows vault entries, and posts privacy_mode on save', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    const onRefreshSettings = vi.fn()

    requestJsonMock.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const path = String(input)
      if (path === '/api/ai/settings' && init?.method === 'POST') return { status: 'ok' }
      if (path === '/api/ai/settings') {
        return {
          active_provider: 'openrouter',
          selected_model: 'deepseek/deepseek-v4-pro',
          privacy_mode: 'full',
          has_openrouter_key: true,
          openrouter_api_key_masked: 'FAKE_MASKED_OPENROUTER_KEY_FOR_TESTS',
        }
      }
      throw new Error(`Unexpected request in test: ${path}`)
    })

    renderModal({ isOpen: true, onClose, onRefreshSettings })

    const privacySelect = await screen.findByRole('combobox', { name: /modo de privacidade/i })
    expect(privacySelect).toHaveValue('full')
    expect(screen.getByText(/Cofre do Windows/i)).toBeInTheDocument()
    expect(screen.queryByText(/Salva no Banco/i)).not.toBeInTheDocument()

    await user.selectOptions(privacySelect, 'minimal')
    await user.click(screen.getByRole('button', { name: /salvar configurações/i }))

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled()
    })

    const postCall = requestJsonMock.mock.calls.find(
      ([path, init]) => path === '/api/ai/settings' && init?.method === 'POST',
    )
    expect(postCall).toBeDefined()
    const body = JSON.parse(String(postCall?.[1]?.body))
    expect(body).toMatchObject({
      active_provider: 'openrouter',
      selected_model: 'deepseek/deepseek-v4-pro',
      privacy_mode: 'minimal',
      openrouter_api_key: 'FAKE_MASKED_OPENROUTER_KEY_FOR_TESTS',
    })
  })

  it('defaults to minimal privacy and warns when the full context mode is selected', async () => {
    const user = userEvent.setup()

    requestJsonMock.mockImplementation(async (input: RequestInfo | URL) => {
      const path = String(input)
      if (path === '/api/ai/settings') {
        return {
          active_provider: 'openai',
          selected_model: 'gpt-4o-mini',
          has_openai_key: false,
        }
      }
      throw new Error(`Unexpected request in test: ${path}`)
    })

    renderModal({ isOpen: true, onClose: vi.fn() })

    const privacySelect = await screen.findByRole('combobox', { name: /modo de privacidade/i })
    expect(privacySelect).toHaveValue('minimal')
    expect(screen.getByText(/não envia nome, nascimento ou histórico completo/i)).toBeInTheDocument()

    await user.selectOptions(privacySelect, 'full')

    expect(screen.getByRole('alert')).toHaveTextContent(/modo completo/i)
    expect(screen.getByRole('alert')).toHaveTextContent(/opt-in/i)
  })

  it('renders Aparência section and switches theme immediately when clicking Claro or Escuro', async () => {
    const user = userEvent.setup()

    requestJsonMock.mockImplementation(async (input: RequestInfo | URL) => {
      const path = String(input)
      if (path === '/api/ai/settings') {
        return { active_provider: 'openrouter', selected_model: 'deepseek/deepseek-v4-pro' }
      }
      throw new Error(`Unexpected request in test: ${path}`)
    })

    renderModal({ isOpen: true, onClose: vi.fn() })

    expect(await screen.findByText('Aparência')).toBeInTheDocument()
    expect(screen.getByText(/Escolha o tema visual utilizado pelo Longevidade Hub/i)).toBeInTheDocument()

    const lightBtn = screen.getByRole('radio', { name: /Claro/i })
    const darkBtn = screen.getByRole('radio', { name: /Escuro/i })

    expect(darkBtn).toHaveAttribute('aria-checked', 'true')
    expect(lightBtn).toHaveAttribute('aria-checked', 'false')

    await user.click(lightBtn)

    expect(lightBtn).toHaveAttribute('aria-checked', 'true')
    expect(darkBtn).toHaveAttribute('aria-checked', 'false')
    expect(document.documentElement.classList.contains('light')).toBe(true)
  })
})
