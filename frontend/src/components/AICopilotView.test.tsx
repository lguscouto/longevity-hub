import React, { useState } from 'react'
import { render, screen, waitFor, within } from '@testing-library/react'
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
    if (path === '/api/ai/reports/latest') return { status: 'empty', result: null }
    if (path === '/api/ai/reports') return []
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

    renderCopilot()
    await screen.findByRole('status', { name: /envio para ia externa/i })

    await user.click(screen.getByRole('button', { name: /mês \(30d\)/i }))

    const dialog1 = await screen.findByRole('alertdialog')
    expect(within(dialog1).getByText(/OPENAI/)).toBeInTheDocument()
    expect(within(dialog1).getByText(/gpt-4o-mini/)).toBeInTheDocument()
    expect(within(dialog1).getByText(/privacidade mínima/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^cancelar$/i }))
    expect(postedTo('/api/ai/generate-insights')).toBe(false)
  })

  it('does not post chat messages when the user cancels the external AI confirmation', async () => {
    const user = userEvent.setup()
    mockAISettings()

    renderCopilot()
    await user.click(screen.getByRole('button', { name: /conversar com copiloto/i }))
    const input = await screen.findByPlaceholderText(/faça uma pergunta/i)

    await user.type(input, 'Pergunta fake sem dados reais')
    await user.click(screen.getByRole('button', { name: /enviar mensagem ao copiloto/i }))

    const dialog2 = await screen.findByRole('alertdialog')
    expect(within(dialog2).getByText(/OPENAI/)).toBeInTheDocument()
    expect(within(dialog2).getByText(/gpt-4o-mini/)).toBeInTheDocument()
    expect(within(dialog2).getByText(/privacidade mínima/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^cancelar$/i }))
    expect(postedTo('/api/ai/chat')).toBe(false)
    expect(screen.queryByText('Pergunta fake sem dados reais')).not.toBeInTheDocument()
  })

  it('posts chat messages after explicit external AI confirmation', async () => {
    const user = userEvent.setup()
    mockAISettings()

    renderCopilot()
    await user.click(screen.getByRole('button', { name: /conversar com copiloto/i }))
    const input = await screen.findByPlaceholderText(/faça uma pergunta/i)

    await user.type(input, 'Pergunta fake sem dados reais')
    await user.click(screen.getByRole('button', { name: /enviar mensagem ao copiloto/i }))

    expect(await screen.findByRole('alertdialog')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /confirmar envio/i }))

    await waitFor(() => {
      expect(postedTo('/api/ai/chat')).toBe(true)
    })
    const chatCall = requestJsonMock.mock.calls.find(([path, init]) => path === '/api/ai/chat' && init?.method === 'POST')
    expect(JSON.parse(String(chatCall?.[1]?.body))).toEqual({ prompt: 'Pergunta fake sem dados reais' })
  })

  it('sends prompt when clicking contextual quick prompt button like Padrões Encontrados', async () => {
    const user = userEvent.setup()
    mockAISettings()

    renderCopilot()
    await user.click(screen.getByRole('button', { name: /conversar com copiloto/i }))
    const btn = await screen.findByRole('button', { name: /padrões encontrados/i })
    await user.click(btn)

    expect(await screen.findByRole('alertdialog')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /confirmar envio/i }))

    await waitFor(() => {
      expect(postedTo('/api/ai/chat')).toBe(true)
    })
    const chatCall = requestJsonMock.mock.calls.find(([path, init]) => path === '/api/ai/chat' && init?.method === 'POST')
    expect(JSON.parse(String(chatCall?.[1]?.body))).toEqual({
      prompt: 'Quais padrões e correlações pessoais foram detectados no meu histórico?',
    })
  })

  it('renders dynamic progress feedback and allows canceling insight generation', async () => {
    const user = userEvent.setup()
    let resolveInsightsPromise: (val: any) => void = () => {}
    const insightsPromise = new Promise(resolve => {
      resolveInsightsPromise = resolve
    })

    requestJsonMock.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const path = String(input)
      if (path === '/api/ai/settings') {
        return {
          active_provider: 'openrouter',
          selected_model: 'deepseek/deepseek-v4-flash-0731',
          privacy_mode: 'minimal',
          has_openrouter_key: true,
        }
      }
      if (path === '/api/ai/history') return []
      if (path === '/api/ai/reports/latest') return { status: 'empty', result: null }
      if (path === '/api/ai/reports') return []
      if (path === '/api/ai/generate-insights' && init?.method === 'POST') {
        return await insightsPromise
      }
      throw new Error(`Unexpected path: ${path}`)
    })

    renderCopilot()
    await screen.findByRole('status', { name: /envio para ia externa/i })

    const generateBtn = screen.getByRole('button', { name: /mês \(30d\)/i })
    await user.click(generateBtn)

    expect(await screen.findByRole('alertdialog')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /confirmar envio/i }))

    // Progress feedback and timer should be visible
    expect(await screen.findByText(/tempo decorrido:/i)).toBeInTheDocument()
    expect(screen.getByText(/etapa 1 de 4/i)).toBeInTheDocument()

    const cancelBtn = screen.getByRole('button', { name: /cancelar análise/i })
    expect(cancelBtn).toBeInTheDocument()

    await user.click(cancelBtn)

    expect(await screen.findByText(/análise interrompida pelo usuário/i)).toBeInTheDocument()
    resolveInsightsPromise({ result: { summary: 'Ignorado', insights: [] } })
  })

  it('posts weekly 7-day insights with time_window="7d" when clicking Semana (7d)', async () => {
    const user = userEvent.setup()
    mockAISettings()

    renderCopilot()
    await screen.findByRole('status', { name: /envio para ia externa/i })

    const weeklyBtn = screen.getByRole('button', { name: /semana \(7d\)/i })
    await user.click(weeklyBtn)

    expect(await screen.findByRole('alertdialog')).toBeInTheDocument()
    expect(screen.getByText(/média semanal \(últimos 7 dias\)/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /confirmar envio/i }))

    await waitFor(() => {
      expect(postedTo('/api/ai/generate-insights')).toBe(true)
    })
    const postCall = requestJsonMock.mock.calls.find(([path, init]) => path === '/api/ai/generate-insights' && init?.method === 'POST')
    expect(JSON.parse(String(postCall?.[1]?.body))).toEqual({ time_window: '7d' })
  })

  it('posts today 24h insights with time_window="today" when clicking Hoje (24h)', async () => {
    const user = userEvent.setup()
    mockAISettings()

    renderCopilot()
    await screen.findByRole('status', { name: /envio para ia externa/i })

    const todayBtn = screen.getByRole('button', { name: /hoje \(24h\)/i })
    await user.click(todayBtn)

    expect(await screen.findByRole('alertdialog')).toBeInTheDocument()
    expect(screen.getByText(/prontidão de hoje/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /confirmar envio/i }))

    await waitFor(() => {
      expect(postedTo('/api/ai/generate-insights')).toBe(true)
    })
    const postCall = requestJsonMock.mock.calls.find(([path, init]) => path === '/api/ai/generate-insights' && init?.method === 'POST')
    expect(JSON.parse(String(postCall?.[1]?.body))).toEqual({ time_window: 'today' })
  })

  it('loads and renders the saved latest report on mount with metadata badge', async () => {
    requestJsonMock.mockImplementation(async (input: RequestInfo | URL) => {
      const path = String(input)
      if (path === '/api/ai/settings') {
        return {
          active_provider: 'openrouter',
          selected_model: 'deepseek/deepseek-v4-flash-0731',
          privacy_mode: 'minimal',
          has_openrouter_key: true,
        }
      }
      if (path === '/api/ai/history') return []
      if (path === '/api/ai/reports/latest') {
        return {
          id: 42,
          created_at: '2026-09-28T16:00:00Z',
          provider: 'openrouter',
          model: 'deepseek/deepseek-v4-flash-0731',
          privacy_mode: 'minimal',
          summary: 'Paciente com excelente recuperação autonômica',
          result: {
            summary: 'Paciente com excelente recuperação autonômica',
            insights: [
              {
                category: 'sono_hrv',
                headline: 'HRV Noturna Elevada',
                insight_text: 'Média de HRV de 78ms nos últimos 30 dias.',
                actionable_steps: 'Manter a consistência de horário.',
              },
            ],
          },
        }
      }
      if (path === '/api/ai/reports') {
        return [
          {
            id: 42,
            created_at: '2026-09-28T16:00:00Z',
            provider: 'openrouter',
            model: 'deepseek/deepseek-v4-flash-0731',
            privacy_mode: 'minimal',
            summary: 'Paciente com excelente recuperação autonômica',
          },
        ]
      }
      throw new Error(`Unexpected path: ${path}`)
    })

    renderCopilot()

    expect(await screen.findByText('HRV Noturna Elevada')).toBeInTheDocument()
    expect(screen.getByText(/Média de HRV de 78ms/)).toBeInTheDocument()
    expect(screen.getAllByText(/deepseek-v4-flash-0731/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/Histórico de análises \(1\)/i)).toBeInTheDocument()
    expect(screen.queryByText(/nenhuma análise gerada recentemente/i)).not.toBeInTheDocument()
  })

  it('switches between Analisar, Conversar, and Histórico tasks seamlessly', async () => {
    const user = userEvent.setup()
    requestJsonMock.mockImplementation(async (input: RequestInfo | URL) => {
      const path = String(input)
      if (path === '/api/ai/settings') {
        return {
          active_provider: 'openrouter',
          selected_model: 'deepseek/deepseek-v4-flash-0731',
          privacy_mode: 'minimal',
          has_openrouter_key: true,
        }
      }
      if (path === '/api/ai/history') return []
      if (path === '/api/ai/reports/latest') return { status: 'empty', result: null }
      if (path === '/api/ai/reports') {
        return [
          {
            id: 99,
            created_at: '2026-09-30T10:00:00Z',
            provider: 'openrouter',
            model: 'deepseek/deepseek-v4-flash-0731',
            privacy_mode: 'minimal',
            time_window: '7d',
            summary: 'Histórico salvo para teste de alternância',
          },
        ]
      }
      if (path === '/api/ai/reports/99') {
        return {
          id: 99,
          created_at: '2026-09-30T10:00:00Z',
          provider: 'openrouter',
          model: 'deepseek/deepseek-v4-flash-0731',
          privacy_mode: 'minimal',
          time_window: '7d',
          result: {
            summary: 'Histórico salvo para teste de alternância',
            insights: [
              {
                category: 'metabolismo',
                headline: 'Glicemia Estável',
                insight_text: 'Excelente controle pós-prandial.',
                actionable_steps: 'Manter fibras.',
              },
            ],
          },
        }
      }
      throw new Error(`Unexpected path: ${path}`)
    })

    renderCopilot()

    // 1. Initial tab is Analisar Tendências with EmptyState
    expect(await screen.findByRole('heading', { name: /síntese de tendências de saúde/i })).toBeInTheDocument()
    expect(screen.getByText(/nenhuma análise gerada recentemente/i)).toBeInTheDocument()

    // 2. Switch to Conversar com Copiloto
    await user.click(screen.getByRole('button', { name: /conversar com copiloto/i }))
    expect(await screen.findByRole('heading', { name: /conversar com o copiloto/i })).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/faça uma pergunta sobre seus exames/i)).toBeInTheDocument()

    // 3. Switch to Histórico de Análises
    await user.click(screen.getByRole('button', { name: /histórico de análises \(1\)/i }))
    expect(await screen.findByRole('heading', { name: /histórico de análises/i })).toBeInTheDocument()
    expect(screen.getByText(/Histórico salvo para teste de alternância/)).toBeInTheDocument()

    // 4. Click "Visualizar no Painel" on the report
    await user.click(screen.getByRole('button', { name: /visualizar no painel/i }))

    // 5. Switches back to Analisar Tendências and displays the loaded report
    expect(await screen.findByRole('heading', { name: /síntese de tendências de saúde/i })).toBeInTheDocument()
    expect(screen.getByText('Glicemia Estável')).toBeInTheDocument()
    expect(screen.getByText(/Excelente controle pós-prandial/)).toBeInTheDocument()
  })

  it('renders the Data Transparency & Confidence panel (UX-P1-14) distinguishing observed data, models, and correlations', async () => {
    requestJsonMock.mockImplementation(async (input: RequestInfo | URL) => {
      const path = String(input)
      if (path === '/api/ai/settings') {
        return {
          active_provider: 'openrouter',
          selected_model: 'deepseek/deepseek-v4-flash-0731',
          privacy_mode: 'minimal',
          has_openrouter_key: true,
        }
      }
      if (path === '/api/ai/history') return []
      if (path === '/api/ai/reports/latest') {
        return {
          id: 1,
          created_at: '2026-10-01T12:00:00Z',
          provider: 'openrouter',
          model: 'deepseek/deepseek-v4-flash-0731',
          privacy_mode: 'minimal',
          result: {
            summary: 'Síntese de dados com painel de confiança',
            insights: [
              {
                category: 'sono_hrv',
                headline: 'Recuperação Autonômica',
                insight_text: 'HRV e sono bem sincronizados.',
                actionable_steps: 'Dormir cedo.',
              },
            ],
          },
        }
      }
      if (path === '/api/ai/reports') return []
      throw new Error(`Unexpected path: ${path}`)
    })

    renderCopilot()

    expect(await screen.findByText(/Origem e transparência dos dados/i)).toBeInTheDocument()
    expect(screen.getByText(/Dados medidos/i)).toBeInTheDocument()
    expect(screen.getByText(/Modelos e estimativas/i)).toBeInTheDocument()
    expect(screen.getByText(/Tendências e hábitos/i)).toBeInTheDocument()
    expect(screen.getByText(/Dados consolidados/i)).toBeInTheDocument()
    expect(screen.getByText(/14 exames de sangue, 30 noites de sono, 12 treinos analisados/i)).toBeInTheDocument()

    // Assert buttons use clean text without festive emojis
    expect(screen.getByRole('button', { name: /^hoje \(24h\)$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^semana \(7d\)$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^mês \(30d\)$/i })).toBeInTheDocument()
  })
})

