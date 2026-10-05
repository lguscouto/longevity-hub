import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React, { Suspense } from 'react'

import App from './App'
import { ThemeProvider } from './context/ThemeContext'
import { ApiError, requestJson } from './lib/api'

vi.mock('./lib/api', async () => {
  const actual = await vi.importActual<typeof import('./lib/api')>('./lib/api')
  return {
    ...actual,
    requestJson: vi.fn(),
  }
})

const requestJsonMock = vi.mocked(requestJson)

function renderApp() {
  return render(
    <ThemeProvider>
      <Suspense fallback={<div>loading...</div>}>
        <App />
      </Suspense>
    </ThemeProvider>,
  )
}

describe('App', () => {
  beforeEach(() => {
    localStorage.clear()
    window.location.hash = ''
    try {
      history.replaceState(null, '', ' ')
    } catch {
      // ignore
    }
    requestJsonMock.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const path = String(input)

      if (path.startsWith('/api/metrics?')) return []
      if (path === '/api/labs') return []
      if (path === '/api/supplements') return []
      if (path.startsWith('/api/supplements/logs/')) return []
      if (path === '/api/supplements/audit-logs') return []
      if (path === '/api/ai/settings') return { active_provider: 'openrouter', selected_model: 'deepseek/deepseek-v4-flash-0731', privacy_mode: 'minimal' }
      if (path === '/api/ai/history') return []
      if (path === '/api/phenoage/history') return []
      if (path === '/api/kdm/latest') return { status: 'incomplete', missing_biomarkers: ['rhr_bpm'] }
      if (path === '/api/n-of-1') return []
      if (path === '/api/cgm/summary') return []
      if (path === '/api/profile') {
        return {
          name: 'Paciente Longevidade',
          chronological_age: 40,
          height_cm: 170,
          current_weight_kg: 72.5,
          target_weight_kg: 75,
        }
      }
      if (path.startsWith('/api/compliance/history')) return []
      if (path === '/api/metrics/sync/zepp' && init?.method === 'POST') {
        return {
          status: 'ok',
          zepp_records_imported: 0,
          google_health_records_imported: 0,
          total_sources: 0,
        }
      }
      if (path === '/api/metrics' && init?.method === 'POST') {
        throw new ApiError(400, 'Não foi possível salvar o registro.')
      }
      return {}
    })
  })

  afterEach(() => {
    requestJsonMock.mockReset()
  })

  it('does not show canned clinical fallback numbers when there are no metrics', async () => {
    renderApp()

    await waitFor(() => {
      expect(requestJsonMock).toHaveBeenCalled()
    })

    expect(screen.queryByText('4.100')).not.toBeInTheDocument()
    expect(screen.queryByText('68 bpm')).not.toBeInTheDocument()
    expect(screen.queryByText('30 ms')).not.toBeInTheDocument()
    expect(screen.queryByText(/4h\s*30m/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/41\.08/)).not.toBeInTheDocument()
    expect(await screen.findByText('Ainda não há dados para este dia')).toBeInTheDocument()
    expect(screen.getAllByText('Sem dados para a data').length).toBeGreaterThan(0)
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(6)
  })

  it('renders backend KDM incomplete status instead of a local estimate', async () => {
    renderApp()

    await waitFor(() => {
      expect(requestJsonMock).toHaveBeenCalledWith('/api/kdm/latest')
    })

    expect(await screen.findByText(/KDM indisponível/i)).toBeInTheDocument()
    expect(await screen.findByText(/Frequência cardíaca de repouso/i)).toBeInTheDocument()
    expect(screen.queryByText(/40\.5\s*yrs/i)).not.toBeInTheDocument()
  })

  it('posts manual metrics to /api/metrics and keeps the modal open on error', async () => {
    const user = userEvent.setup()
    renderApp()

    await waitFor(() => {
      expect(requestJsonMock).toHaveBeenCalled()
    })

    await user.click(screen.getByRole('button', { name: 'Registrar medição manual' }))

    // Wait for lazy-loaded ManualEntryModal to resolve
    const dialog = await screen.findByRole('dialog', { name: /registrar medição/i })

    await user.clear(screen.getByLabelText('Data da medição'))
    await user.type(screen.getByLabelText('Data da medição'), '2026-07-29')
    await user.clear(screen.getByLabelText('Peso (kg)'))
    await user.type(screen.getByLabelText('Peso (kg)'), '72.5')

    await user.click(screen.getByRole('button', { name: /salvar registro/i }))

    await waitFor(() => {
      expect(requestJsonMock).toHaveBeenCalledWith(
        '/api/metrics',
        expect.objectContaining({
          method: 'POST',
        }),
      )
    })

    expect(requestJsonMock.mock.calls.some(([url]) => url === '/api/metrics/manual')).toBe(false)
    expect(screen.getByRole('dialog', { name: /registrar medição/i })).toBe(dialog)
    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível salvar o registro.')
  })

  it('switches between tabs successfully without breaking or showing black screen', async () => {
    const user = userEvent.setup()
    renderApp()

    await waitFor(() => {
      expect(requestJsonMock).toHaveBeenCalled()
    })

    // Click 'Saúde' tab (which activates labs / Exames e PhenoAge)
    await user.click(screen.getByRole('button', { name: /^saúde$/i }))
    expect(await screen.findByText(/exames laboratoriais e referências/i)).toBeInTheDocument()

    // Click 'Intervenções' tab (which activates supplements)
    await user.click(screen.getByRole('button', { name: /^intervenções$/i }))
    expect(await screen.findByRole('heading', { name: /suplementos e rotina/i })).toBeInTheDocument()

    // Click 'IA e Copiloto' tab
    await user.click(screen.getByRole('button', { name: /ia e copiloto/i }))
    expect(await screen.findByText(/copiloto de longevidade/i)).toBeInTheDocument()

    // Click 'Experimentos pessoais' sub-tab under Intervenções
    await user.click(screen.getByRole('button', { name: /^intervenções$/i }))
    await user.click(screen.getByRole('button', { name: /experimentos pessoais/i }))
    expect(await screen.findByText(/experimentos pessoais/i)).toBeInTheDocument()

    // Click 'Perfil' tab
    await user.click(screen.getByRole('button', { name: /perfil/i }))
    expect(await screen.findByText(/perfil do longevidade hub/i)).toBeInTheDocument()
  })

  it('keeps a pending check-in autosave alive when navigating away from overview', async () => {
    renderApp()

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Energia nível 3' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Energia nível 3' }))
    fireEvent.click(screen.getByRole('button', { name: /^saúde$/i }))

    await waitFor(() => {
      expect(requestJsonMock).toHaveBeenCalledWith(
        expect.stringMatching(/^\/api\/checkins\//),
        expect.objectContaining({ method: 'PUT' }),
      )
    }, { timeout: 1500 })
  })

  it('persists selected tab across refresh via localStorage', async () => {
    localStorage.setItem('longevidade_active_tab', 'supplements')
    renderApp()

    await waitFor(() => {
      expect(requestJsonMock).toHaveBeenCalled()
    })

    expect(await screen.findByRole('heading', { name: /suplementos e rotina/i }, { timeout: 5000 })).toBeInTheDocument()
  })

  it('navigates to Perfil sub-tabs (Integrações and Diagnóstico & Sistema) seamlessly', async () => {
    const user = userEvent.setup()
    renderApp()

    await waitFor(() => {
      expect(requestJsonMock).toHaveBeenCalled()
    })

    // Navega para Perfil
    await user.click(screen.getByRole('button', { name: /^perfil$/i }))
    expect(await screen.findByText(/perfil do longevidade hub/i)).toBeInTheDocument()

    // Clica na sub-aba Integrações (presente na sub-barra e no seletor interno)
    const integracoesBtns = screen.getAllByRole('button', { name: /^integrações$/i })
    await user.click(integracoesBtns[0])
    expect(await screen.findByText(/fontes de dados e dispositivos conectados/i)).toBeInTheDocument()
    expect(screen.getByText(/zepp os \(amazfit\)/i)).toBeInTheDocument()
    expect(screen.getAllByText(/google health/i).length).toBeGreaterThan(0)

    // Clica na sub-aba Diagnóstico e Sistema
    const sistemaBtns = screen.getAllByRole('button', { name: /diagnóstico e sistema/i })
    await user.click(sistemaBtns[0])
    expect(await screen.findByRole('heading', { name: /armazenamento local/i })).toBeInTheDocument()
  })

  it('supports direct deep link for #integrations and #system', async () => {
    window.location.hash = '#integrations'
    renderApp()

    await waitFor(() => {
      expect(requestJsonMock).toHaveBeenCalled()
    })

    expect(await screen.findByText(/fontes de dados e dispositivos conectados/i)).toBeInTheDocument()
  })

  it('allows expanding and collapsing Análises in Overview', async () => {
    const user = userEvent.setup()
    renderApp()

    await waitFor(() => {
      expect(requestJsonMock).toHaveBeenCalled()
    })

    const toggleBtn = screen.getByRole('button', { name: /exibir detalhes de análises/i })
    expect(toggleBtn).toBeInTheDocument()
    expect(toggleBtn).toHaveAttribute('aria-expanded', 'false')

    await user.click(toggleBtn)
    expect(toggleBtn).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('button', { name: /ocultar detalhes de análises/i })).toBeInTheDocument()
  })
})
