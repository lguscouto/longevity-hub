import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { HeaderUtilityActions } from './HeaderUtilityActions';
import { ThemeProvider } from '../context/ThemeContext';

const renderActions = (props = {}) => {
  const defaultProps = {
    onOpenManualEntry: vi.fn(),
    onOpenDoctorBriefing: vi.fn(),
    onSyncZepp: vi.fn(),
    onSyncGoogleHealth: vi.fn(),
    onOpenAISettings: vi.fn(),
    isSyncing: false,
    isSyncingGoogle: false,
    ...props,
  };

  return {
    ...render(
      <ThemeProvider>
        <HeaderUtilityActions {...defaultProps} />
      </ThemeProvider>
    ),
    props: defaultProps,
  };
};

describe('HeaderUtilityActions Component', () => {
  it('renders clinical actions group with manual entry and briefing buttons', () => {
    const onOpenManualEntry = vi.fn();
    const onOpenDoctorBriefing = vi.fn();
    renderActions({ onOpenManualEntry, onOpenDoctorBriefing });

    const clinicalGroup = screen.getByRole('group', { name: 'Ações clínicas do dia' });
    expect(clinicalGroup).toBeInTheDocument();

    const manualBtn = screen.getByRole('button', { name: 'Registrar Métrica Manual' });
    expect(manualBtn).toBeInTheDocument();
    fireEvent.click(manualBtn);
    expect(onOpenManualEntry).toHaveBeenCalledTimes(1);

    const briefingBtn = screen.getByRole('button', { name: 'Doctor Briefing' });
    expect(briefingBtn).toBeInTheDocument();
    fireEvent.click(briefingBtn);
    expect(onOpenDoctorBriefing).toHaveBeenCalledTimes(1);
  });

  it('renders infrastructure group with Zepp sync and Google sync buttons', () => {
    const onSyncZepp = vi.fn();
    const onSyncGoogleHealth = vi.fn();
    renderActions({ onSyncZepp, onSyncGoogleHealth, lastSyncTime: '08:45' });

    const infraGroup = screen.getByRole('group', { name: 'Controle de sincronização e configurações' });
    expect(infraGroup).toBeInTheDocument();

    const zeppBtn = screen.getByRole('button', { name: 'Sync Zepp' });
    expect(zeppBtn).toBeInTheDocument();
    expect(screen.getByText('Sincronizado 08:45')).toBeInTheDocument();
    fireEvent.click(zeppBtn);
    expect(onSyncZepp).toHaveBeenCalledTimes(1);

    const googleBtn = screen.getByRole('button', { name: 'Sync Google' });
    expect(googleBtn).toBeInTheDocument();
    fireEvent.click(googleBtn);
    expect(onSyncGoogleHealth).toHaveBeenCalledTimes(1);
  });

  it('renders settings and theme buttons in the controls group', () => {
    const onOpenAISettings = vi.fn();
    renderActions({ onOpenAISettings });

    const settingsBtn = screen.getByRole('button', { name: 'Configurações de IA e Chaves de API' });
    expect(settingsBtn).toBeInTheDocument();
    fireEvent.click(settingsBtn);
    expect(onOpenAISettings).toHaveBeenCalledTimes(1);

    const themeBtn = screen.getByRole('button', { name: /Alternar para tema/i });
    expect(themeBtn).toBeInTheDocument();
    fireEvent.click(themeBtn);
    expect(screen.getByRole('button', { name: /Alternar para tema/i })).toBeInTheDocument();
  });

  it('disables sync buttons while syncing is active', () => {
    renderActions({ isSyncing: true, isSyncingGoogle: false });

    const zeppBtn = screen.getByRole('button', { name: 'Sync Zepp' });
    expect(zeppBtn).toBeDisabled();
    expect(screen.getByText('Sincronizando...')).toBeInTheDocument();
  });

  it('renders SyncStatusBadge and triggers onOpenSyncStatus when clicked', () => {
    const onOpenSyncStatus = vi.fn();
    renderActions({
      syncState: 'partial',
      lastSyncTime: '09:15',
      onOpenSyncStatus,
    });

    const statusBadge = screen.getByRole('button', { name: /Zepp: Sincronizado com pendências/i });
    expect(statusBadge).toBeInTheDocument();
    fireEvent.click(statusBadge);
    expect(onOpenSyncStatus).toHaveBeenCalledTimes(1);
  });
});

