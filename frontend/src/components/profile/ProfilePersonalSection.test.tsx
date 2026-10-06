import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ProfilePersonalSection } from './ProfilePersonalSection';
import { ProfileData } from './ProfileTypes';

const mockEnrichedProfile: ProfileData = {
  name: 'Gustavo Longevidade',
  email: 'gustavo@exemplo.com',
  birthdate: '1994-03-22',
  chronological_age: 32,
  height_cm: 170,
  current_weight_kg: 83.9,
  target_weight_kg: 75,
  bmi: 29.0,
  gender: 'Masculino',
  google_connected: true,
  source: 'google_health',

  protocol: {
    status: 'Protocolo Ativo',
    start_date: '2026-05-15',
    streak_days: 143,
    longevity_goals: ['cardiovascular', 'hypertrophy', 'phenoage'],
  },

  biological_age: {
    calculated_at: '2026-09-15T10:00:00',
    biological_age: 29.4,
    chronological_age: 32.0,
    age_delta: -2.6,
    pace_of_aging: 0.88,
    status: 'Otimização Celular Favorável',
  },

  golden_metrics: {
    date_ref: '2026-10-04',
    vo2_max: 44.5,
    vo2_max_percentile: 'Top 20%',
    rhr_bpm: 54,
    hrv_ms: 58,
    body_fat_pct: 21.4,
    target_body_fat_pct: 15.0,
    waist_cm: 88,
    whtr: 0.52,
    grip_strength_kg: 48,
    spo2_avg_pct: 98,
  },
};

describe('ProfilePersonalSection (Fase 2: Hero, Biological Age & Golden Biomarkers)', () => {
  it('renders ProfileHeroCard with streak and longevity goals', () => {
    render(
      <ProfilePersonalSection
        profile={mockEnrichedProfile}
        onUpdateProfile={vi.fn()}
      />
    );

    expect(screen.getByText('Gustavo Longevidade')).toBeInTheDocument();
    expect(screen.getByText(/gustavo@exemplo.com/)).toBeInTheDocument();
    expect(screen.getByText('Protocolo Ativo')).toBeInTheDocument();
    expect(screen.getByText(/Dia 143 contínuo/)).toBeInTheDocument();

    // Metas
    expect(screen.getByText('Saúde Cardiovascular')).toBeInTheDocument();
    expect(screen.getByText('Hipertrofia & Força')).toBeInTheDocument();
    expect(screen.getByText('Rejuvenescimento Celular')).toBeInTheDocument();
  });

  it('renders BiologicalAgeSnapshotCard with biological age, delta and pace of aging', () => {
    render(
      <ProfilePersonalSection
        profile={mockEnrichedProfile}
        onUpdateProfile={vi.fn()}
      />
    );

    expect(screen.getByText(/Idade Biológica Celular \(PhenoAge\)/)).toBeInTheDocument();
    expect(screen.getByText('29.4')).toBeInTheDocument();
    expect(screen.getByText('-2.6')).toBeInTheDocument();
    expect(screen.getAllByText(/Rejuvenescimento/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('0.88x')).toBeInTheDocument();
    expect(screen.getByText(/Otimização Celular Favorável/)).toBeInTheDocument();
  });

  it('renders educational empty state for biological age when no lab data is present', () => {
    const profileWithoutBioAge: ProfileData = {
      ...mockEnrichedProfile,
      biological_age: null,
    };

    render(
      <ProfilePersonalSection
        profile={profileWithoutBioAge}
        onUpdateProfile={vi.fn()}
      />
    );

    expect(screen.getByText('Sem dados de exames')).toBeInTheDocument();
    expect(screen.getByText(/Como funciona o cálculo da Idade Biológica\?/)).toBeInTheDocument();
    expect(screen.getByText(/desenvolvido na Universidade de Yale/)).toBeInTheDocument();
  });

  it('renders GoldenBiomarkersGrid with VO2 Max, HRV, body fat, WHtR and grip strength', () => {
    render(
      <ProfilePersonalSection
        profile={mockEnrichedProfile}
        onUpdateProfile={vi.fn()}
      />
    );

    expect(screen.getByText(/Biomarcadores Padrão-Ouro/)).toBeInTheDocument();

    // VO2 Max & RHR
    expect(screen.getByText('44.5')).toBeInTheDocument();
    expect(screen.getByText('Top 20%')).toBeInTheDocument();
    expect(screen.getByText('54 bpm')).toBeInTheDocument();

    // HRV & SpO2
    expect(screen.getByText('58')).toBeInTheDocument();
    expect(screen.getByText('98%')).toBeInTheDocument();

    // Composição Corporal
    expect(screen.getByText('21.4%')).toBeInTheDocument();
    expect(screen.getByText('0.52')).toBeInTheDocument();

    // Força
    expect(screen.getByText('48')).toBeInTheDocument();
    expect(screen.getByText(/kg \(Grip Strength\)/)).toBeInTheDocument();
  });

  it('toggles edit profile mode and submits form data', async () => {
    const user = userEvent.setup();
    const onUpdateMock = vi.fn();

    render(
      <ProfilePersonalSection
        profile={mockEnrichedProfile}
        onUpdateProfile={onUpdateMock}
      />
    );

    const editBtn = screen.getByRole('button', { name: /editar perfil/i });
    await user.click(editBtn);

    expect(screen.getByText('Editar Informações do Perfil')).toBeInTheDocument();

    const nameInput = screen.getByLabelText(/nome completo/i);
    await user.clear(nameInput);
    await user.type(nameInput, 'Gustavo Atualizado');

    await user.click(screen.getByRole('button', { name: /salvar alterações/i }));

    expect(onUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Gustavo Atualizado',
      })
    );
  });

  it('calls onOpenDoctorBriefing when Briefing Médico button is clicked', async () => {
    const user = userEvent.setup();
    const onBriefingMock = vi.fn();

    render(
      <ProfilePersonalSection
        profile={mockEnrichedProfile}
        onUpdateProfile={vi.fn()}
        onOpenDoctorBriefing={onBriefingMock}
      />
    );

    const briefingBtn = screen.getByRole('button', { name: /briefing médico/i });
    await user.click(briefingBtn);

    expect(onBriefingMock).toHaveBeenCalledTimes(1);
  });

  it('triggers window.print when Imprimir Ficha button is clicked', async () => {
    const user = userEvent.setup();
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});

    render(
      <ProfilePersonalSection
        profile={mockEnrichedProfile}
        onUpdateProfile={vi.fn()}
      />
    );

    const printBtn = screen.getByRole('button', { name: /imprimir ficha/i });
    await user.click(printBtn);

    expect(printSpy).toHaveBeenCalledTimes(1);
    printSpy.mockRestore();
  });
});
