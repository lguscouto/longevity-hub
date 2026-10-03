import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ProfileView } from './ProfileView';
import { ProfileData } from './profile/ProfileTypes';

vi.mock('../lib/api', () => ({
  requestJson: vi.fn().mockResolvedValue({
    score: 95,
    coverage: 92,
    issues: [],
    details: { total_expected: 10, total_received: 9 },
  }),
}));

const mockProfile: ProfileData = {
  name: 'Carlos Oliveira',
  email: 'carlos@exemplo.com',
  birthdate: '1985-05-15',
  chronological_age: 41,
  height_cm: 180,
  current_weight_kg: 78.5,
  target_weight_kg: 75,
  bmi: 24.2,
  gender: 'Masculino',
  google_connected: true,
  source: 'zepp',
};

describe('ProfileView (UX_UI_59 — Profile / Settings Information Architecture)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders "Meu Perfil" tab by default with biometric metrics and protocol badge', () => {
    render(
      <ProfileView
        profile={mockProfile}
        onUpdateProfile={vi.fn()}
      />
    );

    expect(screen.getByRole('tab', { name: /meu perfil/i })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel', { name: /meu perfil/i })).toBeInTheDocument();

    expect(screen.getByText('Carlos Oliveira')).toBeInTheDocument();
    expect(screen.getByText(/carlos@exemplo.com/)).toBeInTheDocument();
    expect(screen.getByText('Protocolo Ativo')).toBeInTheDocument();

    // Stats
    expect(screen.getByText('41')).toBeInTheDocument();
    expect(screen.getByText(/180/)).toBeInTheDocument();
    expect(screen.getByText(/78.5 kg/)).toBeInTheDocument();
    expect(screen.getByText('75')).toBeInTheDocument();
    expect(screen.getByText(/IMC: 24.2 kg\/m²/)).toBeInTheDocument();
  });

  it('opens and cancels edit mode', async () => {
    const user = userEvent.setup();
    render(
      <ProfileView
        profile={mockProfile}
        onUpdateProfile={vi.fn()}
      />
    );

    const editBtn = screen.getByRole('button', { name: /editar perfil/i });
    await user.click(editBtn);

    expect(screen.getByText('Editar Informações do Perfil')).toBeInTheDocument();
    expect(screen.getByLabelText(/nome completo/i)).toHaveValue('Carlos Oliveira');

    const cancelBtn = screen.getByRole('button', { name: /^cancelar$/i });
    await user.click(cancelBtn);

    expect(screen.queryByText('Editar Informações do Perfil')).not.toBeInTheDocument();
  });

  it('submits updated profile data successfully', async () => {
    const user = userEvent.setup();
    const onUpdateMock = vi.fn();

    render(
      <ProfileView
        profile={mockProfile}
        onUpdateProfile={onUpdateMock}
      />
    );

    await user.click(screen.getByRole('button', { name: /editar perfil/i }));

    const weightInput = screen.getByLabelText('Peso Atual (kg)');
    await user.clear(weightInput);
    await user.type(weightInput, '77.8');

    await user.click(screen.getByRole('button', { name: /salvar alterações/i }));

    expect(onUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Carlos Oliveira',
        current_weight_kg: 77.8,
      })
    );
    expect(screen.queryByText('Editar Informações do Perfil')).not.toBeInTheDocument();
  });

  it('switches to "Integrações" tab and handles wearable sync callbacks', async () => {
    const user = userEvent.setup();
    const onSyncZeppMock = vi.fn();
    const onSyncGoogleMock = vi.fn();
    const onSelectSubTabMock = vi.fn();

    render(
      <ProfileView
        profile={mockProfile}
        onUpdateProfile={vi.fn()}
        onSyncZepp={onSyncZeppMock}
        onSyncGoogleHealth={onSyncGoogleMock}
        onSelectSubTab={onSelectSubTabMock}
      />
    );

    const integrationsTab = screen.getByRole('tab', { name: /integrações/i });
    await user.click(integrationsTab);

    expect(integrationsTab).toHaveAttribute('aria-selected', 'true');
    expect(onSelectSubTabMock).toHaveBeenCalledWith('integrations');

    // Devices & Sensors
    expect(screen.getByText('Zepp OS (Amazfit)')).toBeInTheDocument();
    expect(screen.getByText('Google Health API v4')).toBeInTheDocument();
    expect(screen.getByText(/hevy/i)).toBeInTheDocument();

    // Trigger sync
    await user.click(screen.getByRole('button', { name: /^sync zepp$/i }));
    expect(onSyncZeppMock).toHaveBeenCalledWith(false);

    await user.click(screen.getByRole('button', { name: /^sync google$/i }));
    expect(onSyncGoogleMock).toHaveBeenCalled();
  });

  it('switches to "Diagnóstico & Sistema" tab and provides AI & database controls', async () => {
    const user = userEvent.setup();
    const onOpenAISettingsMock = vi.fn();

    render(
      <ProfileView
        profile={mockProfile}
        onUpdateProfile={vi.fn()}
        onOpenAISettings={onOpenAISettingsMock}
      />
    );

    const systemTab = screen.getByRole('tab', { name: /diagnóstico & sistema/i });
    await user.click(systemTab);

    expect(systemTab).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Base de Dados SQLite Local')).toBeInTheDocument();
    expect(screen.getByText(/inteligência artificial & provedores llm/i)).toBeInTheDocument();

    const configAIBtn = screen.getByRole('button', { name: /configurar provedores & privacidade/i });
    await user.click(configAIBtn);
    expect(onOpenAISettingsMock).toHaveBeenCalled();
  });

  it('persists selected subtab in localStorage across sessions (U22-P1-70)', async () => {
    localStorage.setItem('longevidade:profile_subtab:v1', 'integrations');

    render(
      <ProfileView
        profile={mockProfile}
        onUpdateProfile={vi.fn()}
      />
    );

    // Initial state restored from localStorage
    expect(screen.getByRole('tab', { name: /integrações/i })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Zepp OS (Amazfit)')).toBeInTheDocument();
  });
});
