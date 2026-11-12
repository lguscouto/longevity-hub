import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { EnergyCircadianWidget } from './EnergyCircadianWidget'
import { requestJson } from '../lib/api'

vi.mock('../lib/api', () => ({ requestJson: vi.fn() }))

describe('EnergyCircadianWidget', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.mocked(requestJson).mockResolvedValue({
      date_ref: '2026-11-11',
      energy_bank: { status: 'not_verifiable', current_level: 60, recharge: 70, drain: 50, recommendation: 'Dados parciais', missing_components: ['steps'] },
      circadian: { wake_time: '07:00', wake_time_source: 'padrão', target_bedtime: '23:00', target_bedtime_source: 'padrão', morning_sun_window: '07:00 às 07:45', caffeine_cutoff_time: '13:00', wind_down_start_time: '21:00', recommendation: 'Horários estimados.' },
    })
  })

  it('identifica horários padrão e permite ocultar o índice', async () => {
    render(<EnergyCircadianWidget selectedDate="2026-11-11" />)
    expect(await screen.findByText(/Despertar: 07:00 \(padrão\)/)).toBeVisible()
    expect(screen.getByText(/não validada clinicamente/)).toBeVisible()
    expect(screen.getByText('60/100')).toBeVisible()
    await userEvent.click(screen.getByRole('button', { name: 'Ocultar índice' }))
    expect(screen.queryByText('60/100')).not.toBeInTheDocument()
    expect(localStorage.getItem('longevity-show-energy-index')).toBe('false')
  })

  it('não interrompe a página quando a resposta está incompleta', async () => {
    vi.mocked(requestJson).mockResolvedValueOnce({})
    render(<EnergyCircadianWidget selectedDate="2026-11-11" />)
    expect(await screen.findByText(/Despertar: — \(não informado\)/)).toBeVisible()
    expect(screen.getByText(/Índice indisponível/)).toBeVisible()
  })
})
