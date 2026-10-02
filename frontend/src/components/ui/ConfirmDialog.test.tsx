import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ConfirmDialog } from './ConfirmDialog';

describe('ConfirmDialog', () => {
  it('does not render when isOpen is false', () => {
    render(
      <ConfirmDialog
        isOpen={false}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        title="Deseja prosseguir?"
      />
    );
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('renders title, description and calls onConfirm when confirmed', () => {
    const handleConfirm = vi.fn();
    const handleClose = vi.fn();

    render(
      <ConfirmDialog
        isOpen={true}
        onClose={handleClose}
        onConfirm={handleConfirm}
        title="Confirmar Ação"
        description="Esta ação enviará os dados."
        confirmLabel="Sim, enviar"
      />
    );

    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(screen.getByText('Confirmar Ação')).toBeInTheDocument();
    expect(screen.getByText('Esta ação enviará os dados.')).toBeInTheDocument();

    const confirmBtn = screen.getByRole('button', { name: 'Sim, enviar' });
    fireEvent.click(confirmBtn);
    expect(handleConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Cancel button is clicked', () => {
    const handleClose = vi.fn();
    render(
      <ConfirmDialog
        isOpen={true}
        onClose={handleClose}
        onConfirm={vi.fn()}
        title="Excluir Item"
        cancelLabel="Voltar"
      />
    );

    const cancelBtn = screen.getByRole('button', { name: 'Voltar' });
    fireEvent.click(cancelBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('places initial focus on the Cancel button for defensive safety', async () => {
    render(
      <ConfirmDialog
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        title="Ação Destrutiva"
        cancelLabel="Cancelar"
        confirmLabel="Excluir"
        isDestructive={true}
      />
    );

    const cancelBtn = screen.getByRole('button', { name: 'Cancelar' });
    await waitFor(() => {
      expect(document.activeElement).toBe(cancelBtn);
    });
  });

  it('disables buttons when loading', () => {
    render(
      <ConfirmDialog
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        title="Salvando..."
        loading={true}
      />
    );

    const cancelBtn = screen.getByRole('button', { name: 'Cancelar' });
    expect(cancelBtn).toBeDisabled();
  });
});
