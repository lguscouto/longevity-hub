import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { Drawer } from './Drawer'

describe('Drawer Primitive', () => {
  it('does not render when isOpen is false', () => {
    render(
      <Drawer isOpen={false} onClose={() => {}} title="Gaveta Fechada">
        <p>Conteúdo invisível</p>
      </Drawer>
    )

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByText('Conteúdo invisível')).not.toBeInTheDocument()
  })

  it('renders in document.body with role="dialog" and aria-modal="true"', () => {
    render(
      <Drawer isOpen={true} onClose={() => {}} title="Gaveta Aberta">
        <p>Conteúdo lateral</p>
      </Drawer>
    )

    const dialog = screen.getByRole('dialog')
    expect(dialog).toBeInTheDocument()
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(screen.getByText('Conteúdo lateral')).toBeInTheDocument()
  })

  it('connects title and description via ARIA attributes', () => {
    render(
      <Drawer
        isOpen={true}
        onClose={() => {}}
        title="Título Lateral"
        description="Descrição lateral explicativa"
      >
        <p>Corpo</p>
      </Drawer>
    )

    const dialog = screen.getByRole('dialog')
    const titleElement = screen.getByText('Título Lateral')
    const descElement = screen.getByText('Descrição lateral explicativa')

    expect(dialog).toHaveAttribute('aria-labelledby', titleElement.id)
    expect(dialog).toHaveAttribute('aria-describedby', descElement.id)
  })

  it('calls onClose when clicking close button', () => {
    const handleClose = vi.fn()
    render(
      <Drawer isOpen={true} onClose={handleClose} title="Gaveta com Fechar">
        <p>Corpo</p>
      </Drawer>
    )

    const closeBtn = screen.getByRole('button', { name: /fechar painel lateral/i })
    expect(closeBtn).toBeInTheDocument()

    fireEvent.click(closeBtn)
    expect(handleClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when clicking backdrop', () => {
    const handleClose = vi.fn()
    render(
      <Drawer isOpen={true} onClose={handleClose} title="Gaveta Backdrop">
        <p>Corpo</p>
      </Drawer>
    )

    const backdrop = screen.getByTestId('drawer-backdrop')
    fireEvent.click(backdrop)
    expect(handleClose).toHaveBeenCalledTimes(1)
  })
})
