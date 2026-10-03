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

  it('renders absenceKind badge and clinical explanation metadata (UX_UI_43)', () => {
    render(
      <EmptyState
        title="Histórico de Exames"
        absenceKind="no_data"
        source="Laboratório Fleury / Manual"
        lastSync="02/10/2026 14:30"
        reason="Nenhum laudo anexado neste período"
      />
    );

    expect(screen.getByText('Sem dados')).toBeInTheDocument();
    expect(screen.getByText(/Laboratório Fleury \/ Manual/)).toBeInTheDocument();
    expect(screen.getByText(/02\/10\/2026 14:30/)).toBeInTheDocument();
    expect(screen.getByText(/Nenhum laudo anexado neste período/)).toBeInTheDocument();
  });

  it('renders guided onboarding pipeline steps when provided (Master §109/§110)', () => {
    render(
      <EmptyState
        title="Painel Inicial"
        pipelineSteps={[
          { step: 1, label: 'Perfil e Metas', done: true },
          { step: 2, label: 'Fontes & Sensores', active: true },
          { step: 3, label: 'Primeiras Métricas' },
        ]}
      />
    );

    expect(screen.getByText('Fluxo Inicial Recomendado')).toBeInTheDocument();
    expect(screen.getByText('Perfil e Metas')).toBeInTheDocument();
    expect(screen.getByText('Fontes & Sensores')).toBeInTheDocument();
    expect(screen.getByText('Primeiras Métricas')).toBeInTheDocument();
  });
});

