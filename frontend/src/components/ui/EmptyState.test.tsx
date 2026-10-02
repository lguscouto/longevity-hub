import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Activity } from 'lucide-react';
import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  it('renders title and description', () => {
    render(
      <EmptyState
        title="Nenhum dado encontrado"
        description="Não há registros para o período selecionado."
      />
    );

    expect(screen.getByText('Nenhum dado encontrado')).toBeInTheDocument();
    expect(screen.getByText('Não há registros para o período selecionado.')).toBeInTheDocument();
  });

  it('renders primary action and fires onClick', () => {
    const handleAction = vi.fn();
    render(
      <EmptyState
        title="Sem treinos"
        action={{
          label: 'Adicionar Treino',
          onClick: handleAction,
          icon: Activity,
        }}
      />
    );

    const actionBtn = screen.getByRole('button', { name: 'Adicionar Treino' });
    expect(actionBtn).toBeInTheDocument();

    fireEvent.click(actionBtn);
    expect(handleAction).toHaveBeenCalledTimes(1);
  });

  it('renders secondary action and fires onClick', () => {
    const handleSecondary = vi.fn();
    render(
      <EmptyState
        title="Filtro sem resultados"
        secondaryAction={{
          label: 'Limpar Filtros',
          onClick: handleSecondary,
        }}
      />
    );

    const secondaryBtn = screen.getByRole('button', { name: 'Limpar Filtros' });
    fireEvent.click(secondaryBtn);
    expect(handleSecondary).toHaveBeenCalledTimes(1);
  });
});
