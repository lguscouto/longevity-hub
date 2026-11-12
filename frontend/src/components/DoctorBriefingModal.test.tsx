import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { requestJson } from '../lib/api'
import { DoctorBriefingModal } from './DoctorBriefingModal'

vi.mock('../lib/api', () => ({ requestJson: vi.fn() }))

describe('DoctorBriefingModal', () => {
  it('usa os exames e eventos selecionados na prévia', async () => {
    vi.mocked(requestJson).mockResolvedValueOnce({ labs: [{ id: 3, metric_name: 'ApoB', collected_at: '2026-01-01', record_origin: 'patient_lab' }], events: [{ id: 'event-1', date_ref: '2026-01-02', title: 'Sintoma', source: 'manual' }] })
      .mockResolvedValueOnce({ markdown: 'Resumo da seleção' })
    render(<DoctorBriefingModal isOpen onClose={vi.fn()} markdownContent="Resumo original" />)
    await userEvent.click(screen.getByLabelText('Selecionar exames e eventos para o resumo'))
    await userEvent.click(await screen.findByLabelText(/2026-01-01 — ApoB/))
    await userEvent.click(screen.getByLabelText(/2026-01-02 — Sintoma/))
    await userEvent.click(screen.getByRole('button', { name: 'Atualizar prévia selecionada' }))
    expect(await screen.findByText('Resumo da seleção')).toBeVisible()
    const call = vi.mocked(requestJson).mock.calls.find(([path]) => path === '/api/reports/doctor-briefing')
    expect(JSON.parse(String(call?.[1]?.body))).toEqual({ questions: [], selected_lab_ids: [3], selected_event_ids: ['event-1'] })
  })
})
