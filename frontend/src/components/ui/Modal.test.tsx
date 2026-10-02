import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { Modal } from './Modal'

describe('Modal Primitive', () => {
  it('does not render when isOpen is false', () => {
    render(
      <Modal isOpen={false} onClose={() => {}} title="Teste Fechado">
        <p>Conteúdo invisível</p>
      </Modal>
    )

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByText('Conteúdo invisível')).not.toBeInTheDocument()
  })

  it('renders in document.body with role="dialog" and aria-modal="true"', () => {
    render(
      <Modal isOpen={true} onClose={() => {}} title="Título do Diálogo">
        <p>Conteúdo visível</p>
      </Modal>
    )

    const dialog = screen.getByRole('dialog')
    expect(dialog).toBeInTheDocument()
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(screen.getByText('Conteúdo visível')).toBeInTheDocument()
  })

  it('connects title and description via ARIA attributes', () => {
    render(
      <Modal
        isOpen={true}
        onClose={() => {}}
        title="Título de Teste"
        description="Descrição explicativa do teste"
      >
        <p>Corpo</p>
      </Modal>
    )

    const dialog = screen.getByRole('dialog')
    const titleElement = screen.getByText('Título de Teste')
    const descElement = screen.getByText('Descrição explicativa do teste')

    expect(dialog).toHaveAttribute('aria-labelledby', titleElement.id)
    expect(dialog).toHaveAttribute('aria-describedby', descElement.id)
  })

  it('calls onClose when clicking close button', () => {
    const handleClose = vi.fn()
    render(
      <Modal isOpen={true} onClose={handleClose} title="Diálogo com Fechar">
        <p>Corpo</p>
      </Modal>
    )

    const closeBtn = screen.getByRole('button', { name: /fechar diálogo/i })
    expect(closeBtn).toBeInTheDocument()

    fireEvent.click(closeBtn)
    expect(handleClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when clicking backdrop', () => {
    const handleClose = vi.fn()
    render(
      <Modal isOpen={true} onClose={handleClose} title="Diálogo Backdrop">
        <p>Corpo</p>
      </Modal>
    )

    const backdrop = screen.getByTestId('modal-backdrop')
    fireEvent.click(backdrop)
    expect(handleClose).toHaveBeenCalledTimes(1)
  })

  it('does not call onClose when clicking modal content', () => {
    const handleClose = vi.fn()
    render(
      <Modal isOpen={true} onClose={handleClose} title="Diálogo Backdrop">
        <p>Corpo Clicável</p>
      </Modal>
    )

    const content = screen.getByText('Corpo Clicável')
    fireEvent.click(content)
    expect(handleClose).not.toHaveBeenCalled()
  })
})
