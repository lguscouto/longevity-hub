import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { requestJson } from '../lib/api'
import { CheckinEvents } from './CheckinEvents'

vi.mock('../lib/api', () => ({ requestJson: vi.fn() }))

describe('eventos do check-in', () => {
  it('registra sintoma com associação opcional e não envia antes da ação', async () => {
    vi.mocked(requestJson).mockImplementation(async (path, options) => {
      if (path === '/api/interventions') return [{ id: 3, name: 'Rotina sintética' }]
      if (options?.method === 'POST') return { id: 'manual-1' }
      return { items: [] }
    })
    const user = userEvent.setup()
    render(<CheckinEvents selectedDate="2025-01-02" />)
    await user.click(screen.getByRole('button', { name: 'Registrar sintomas e eventos' }))
    await screen.findByRole('option', { name: 'Rotina sintética' })
    await user.type(screen.getByLabelText('Sintoma ou evento'), 'Dor sintética')
    await user.selectOptions(screen.getByLabelText('Intervenção associada'), '3')
    expect(vi.mocked(requestJson).mock.calls.some(([, options]) => options?.method === 'POST')).toBe(false)
    await user.click(screen.getByRole('button', { name: 'Salvar evento' }))
    const call = vi.mocked(requestJson).mock.calls.find(([, options]) => options?.method === 'POST')
    expect(JSON.parse(String(call?.[1]?.body))).toMatchObject({ title: 'Dor sintética', metadata: { intervention_id: 3, severity: 1 } })
  })
})
