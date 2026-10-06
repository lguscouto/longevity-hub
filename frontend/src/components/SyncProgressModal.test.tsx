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

    expect(screen.queryByText('Sincronização concluída')).not.toBeInTheDocument()
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

    expect(screen.queryByText('Sincronizando seus dados...')).not.toBeInTheDocument()

    rerender(
      <SyncProgressModal
        isOpen={true}
        isSyncing={true}
        syncResult={null}
        onClose={() => {}}
      />,
    )

    expect(screen.getByText('Sincronizando seus dados...')).toBeInTheDocument()
  })

  it('renders warning heading and message for 409 conflict results', () => {
    render(
      <SyncProgressModal
        isOpen
        isSyncing={false}
        syncResult={{
          status: 'warning',
          message: 'A sincronização do Zepp já está em andamento. Aguarde a conclusão antes de iniciar outra.',
        }}
        onClose={() => {}}
      />,
    )

    expect(screen.getByText('Sincronização em andamento')).toBeInTheDocument()
    expect(screen.getByText(/já está em andamento/i)).toBeInTheDocument()
    expect(screen.queryByText('Sincronização concluída')).not.toBeInTheDocument()
    expect(screen.queryByText('Não foi possível concluir a sincronização')).not.toBeInTheDocument()
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

    expect(screen.getByText('Sincronização concluída com alguns avisos')).toBeInTheDocument()
    expect(screen.getByText(/32 registros importados · 4 não puderam ser processados/i)).toBeInTheDocument()
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

    expect(screen.getByText('Sua conexão expirou')).toBeInTheDocument()
    const reauthBtn = screen.getByRole('button', { name: /Conectar novamente/i })
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

    expect(screen.getByText('Dados desatualizados')).toBeInTheDocument()

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

    expect(screen.getByText('Fonte de dados desconectada')).toBeInTheDocument()
  })

  it('renders all three sources: Zepp, Google Health, and Hevy', () => {
    render(
      <SyncProgressModal
        isOpen
        isSyncing={false}
        syncResult={{
          status: 'ok',
          zepp_records_imported: 10,
          google_health_records_imported: 5,
          hevy_records_imported: 3,
        }}
        onClose={() => {}}
      />
    )

    expect(screen.getByText(/Zepp \/ Amazfit/i)).toBeInTheDocument()
    expect(screen.getByText('10 registros')).toBeInTheDocument()
    expect(screen.getByText(/Google Health/i)).toBeInTheDocument()
    expect(screen.getByText('5 registros')).toBeInTheDocument()
    expect(screen.getByText(/Hevy/i)).toBeInTheDocument()
    expect(screen.getByText('3 treinos')).toBeInTheDocument()
  })
})

