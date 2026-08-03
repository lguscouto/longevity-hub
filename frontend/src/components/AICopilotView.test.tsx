import React, { useState } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { AICopilotView } from './AICopilotView'
import { requestJson } from '../lib/api'

vi.mock('../lib/api', async () => {
  const actual = await vi.importActual<typeof import('../lib/api')>('../lib/api')
  return {
    ...actual,
    requestJson: vi.fn(),
  }
})

const requestJsonMock = vi.mocked(requestJson)

function renderCopilot() {
  const onOpenSettings = vi.fn()

  function Harness() {
    const [messages, setMessages] = useState<Array<{ sender: 'user' | 'ai'; text: string; time: string }>>([
      { sender: 'ai', text: 'Olá, teste.', time: '09:00' },
    ])

    return <AICopilotView onOpenSettings={onOpenSettings} chatMessages={messages} setChatMessages={setMessages} />
  }

  render(<Harness />)
  return { onOpenSettings }
}

function mockAISettings(settings: Record<string, unknown> = {}) {
  requestJsonMock.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
    const path = String(input)
    if (path === '/api/ai/settings') {
      return {
        active_provider: 'openai',
        selected_model: 'gpt-4o-mini',
        privacy_mode: 'minimal',
        has_openai_key: true,
        has_anthropic_key: false,
        has_openrouter_key: false,
        ...settings,
      }
    }
    if (path === '/api/ai/history') return []
    if (path === '/api/ai/generate-insights' && init?.method === 'POST') {
      return { result: { summary: 'Resumo fake de teste', insights: [] } }
    }
    if (path === '/api/ai/chat' && init?.method === 'POST') {
      return { reply: 'Resposta fake de teste' }
    }
    throw new Error(`Unexpected request in test: ${path}`)
  })
}

function postedTo(path: string) {
  return requestJsonMock.mock.calls.some(([url, init]) => String(url) === path && init?.method === 'POST')
}

describe('AICopilotView external AI privacy consent', () => {
  afterEach(() => {
    requestJsonMock.mockReset()
  })

  it('shows a compact external AI notice with provider, model, and privacy mode', async () => {
    mockAISettings({ active_provider: 'anthropic', selected_model: 'claude-3-5-sonnet-20241022', privacy_mode: 'full', has_anthropic_key: true })

    renderCopilot()

    const notice = await screen.findByRole('status', { name: /envio para ia externa/i })
    expect(notice).toHaveTextContent(/ANTHROPIC/)
    expect(notice).toHaveTextContent(/claude-3-5-sonnet-20241022/)
    expect(notice).toHaveTextContent(/privacidade completa/i)
  })

  it('does not post 30-day insights when the user cancels the external AI confirmation', async () => {
    const user = userEvent.setup()
    mockAISettings()
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)

    renderCopilot()
    await screen.findByRole('status', { name: /envio para ia externa/i })

    await user.click(screen.getByRole('button', { name: /analisar saúde 30 dias/i }))

    expect(confirmSpy).toHaveBeenCalledWith(expect.stringContaining('OPENAI'))
    expect(confirmSpy).toHaveBeenCalledWith(expect.stringContaining('gpt-4o-mini'))
    expect(confirmSpy).toHaveBeenCalledWith(expect.stringContaining('privacidade mínima'))
    expect(postedTo('/api/ai/generate-insights')).toBe(false)
  })

  it('does not post chat messages when the user cancels the external AI confirmation', async () => {
    const user = userEvent.setup()
    mockAISettings()
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)

    renderCopilot()
    const input = await screen.findByPlaceholderText(/faça uma pergunta/i)

    await user.type(input, 'Pergunta fake sem dados reais')
    await user.click(screen.getByRole('button', { name: /enviar mensagem ao copiloto/i }))

    expect(confirmSpy).toHaveBeenCalledWith(expect.stringContaining('OPENAI'))
    expect(confirmSpy).toHaveBeenCalledWith(expect.stringContaining('gpt-4o-mini'))
    expect(confirmSpy).toHaveBeenCalledWith(expect.stringContaining('privacidade mínima'))
    expect(postedTo('/api/ai/chat')).toBe(false)
    expect(screen.queryByText('Pergunta fake sem dados reais')).not.toBeInTheDocument()
  })

  it('posts chat messages after explicit external AI confirmation', async () => {
    const user = userEvent.setup()
    mockAISettings()
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)

    renderCopilot()
    const input = await screen.findByPlaceholderText(/faça uma pergunta/i)

    await user.type(input, 'Pergunta fake sem dados reais')
    await user.click(screen.getByRole('button', { name: /enviar mensagem ao copiloto/i }))

    await waitFor(() => {
      expect(postedTo('/api/ai/chat')).toBe(true)
    })
    expect(confirmSpy).toHaveBeenCalled()
    const chatCall = requestJsonMock.mock.calls.find(([path, init]) => path === '/api/ai/chat' && init?.method === 'POST')
    expect(JSON.parse(String(chatCall?.[1]?.body))).toEqual({ prompt: 'Pergunta fake sem dados reais' })
  })
})
