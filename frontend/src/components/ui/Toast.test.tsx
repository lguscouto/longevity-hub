import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { Toast, ToastProvider, useToast } from './Toast';

describe('Toast Primitive Component', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders with accessible role="status" and aria-live="polite"', () => {
    const onDismiss = vi.fn();
    render(
      <Toast
        toast={{
          id: 't-1',
          type: 'success',
          title: 'Sucesso',
          message: 'Métrica registrada com sucesso!',
        }}
        onDismiss={onDismiss}
      />
    );

    const statusEl = screen.getByRole('status');
    expect(statusEl).toBeInTheDocument();
    expect(statusEl).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByText('Sucesso')).toBeInTheDocument();
    expect(screen.getByText('Métrica registrada com sucesso!')).toBeInTheDocument();
  });

  it('automatically triggers onDismiss after the configured duration', () => {
    const onDismiss = vi.fn();
    render(
      <Toast
        toast={{
          id: 't-auto',
          type: 'info',
          message: 'Notificação temporária',
          duration: 3000,
        }}
        onDismiss={onDismiss}
      />
    );

    expect(onDismiss).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(onDismiss).toHaveBeenCalledWith('t-auto');
  });

  it('allows manual dismissal via the close button', () => {
    const onDismiss = vi.fn();
    render(
      <Toast
        toast={{
          id: 't-close',
          type: 'error',
          message: 'Erro ao conectar',
        }}
        onDismiss={onDismiss}
      />
    );

    const closeBtn = screen.getByLabelText('Fechar notificação');
    fireEvent.click(closeBtn);

    expect(onDismiss).toHaveBeenCalledWith('t-close');
  });

  it('works seamlessly through ToastProvider and useToast hook', () => {
    const TestComponent = () => {
      const { showToast } = useToast();
      return (
        <button
          onClick={() => showToast('Operação realizada com sucesso!', 'success')}
        >
          Disparar Toast
        </button>
      );
    };

    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    const btn = screen.getByText('Disparar Toast');
    fireEvent.click(btn);

    expect(screen.getByText('Operação realizada com sucesso!')).toBeInTheDocument();

    // Advances timers to verify auto-cleanup
    act(() => {
      vi.advanceTimersByTime(3500);
    });

    expect(screen.queryByText('Operação realizada com sucesso!')).not.toBeInTheDocument();
  });

  it('renders warning and partial toasts with action button and handles persistent duration (0)', () => {
    const onDismiss = vi.fn();
    const onAction = vi.fn();

    render(
      <Toast
        toast={{
          id: 't-partial',
          type: 'partial',
          title: 'Sincronização Parcial',
          message: '32 importados · 4 não processados',
          duration: 0,
          action: {
            label: 'Ver detalhes',
            onClick: onAction,
          },
        }}
        onDismiss={onDismiss}
      />
    );

    expect(screen.getByText('Sincronização Parcial')).toBeInTheDocument();
    expect(screen.getByText('32 importados · 4 não processados')).toBeInTheDocument();

    // Verify it stays persistent (does not auto-dismiss after 10 seconds)
    act(() => {
      vi.advanceTimersByTime(10000);
    });
    expect(onDismiss).not.toHaveBeenCalled();

    // Click action button
    const actionBtn = screen.getByRole('button', { name: 'Ver detalhes' });
    expect(actionBtn).toBeInTheDocument();
    fireEvent.click(actionBtn);

    expect(onAction).toHaveBeenCalledTimes(1);
    expect(onDismiss).toHaveBeenCalledWith('t-partial');
  });
});
