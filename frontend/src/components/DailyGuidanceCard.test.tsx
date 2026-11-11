import React from 'react'
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DailyGuidanceCard } from './DailyGuidanceCard'
import { requestJson } from '../lib/api'

vi.mock('../lib/api', () => ({ requestJson: vi.fn() }))

describe('DailyGuidanceCard', () => {
  beforeEach(() => vi.mocked(requestJson).mockReset())

  it('shows an error instead of treating a failed request as missing data', async () => {
    vi.mocked(requestJson).mockRejectedValueOnce(new Error('offline'))
    render(<DailyGuidanceCard selectedDate="2026-11-11" />)
    expect(await screen.findByText(/Não foi possível carregar a orientação diária/)).toBeInTheDocument()
  })

  it('translates unavailable and omits a missing factor percentage', async () => {
    vi.mocked(requestJson).mockResolvedValueOnce({ state: 'insufficient_data', confidence: 'unavailable', label: 'unavailable', factors: [{ label: 'Sono', impact: 'neutral' }], limitations: [] })
    render(<DailyGuidanceCard selectedDate="2026-11-11" />)
    expect(await screen.findByRole('heading', { name: 'Dados insuficientes' })).toBeInTheDocument()
    expect(screen.getByText('Sono')).toBeInTheDocument()
    expect(screen.queryByText(/undefined%/)).not.toBeInTheDocument()
  })
})
