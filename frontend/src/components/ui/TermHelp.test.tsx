import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import React from 'react';
import { TermHelp } from './TermHelp';

describe('TermHelp', () => {
  it('renders standalone help button when no children are provided', () => {
    render(<TermHelp termKey="phenoage" />);
    const button = screen.getByRole('button', { name: /entender phenoage/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('aria-haspopup', 'true');
    expect(button).toHaveAttribute('aria-expanded', 'false');
  });

  it('renders children with help icon and accessibility attributes', () => {
    render(
      <TermHelp termKey="hrv">
        <span>VFC Repouso</span>
      </TermHelp>
    );
    expect(screen.getByText('VFC Repouso')).toBeInTheDocument();
    const trigger = screen.getByRole('button');
    expect(trigger).toHaveAttribute('aria-haspopup', 'true');
  });

  it('reveals popover content with definition and longevity explanation on hover', () => {
    render(<TermHelp termKey="vo2max" />);
    const button = screen.getByRole('button', { name: /entender vo₂ máx/i });

    // Hover reveals tooltip
    fireEvent.mouseEnter(button.parentElement!);

    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    expect(screen.getByText('VO₂ Máx (Capacidade Cardiorrespiratória)')).toBeInTheDocument();
    expect(screen.getByText(/volume máximo de oxigênio/i)).toBeInTheDocument();
    expect(screen.getByText(/o preditor isolado mais forte de longevidade/i)).toBeInTheDocument();
    expect(screen.getByText(/maior é melhor/i)).toBeInTheDocument();

    // Mouse leave hides it
    fireEvent.mouseLeave(button.parentElement!);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('toggles on click and closes when Escape is pressed', () => {
    render(<TermHelp termKey="apob" />);
    const button = screen.getByRole('button', { name: /entender apob/i });

    // Click opens
    fireEvent.click(button);
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    expect(screen.getByText(/marcador do número total de partículas aterogênicas/i)).toBeInTheDocument();

    // Escape closes
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('supports custom title, description, and optimal target', () => {
    render(
      <TermHelp
        customTitle="Glicemia Pré-Treino"
        customDescription="Nível de glicose antes do exercício de força."
        customWhyItMatters="Garante disponibilidade energética para performance."
        customTarget="100 - 130 mg/dL"
      />
    );
    const button = screen.getByRole('button', { name: /entender glicemia pré-treino/i });
    fireEvent.click(button);

    expect(screen.getByText('Glicemia Pré-Treino')).toBeInTheDocument();
    expect(screen.getByText('Nível de glicose antes do exercício de força.')).toBeInTheDocument();
    expect(screen.getByText('Garante disponibilidade energética para performance.')).toBeInTheDocument();
    expect(screen.getByText('100 - 130 mg/dL')).toBeInTheDocument();
  });
});
