import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge } from './StatusBadge';

describe('StatusBadge Primitive', () => {
  it('renders badge with text and neutral styling by default', () => {
    render(<StatusBadge data-testid="badge">Pendente</StatusBadge>);
    const badge = screen.getByTestId('badge');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('Pendente');
    expect(badge).toHaveClass('bg-slate-100');
  });

  it('renders success variant with emerald styling', () => {
    render(<StatusBadge variant="success" data-testid="badge">Conectado</StatusBadge>);
    const badge = screen.getByTestId('badge');
    expect(badge).toHaveClass('bg-emerald-500/10');
  });

  it('renders dot indicator when dot is true', () => {
    const { container } = render(<StatusBadge variant="success" dot>Ativo</StatusBadge>);
    const dot = container.querySelector('.rounded-full.bg-emerald-500');
    expect(dot).toBeInTheDocument();
  });

  it('renders warning and error variants appropriately', () => {
    const { rerender } = render(<StatusBadge variant="warning" data-testid="badge">Atenção</StatusBadge>);
    expect(screen.getByTestId('badge')).toHaveClass('bg-amber-500/10');

    rerender(<StatusBadge variant="error" data-testid="badge">Falha</StatusBadge>);
    expect(screen.getByTestId('badge')).toHaveClass('bg-rose-500/10');
  });
});
