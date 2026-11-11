import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { OwnerAccess } from './OwnerAccess'
import { requestJson } from '../lib/api'

vi.mock('../App', () => ({ default: () => <div>Painel renderizado</div> }))
vi.mock('../lib/api', () => ({ requestJson: vi.fn() }))

describe('OwnerAccess', () => {
  beforeEach(() => {
    window.location.hash = ''
    vi.mocked(requestJson).mockReset()
  })
  afterEach(() => vi.useRealTimers())

  it('requires owner login before rendering the main panel', async () => {
    vi.mocked(requestJson).mockRejectedValueOnce(new Error('not authenticated')).mockResolvedValueOnce({ authenticated: true })
    render(<OwnerAccess />)
    expect(await screen.findByLabelText('Senha')).toBeInTheDocument()
    expect(screen.queryByText('Painel renderizado')).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'senha-de-teste' } })
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))
    expect(await screen.findByText('Painel renderizado')).toBeInTheDocument()
  })

  it('permits the separate trainer entry without an owner session', async () => {
    window.location.hash = '#personal'
    vi.mocked(requestJson).mockRejectedValue(new Error('not authenticated'))
    render(<OwnerAccess />)
    expect(await screen.findByText('Painel renderizado')).toBeInTheDocument()
    expect(screen.queryByLabelText('Senha')).not.toBeInTheDocument()
  })

  it('hides the panel when a previously valid session expires', async () => {
    vi.useFakeTimers()
    vi.mocked(requestJson).mockResolvedValueOnce({ authenticated: true }).mockRejectedValue(new Error('expired'))
    render(<OwnerAccess />)
    await act(async () => { await Promise.resolve() })
    expect(screen.getByText('Painel renderizado')).toBeInTheDocument()
    await act(async () => { vi.advanceTimersByTime(60_000); await Promise.resolve() })
    expect(screen.queryByText('Painel renderizado')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Senha')).toBeInTheDocument()
  })
})
