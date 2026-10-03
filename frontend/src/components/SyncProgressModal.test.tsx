import { describe, expect, it, vi } from 'vitest'
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

  it('renders partial success with counters and disclosure details', () => {
    render(
      <SyncProgressModal
        isOpen
        isSyncing={false}
        syncResult={{
          status: 'partial',
          zepp_records_imported: 32,
          unprocessable_records: 4,
          warnings: ['4 registros de sono com carimbo anterior a 2020 foram ignorados'],
        }}
        onClose={() => {}}
      />
    )

    expect(screen.getByText('Sincronização Parcial')).toBeInTheDocument()
    expect(screen.getByText(/32 importados · 4 não processados/i)).toBeInTheDocument()
    expect(screen.getByText(/Ver detalhes/i)).toBeInTheDocument()
    expect(
      screen.getByText(/4 registros de sono com carimbo anterior a 2020 foram ignorados/i)
    ).toBeInTheDocument()
  })

  it('renders expired token state with reauthentication button', () => {
    const onReauth = vi.fn()
    render(
      <SyncProgressModal
        isOpen
        isSyncing={false}
        syncResult={{
          status: 'expired',
          message: 'Token expirado na API Google Health.',
        }}
        onReauthenticate={onReauth}
        onClose={() => {}}
      />
    )

    expect(screen.getByText('Token de Acesso Expirado')).toBeInTheDocument()
    const reauthBtn = screen.getByRole('button', { name: /Reautenticar Fonte/i })
    expect(reauthBtn).toBeInTheDocument()
  })

  it('renders stale data and disconnected states accurately', () => {
    const { rerender } = render(
      <SyncProgressModal
        isOpen
        isSyncing={false}
        syncResult={{
          status: 'stale',
          message: 'Última sincronização há 48 horas.',
        }}
        onClose={() => {}}
      />
    )

    expect(screen.getByText('Dados Desatualizados (>24h)')).toBeInTheDocument()

    rerender(
      <SyncProgressModal
        isOpen
        isSyncing={false}
        syncResult={{
          status: 'disconnected',
          message: 'Nenhuma fonte de wearable pareada.',
        }}
        onClose={() => {}}
      />
    )

    expect(screen.getByText('Fonte de Wearable Desconectada')).toBeInTheDocument()
  })
})

