import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { Activity } from 'lucide-react';
import { OverviewSection } from './OverviewSection';

describe('OverviewSection', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders section title, subtitle, and children non-collapsible by default', () => {
    render(
      <OverviewSection id="test-sec" title="Seção de Teste" subtitle="Subtítulo descritivo" icon={Activity}>
        <div>Conteúdo da Seção</div>
      </OverviewSection>
    );

    expect(screen.getByRole('heading', { name: 'Seção de Teste' })).toBeInTheDocument();
    expect(screen.getByText('Subtítulo descritivo')).toBeInTheDocument();
    expect(screen.getByText('Conteúdo da Seção')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /detalhes/i })).not.toBeInTheDocument();
  });

  it('collapses by default when defaultCollapsed is true, toggles on click and updates localStorage', async () => {
    const user = userEvent.setup();
    render(
      <OverviewSection
        id="advanced-sec"
        title="Análises Avançadas"
        collapsible={true}
        defaultCollapsed={true}
        storageKey="test_section_collapsed"
      >
        <div>Dados Biomarcadores</div>
      </OverviewSection>
    );

    const toggleBtn = screen.getByRole('button', { name: /exibir detalhes de análises avançadas/i });
    expect(toggleBtn).toBeInTheDocument();
    expect(toggleBtn).toHaveAttribute('aria-expanded', 'false');

    const contentWrapper = document.getElementById('advanced-sec-content');
    expect(contentWrapper).toHaveAttribute('hidden');
    expect(contentWrapper).toHaveClass('hidden');

    // Click to expand
    await user.click(toggleBtn);
    expect(toggleBtn).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: /ocultar detalhes de análises avançadas/i })).toBeInTheDocument();
    expect(contentWrapper).not.toHaveAttribute('hidden');
    expect(contentWrapper).not.toHaveClass('hidden');
    expect(localStorage.getItem('test_section_collapsed')).toBe('false');

    // Click again to collapse
    await user.click(toggleBtn);
    expect(toggleBtn).toHaveAttribute('aria-expanded', 'false');
    expect(contentWrapper).toHaveClass('hidden');
    expect(localStorage.getItem('test_section_collapsed')).toBe('true');
  });

  it('respects persisted state from localStorage on initial render', () => {
    localStorage.setItem('persisted_section_key', 'false');

    render(
      <OverviewSection
        id="persisted-sec"
        title="Seção Persistida"
        collapsible={true}
        defaultCollapsed={true}
        storageKey="persisted_section_key"
      >
        <div>Conteúdo Persistido</div>
      </OverviewSection>
    );

    const toggleBtn = screen.getByRole('button', { name: /ocultar detalhes de seção persistida/i });
    expect(toggleBtn).toHaveAttribute('aria-expanded', 'true');
    const contentWrapper = document.getElementById('persisted-sec-content');
    expect(contentWrapper).not.toHaveClass('hidden');
  });
});
