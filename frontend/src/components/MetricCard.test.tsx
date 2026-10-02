import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Activity } from 'lucide-react';
import { MetricCard } from './MetricCard';

describe('MetricCard (UX_UI_32)', () => {
  it('renders measured zero value (0) distinctly from null/missing data', () => {
    const { rerender } = render(
      <MetricCard
        title="Eventos de Apneia"
        value={0}
        unit="eventos"
        icon={Activity}
      />
    );

    // Deve exibir 0 e a unidade
    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByText('eventos')).toBeInTheDocument();

    // Rerender com valor nulo
    rerender(
      <MetricCard
        title="Eventos de Apneia"
        value={null}
        unit="eventos"
        icon={Activity}
      />
    );

    // Deve exibir '—' e não exibir a unidade solta
    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.queryByText('eventos')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Não informado')).toBeInTheDocument();
  });

  it('renders numeric and text values properly', () => {
    render(
      <MetricCard
        title="Frequência Cardíaca"
        value={62}
        unit="bpm"
        subtitle="Média em repouso"
        trend="-2 bpm"
        icon={Activity}
      />
    );

    expect(screen.getByText('Frequência Cardíaca')).toBeInTheDocument();
    expect(screen.getByText('62')).toBeInTheDocument();
    expect(screen.getByText('bpm')).toBeInTheDocument();
    expect(screen.getByText('Média em repouso')).toBeInTheDocument();
    expect(screen.getByText('-2 bpm')).toBeInTheDocument();
  });
});
