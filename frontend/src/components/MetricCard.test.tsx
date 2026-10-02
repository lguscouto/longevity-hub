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

  it('renders semantic range types with accessible labels and tooltips (UX_UI_19)', () => {
    const { rerender } = render(
      <MetricCard
        title="Passos 24h"
        value={10420}
        unit="passos"
        rangeType="target"
        rangeValue="10.000"
        icon={Activity}
      />
    );

    // Alvo Pessoal
    expect(screen.getByLabelText('Alvo Pessoal: 10.000')).toBeInTheDocument();
    expect(screen.getByText('10.000')).toBeInTheDocument();

    // Referência Clínica
    rerender(
      <MetricCard
        title="Taxa Respiratória"
        value={14}
        unit="rpm"
        rangeType="reference"
        rangeValue="12-20"
        icon={Activity}
      />
    );
    expect(screen.getByLabelText('Referência Clínica: 12-20')).toBeInTheDocument();
    expect(screen.getByText('12-20')).toBeInTheDocument();

    // Alvo Ótimo de Longevidade
    rerender(
      <MetricCard
        title="FC Repouso"
        value={52}
        unit="bpm"
        rangeType="optimal"
        rangeValue="< 55 bpm"
        icon={Activity}
      />
    );
    expect(screen.getByLabelText('Alvo Ótimo: < 55 bpm')).toBeInTheDocument();
    expect(screen.getByText('< 55 bpm')).toBeInTheDocument();
  });
});
