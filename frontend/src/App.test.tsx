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
      if (path === '/api/ai/settings') return { active_provider: 'openrouter', selected_model: 'deepseek/deepseek-v4-pro', privacy_mode: 'minimal' }
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
          google_fit_records_imported: 0,
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
    expect(await screen.findByText('Sem dados disponíveis para a data selecionada.')).toBeInTheDocument()
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

    await user.click(screen.getByRole('button', { name: /registrar/i }))

    // Wait for lazy-loaded ManualEntryModal to resolve
    const dialog = await screen.findByRole('dialog', { name: /registrar métrica manual/i })

    await user.clear(screen.getByLabelText('Data de Referência'))
    await user.type(screen.getByLabelText('Data de Referência'), '2026-07-29')
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
    expect(screen.getByRole('dialog', { name: /registrar métrica manual/i })).toBe(dialog)
    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível salvar o registro.')
  })

  it('switches between tabs successfully without breaking or showing black screen', async () => {
    const user = userEvent.setup()
    renderApp()

    await waitFor(() => {
      expect(requestJsonMock).toHaveBeenCalled()
    })

    // Click 'Exames & PhenoAge' tab
    await user.click(screen.getByRole('button', { name: /exames & phenoage/i }))
    expect(await screen.findByText(/exames laboratoriais & alvos de longevidade/i)).toBeInTheDocument()

    // Click 'Suplementos & Hormônios' tab
    await user.click(screen.getByRole('button', { name: /suplementos & hormônios/i }))
    expect(await screen.findByText(/módulo de longevidade médica/i)).toBeInTheDocument()

    // Click 'IA & Copiloto' tab
    await user.click(screen.getByRole('button', { name: /ia & copiloto/i }))
    expect(await screen.findByText(/inteligência médica de precisão/i)).toBeInTheDocument()

    // Click 'N-of-1 Tests' tab
    await user.click(screen.getByRole('button', { name: /n-of-1 tests/i }))
    expect(await screen.findByText(/experimentos n-of-1/i)).toBeInTheDocument()

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
    fireEvent.click(screen.getByRole('button', { name: /exames & phenoage/i }))

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

    expect(await screen.findByText(/módulo de longevidade médica/i, {}, { timeout: 5000 })).toBeInTheDocument()
  })
})
