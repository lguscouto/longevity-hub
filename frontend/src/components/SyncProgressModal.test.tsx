import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'

import { SyncProgressModal } from './SyncProgressModal'

describe('SyncProgressModal', () => {
  it('does not show the success heading for error sync results', () => {
    render(
      <SyncProgressModal
        isOpen
        isSyncing={false}
        syncResult={{ status: 'error', message: 'Falha de sincronização' } as any}
        onClose={() => {}}
      />,
    )

    expect(screen.queryByText('Sincronização Concluída!')).not.toBeInTheDocument()
    expect(screen.getByText(/falha de sincronização/i)).toBeInTheDocument()
  })

  it('handles opening from closed state without hook order errors', () => {
    const { rerender } = render(
      <SyncProgressModal
        isOpen={false}
        isSyncing={false}
        syncResult={null}
        onClose={() => {}}
      />,
    )

    expect(screen.queryByText('Sincronizando Fontes de Longevidade...')).not.toBeInTheDocument()

    rerender(
      <SyncProgressModal
        isOpen={true}
        isSyncing={true}
        syncResult={null}
        onClose={() => {}}
      />,
    )

    expect(screen.getByText('Sincronizando Fontes de Longevidade...')).toBeInTheDocument()
  })

  it('renders warning heading and message for 409 conflict results', () => {
    render(
      <SyncProgressModal
        isOpen
        isSyncing={false}
        syncResult={{
          status: 'warning',
          message: 'Sincronização com a nuvem Zepp já está em andamento. Aguarde a conclusão da sincronização atual.',
        }}
        onClose={() => {}}
      />,
    )

    expect(screen.getByText('Sincronização em Andamento')).toBeInTheDocument()
    expect(screen.getByText(/já está em andamento/i)).toBeInTheDocument()
    expect(screen.queryByText('Sincronização Concluída!')).not.toBeInTheDocument()
    expect(screen.queryByText('Sincronização com erro')).not.toBeInTheDocument()
  })
})

