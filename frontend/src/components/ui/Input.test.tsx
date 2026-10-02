import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Search } from 'lucide-react';
import { Input } from './Input';

describe('Input Component (UX_UI_33)', () => {
  it('renders input with value, placeholder and handles typing', () => {
    const handleChange = vi.fn();
    render(
      <Input
        placeholder="Digite algo..."
        value="teste"
        onChange={handleChange}
        id="test-input"
      />
    );

    const input = screen.getByPlaceholderText('Digite algo...');
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue('teste');

    fireEvent.change(input, { target: { value: 'novo valor' } });
    expect(handleChange).toHaveBeenCalledTimes(1);
  });

  it('renders error state with aria-invalid', () => {
    render(
      <Input
        id="error-input"
        error="Campo obrigatório"
        placeholder="Valor numérico"
      />
    );

    const input = screen.getByPlaceholderText('Valor numérico');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-describedby', 'error-input-error');
  });

  it('renders icons properly', () => {
    render(
      <Input
        id="search-input"
        leftIcon={<Search data-testid="search-icon" />}
        placeholder="Buscar..."
      />
    );

    expect(screen.getByTestId('search-icon')).toBeInTheDocument();
  });
});
