import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Settings } from 'lucide-react';
import { IconButton } from './IconButton';

describe('IconButton Primitive', () => {
  it('renders button with accessible name via aria-label', () => {
    render(<IconButton icon={Settings} aria-label="Abrir configurações de IA" />);
    const btn = screen.getByRole('button', { name: /abrir configurações de ia/i });
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveAttribute('title', 'Abrir configurações de IA');
  });

  it('triggers onClick handler when clicked', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();
    render(<IconButton icon={Settings} aria-label="Configurações" onClick={handleClick} />);
    await user.click(screen.getByRole('button', { name: /configurações/i }));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('disables button and shows spinner when loading is true', () => {
    render(<IconButton icon={Settings} aria-label="Carregando" loading />);
    const btn = screen.getByRole('button', { name: /carregando/i });
    expect(btn).toBeDisabled();
    expect(btn.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('includes pseudo-element hitbox expansion classes to guarantee >=44x44px touch target on mobile', () => {
    const { rerender } = render(<IconButton icon={Settings} aria-label="Configurações" size="sm" />);
    let btn = screen.getByRole('button', { name: /configurações/i });
    expect(btn).toHaveClass('relative');
    expect(btn).toHaveClass('after:-inset-1.5');
    expect(btn).toHaveClass('md:after:hidden');

    rerender(<IconButton icon={Settings} aria-label="Configurações" size="md" />);
    btn = screen.getByRole('button', { name: /configurações/i });
    expect(btn).toHaveClass('after:-inset-0.5');
    expect(btn).toHaveClass('md:after:hidden');
  });
});
