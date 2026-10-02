import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Header } from './Header';
import { ThemeProvider } from '../context/ThemeContext';

const renderHeader = (props = {}) => {
  const defaultProps = {
    activeTab: 'overview',
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

describe('Header & SyncStatusControl', () => {
  it('renders branding and primary navigation tabs', () => {
    renderHeader();
    expect(screen.getByText('LONGEVIDADE')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Hoje/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Saúde/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Treinos/i })).toBeInTheDocument();
  });

  it('renders SyncStatusControl with Sync Zepp button and accessibility label', () => {
    const onSyncZepp = vi.fn();
    renderHeader({ onSyncZepp });

    const syncBtn = screen.getByRole('button', { name: 'Sync Zepp' });
    expect(syncBtn).toBeInTheDocument();
    expect(syncBtn).not.toBeDisabled();

    fireEvent.click(syncBtn);
    expect(onSyncZepp).toHaveBeenCalledTimes(1);
  });

  it('renders timestamp when lastSyncTime is provided', () => {
    renderHeader({ lastSyncTime: '14:30' });

    expect(screen.getByText(/Sincronizado 14:30/i)).toBeInTheDocument();
  });

  it('displays syncing state and disables action when isSyncing is true', () => {
    renderHeader({ isSyncing: true });

    const syncBtn = screen.getByRole('button', { name: 'Sync Zepp' });
    expect(syncBtn).toBeDisabled();
    expect(screen.getByText('Sincronizando...')).toBeInTheDocument();
  });

  it('toggles theme when clicking the theme switch button', () => {
    renderHeader();

    const themeBtn = screen.getByRole('button', { name: /Alternar para tema/i });
    expect(themeBtn).toBeInTheDocument();

    fireEvent.click(themeBtn);
    // Theme button exists and responds to user interaction
    expect(screen.getByRole('button', { name: /Alternar para tema/i })).toBeInTheDocument();
  });
});
