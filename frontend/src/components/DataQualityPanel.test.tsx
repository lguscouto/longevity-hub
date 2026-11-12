import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DataQualityPanel } from './DataQualityPanel'
import { requestJson } from '../lib/api'

vi.mock('../lib/api', () => ({ requestJson: vi.fn() }))

describe('DataQualityPanel', () => {
  it('identifies the quality-record source and its limitation', async () => {
    vi.mocked(requestJson).mockResolvedValueOnce({ confidence: 'low', metrics_available: 1, metrics_expected: 7, warnings: [], sources: ['Zepp'], items: [{ metric_key: 'steps', source: 'Zepp' }] })
    render(<DataQualityPanel />)
    fireEvent.click(await screen.findByText('Fontes registradas por indicador'))
    expect(screen.getByText(/Passos: Zepp.*Observado em: não informado/)).toBeInTheDocument()
    expect(screen.getByText(/proveniência histórica e a última alteração do valor podem estar incompletas/)).toBeInTheDocument()
    expect(screen.getByText('Indisponível')).toBeInTheDocument()
  })
})
