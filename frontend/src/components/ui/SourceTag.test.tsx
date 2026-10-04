import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SourceTag } from './SourceTag';

describe('SourceTag (UX_UI_43)', () => {
  it('renders observed kind with full label and accessible note role', () => {
    render(<SourceTag kind="observed" />);
    expect(screen.getByText('Dado medido')).toBeInTheDocument();
    const tag = screen.getByRole('note', { name: /natureza do dado: medição direta/i });
    expect(tag).toBeInTheDocument();
    expect(tag).toHaveAttribute('title', 'Dado medido diretamente por dispositivo ou exame físico');
  });

  it('renders model kind in compact mode with shortLabel', () => {
    render(<SourceTag kind="model" compact />);
    expect(screen.getByText('Modelo')).toBeInTheDocument();
    expect(screen.getByRole('note', { name: /natureza do dado: estimativa baseada em modelo matemático/i })).toBeInTheDocument();
  });

  it('renders inference kind with AI icon and custom tooltip/label when provided', () => {
    render(
      <SourceTag
        kind="inference"
        tooltip="Custom AI insight"
        ariaLabel="Análise preditiva"
      />
    );
    expect(screen.getByText('Interpretação por IA')).toBeInTheDocument();
    const tag = screen.getByRole('note', { name: 'Análise preditiva' });
    expect(tag).toHaveAttribute('title', 'Custom AI insight');
  });

  it('supports hiding icon', () => {
    const { container } = render(<SourceTag kind="clinical" showIcon={false} />);
    expect(screen.getByText('Faixa de referência')).toBeInTheDocument();
    expect(container.querySelector('svg')).toBeNull();
  });
});
