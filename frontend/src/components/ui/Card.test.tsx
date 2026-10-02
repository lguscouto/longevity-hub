import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './Card';

describe('Card Primitive', () => {
  it('renders card and subcomponents correctly', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Título do Card</CardTitle>
          <CardDescription>Descrição auxiliar</CardDescription>
        </CardHeader>
        <CardContent>Conteúdo principal do cartão</CardContent>
        <CardFooter>Rodapé do cartão</CardFooter>
      </Card>
    );

    expect(screen.getByText('Título do Card')).toBeInTheDocument();
    expect(screen.getByText('Descrição auxiliar')).toBeInTheDocument();
    expect(screen.getByText('Conteúdo principal do cartão')).toBeInTheDocument();
    expect(screen.getByText('Rodapé do cartão')).toBeInTheDocument();
  });

  it('applies surface classes appropriately', () => {
    const { rerender } = render(<Card surface="default" data-testid="card">Test</Card>);
    expect(screen.getByTestId('card')).toHaveClass('bg-white');

    rerender(<Card surface="highlight" data-testid="card">Test</Card>);
    expect(screen.getByTestId('card')).toHaveClass('bg-slate-50');
  });
});
