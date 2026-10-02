import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Activity } from 'lucide-react';
import { Button } from './Button';

describe('Button Primitive', () => {
  it('renders button with children and default secondary variant', () => {
    render(<Button>Clique aqui</Button>);
    const btn = screen.getByRole('button', { name: /clique aqui/i });
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveClass('bg-slate-100');
  });

  it('renders primary variant with emerald styling', () => {
    render(<Button variant="primary">Ação Primária</Button>);
    const btn = screen.getByRole('button', { name: /ação primária/i });
    expect(btn).toHaveClass('bg-emerald-600');
  });

  it('shows spinner and is disabled when loading is true', () => {
    render(<Button loading>Salvando</Button>);
    const btn = screen.getByRole('button', { name: /salvando/i });
    expect(btn).toBeDisabled();
    expect(btn.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('handles click events when enabled', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();
    render(<Button onClick={handleClick}>Confirmar</Button>);
    await user.click(screen.getByRole('button', { name: /confirmar/i }));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('renders left and right icons correctly', () => {
    render(<Button leftIcon={Activity}>Com Ícone</Button>);
    const btn = screen.getByRole('button', { name: /com ícone/i });
    expect(btn.querySelector('svg')).toBeInTheDocument();
  });

  it('includes pseudo-element hitbox expansion classes to guarantee >=44px vertical target on mobile', () => {
    const { rerender } = render(<Button size="sm">Pequeno</Button>);
    let btn = screen.getByRole('button', { name: /pequeno/i });
    expect(btn).toHaveClass('relative');
    expect(btn).toHaveClass('after:-inset-y-1');
    expect(btn).toHaveClass('md:after:hidden');

    rerender(<Button size="md">Médio</Button>);
    btn = screen.getByRole('button', { name: /médio/i });
    expect(btn).toHaveClass('after:-inset-y-0.5');
    expect(btn).toHaveClass('md:after:hidden');
  });
});
