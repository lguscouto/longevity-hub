import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

import { PipelineStatusPanel, PipelineRun } from './PipelineStatusPanel'

describe('PipelineStatusPanel', () => {
  it('shows "Nenhuma fonte encontrada" when runs list is empty and not loading', () => {
    render(
      <PipelineStatusPanel
        runs={[]}
        loading={false}
        onRefresh={vi.fn()}
      />,
    )

    expect(screen.getByText('Nenhuma fonte encontrada')).toBeInTheDocument()
    expect(screen.getByText(/Sync Zepp/)).toBeInTheDocument()
  })

  it('shows loading state', () => {
    render(
      <PipelineStatusPanel
        runs={[]}
        loading={true}
        onRefresh={vi.fn()}
      />,
    )

    expect(screen.getByText('Carregando histórico...')).toBeInTheDocument()
  })

  it('renders successful runs with records inserted', () => {
    const runs: PipelineRun[] = [
      { source: 'Zepp', run_at: '2026-07-30T10:00:00', records_inserted: 150, status: 'sucesso', log_summary: 'Importados 150 registros' },
    ]
    render(
      <PipelineStatusPanel
        runs={runs}
        loading={false}
        onRefresh={vi.fn()}
      />,
    )

    expect(screen.getByText(/Zepp/)).toBeInTheDocument()
    expect(screen.getByText('Sucesso')).toBeInTheDocument()
    expect(screen.getByText(/150 recs/)).toBeInTheDocument()
  })

  it('shows "0 registros válidos" for a successful run with zero records', () => {
    const runs: PipelineRun[] = [
      { source: 'Zepp', run_at: '2026-07-30T10:00:00', records_inserted: 0, status: 'sucesso', log_summary: '0 registros novos' },
    ]
    render(
      <PipelineStatusPanel
        runs={runs}
        loading={false}
        onRefresh={vi.fn()}
      />,
    )

    expect(screen.getByText('0 registros válidos')).toBeInTheDocument()
    expect(screen.getByText('Sucesso')).toBeInTheDocument()
  })

  it('shows "Falha" badge and error message for failed runs', () => {
    const runs: PipelineRun[] = [
      { source: 'GoogleFit', run_at: '2026-07-30T10:00:00', records_inserted: 0, status: 'erro', log_summary: 'Arquivo não encontrado' },
    ]
    render(
      <PipelineStatusPanel
        runs={runs}
        loading={false}
        onRefresh={vi.fn()}
      />,
    )

    expect(screen.getByText('Falha')).toBeInTheDocument()
    expect(screen.getByText('Arquivo não encontrado').closest('p')).toBeInTheDocument()
  })

  it('renders multiple runs from different sources', () => {
    const runs: PipelineRun[] = [
      { source: 'Zepp', run_at: '2026-07-30T10:00:00', records_inserted: 100, status: 'sucesso', log_summary: 'Zepp ok' },
      { source: 'GoogleFit', run_at: '2026-07-30T09:00:00', records_inserted: 0, status: 'erro', log_summary: 'Falha na importação' },
    ]
    render(
      <PipelineStatusPanel
        runs={runs}
        loading={false}
        onRefresh={vi.fn()}
      />,
    )

    expect(screen.getByText('Sucesso')).toBeInTheDocument()
    expect(screen.getByText('Falha')).toBeInTheDocument()
    expect(screen.getByText(/100 recs/)).toBeInTheDocument()
  })
})
