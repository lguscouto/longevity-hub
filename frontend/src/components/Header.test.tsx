import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Header } from './Header';
import { ThemeProvider } from '../context/ThemeContext';

const renderHeader = (props = {}) => {
  const defaultProps = {
    activeTab: 'overview',
    onSelectTab: vi.fn(),
    onSyncZepp: vi.fn(),
    onSyncGoogleHealth: vi.fn(),
    onOpenManualEntry: vi.fn(),
    onOpenDoctorBriefing: vi.fn(),
    onOpenAISettings: vi.fn(),
    isSyncing: false,
    isSyncingGoogle: false,
    ...props,
  };

  return {
    ...render(
      <ThemeProvider>
        <Header {...defaultProps} />
      </ThemeProvider>
    ),
    props: defaultProps,
  };
};

describe('Header & Navigation Second Pass (UX_UI_55)', () => {
  it('renders branding and primary navigation tabs', () => {
    renderHeader();
    expect(screen.getByText('LONGEVIDADE')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Hoje/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Saúde/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Treinos/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Intervenções/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /IA e Copiloto/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Perfil/i })).toBeInTheDocument();
  });

  it('navigates to canonical landing routes when primary tabs are clicked (U22-P1-05)', () => {
    const onSelectTab = vi.fn();
    renderHeader({ onSelectTab });

    // Click 'Saúde' -> canonical landing is 'labs'
    fireEvent.click(screen.getByRole('button', { name: /Saúde/i }));
    expect(onSelectTab).toHaveBeenCalledWith('labs');

    // Click 'Intervenções' -> canonical landing is 'supplements'
    fireEvent.click(screen.getByRole('button', { name: /Intervenções/i }));
    expect(onSelectTab).toHaveBeenCalledWith('supplements');

    // Click 'Perfil' -> canonical landing is 'profile'
    fireEvent.click(screen.getByRole('button', { name: /Perfil/i }));
    expect(onSelectTab).toHaveBeenCalledWith('profile');

    // Click 'Treinos' -> canonical landing is 'workouts'
    fireEvent.click(screen.getByRole('button', { name: /Treinos/i }));
    expect(onSelectTab).toHaveBeenCalledWith('workouts');

    // Click 'Hoje' -> canonical landing is 'overview'
    fireEvent.click(screen.getByRole('button', { name: /Hoje/i }));
    expect(onSelectTab).toHaveBeenCalledWith('overview');
  });

  it('supports setActiveTab callback if onSelectTab is not provided', () => {
    const setActiveTab = vi.fn();
    render(
      <ThemeProvider>
        <Header
          activeTab="overview"
          setActiveTab={setActiveTab}
          onSyncZepp={vi.fn()}
          onOpenManualEntry={vi.fn()}
          onOpenDoctorBriefing={vi.fn()}
          onOpenAISettings={vi.fn()}
          isSyncing={false}
        />
      </ThemeProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: /Saúde/i }));
    expect(setActiveTab).toHaveBeenCalledWith('labs');
  });

  it('renders health sub-navigation when activeTab is within health domain and handles subnav clicks', () => {
    const onSelectTab = vi.fn();
    renderHeader({ activeTab: 'labs', onSelectTab });

    expect(screen.getByRole('navigation', { name: 'Sub-navegação de Saúde' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Exames e PhenoAge/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sono/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Linha do Tempo/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Avaliações Físicas/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Sono/i }));
    expect(onSelectTab).toHaveBeenCalledWith('sleep');
  });

  it('renders interventions sub-navigation and handles clicks', () => {
    const onSelectTab = vi.fn();
    renderHeader({ activeTab: 'supplements', onSelectTab });

    expect(screen.getByRole('navigation', { name: 'Sub-navegação de Intervenções' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Suplementos e Hormônios/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Experimentos pessoais/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Experimentos pessoais/i }));
    expect(onSelectTab).toHaveBeenCalledWith('n-of-1');
  });

  it('renders profile sub-navigation and handles clicks', () => {
    const onSelectTab = vi.fn();
    renderHeader({ activeTab: 'profile', onSelectTab });

    expect(screen.getByRole('navigation', { name: 'Sub-navegação de Perfil' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Meu Perfil/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Integrações/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Diagnóstico e Sistema/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Integrações/i }));
    expect(onSelectTab).toHaveBeenCalledWith('integrations');
  });

  it('sets aria-current="page" on the active primary tab', () => {
    renderHeader({ activeTab: 'workouts' });

    const workoutsBtn = screen.getByRole('button', { name: /Treinos/i });
    expect(workoutsBtn).toHaveAttribute('aria-current', 'page');

    const healthBtn = screen.getByRole('button', { name: /Saúde/i });
    expect(healthBtn).not.toHaveAttribute('aria-current');
  });

  it('renders SyncStatusControl with Sincronizar button and accessibility label', () => {
    const onSync = vi.fn();
    renderHeader({ onSync });

    const syncBtn = screen.getByRole('button', { name: 'Sincronizar' });
    expect(syncBtn).toBeInTheDocument();
    expect(syncBtn).not.toBeDisabled();

    fireEvent.click(syncBtn);
    expect(onSync).toHaveBeenCalledTimes(1);
  });

  it('renders timestamp when lastSyncTime is provided', () => {
    renderHeader({ lastSyncTime: '14:30' });

    expect(screen.getByText(/Sincronizado 14:30/i)).toBeInTheDocument();
  });

  it('displays syncing state and disables action when isSyncing is true', () => {
    renderHeader({ isSyncing: true });

    const syncBtn = screen.getByRole('button', { name: 'Sincronizar' });
    expect(syncBtn).toBeDisabled();
    expect(screen.getByText('Sincronizando...')).toBeInTheDocument();
  });

  it('toggles theme when clicking the theme switch button', () => {
    renderHeader();

    const themeBtn = screen.getByRole('button', { name: /Alternar para tema/i });
    expect(themeBtn).toBeInTheDocument();

    fireEvent.click(themeBtn);
    expect(screen.getByRole('button', { name: /Alternar para tema/i })).toBeInTheDocument();
  });
});

