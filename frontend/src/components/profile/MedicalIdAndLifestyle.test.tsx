import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MedicalIdCard } from './MedicalIdCard';
import { LifestyleArchitectureCard } from './LifestyleArchitectureCard';
import { EditProfileModal } from './EditProfileModal';
import { ProfileData } from './ProfileTypes';

const mockFullProfile: ProfileData = {
  name: 'Gustavo Santos',
  email: 'gustavo@exemplo.com',
  birthdate: '1994-03-22',
  chronological_age: 32,
  height_cm: 170,
  current_weight_kg: 83.9,
  target_weight_kg: 75,
  gender: 'Masculino',
  google_connected: true,
  source: 'google_health',

  blood_type: 'O+',
  allergies: 'Penicilina, Glúten (leve)',
  family_history: 'Cardiovascular paterno aos 62 anos',
  emergency_contact_name: 'Juliana',
  emergency_contact_phone: '+55 11 98765-4321',
  primary_physician: 'Dr. Roberto Santos (Cardiologista)',

  fasting_window: '16:8 (12:00 às 20:00)',
  chronotype: 'Intermediário Matutino',
  daily_water_target_ml: 3200,
  target_sleep_hours: 8.0,
  target_body_fat_pct: 15.0,

  medical_id: {
    blood_type: 'O+',
    allergies: 'Penicilina, Glúten (leve)',
    family_history: 'Cardiovascular paterno aos 62 anos',
    emergency_contact: {
      name: 'Juliana',
      phone: '+55 11 98765-4321',
    },
    primary_physician: 'Dr. Roberto Santos (Cardiologista)',
  },

  lifestyle: {
    fasting_window: '16:8 (12:00 às 20:00)',
    chronotype: 'Intermediário Matutino',
    daily_water_target_ml: 3200,
    target_sleep_hours: 8.0,
    target_body_fat_pct: 15.0,
    active_supplements_count: 5,
  },

  protocol: {
    status: 'Protocolo Ativo',
    start_date: '2026-05-15',
    streak_days: 143,
    longevity_goals: ['cardiovascular', 'hypertrophy'],
  },
};

describe('MedicalIdCard (Fase 3)', () => {
  it('renders blood type, allergies, ICE phone link and physician', () => {
    render(<MedicalIdCard medicalId={mockFullProfile.medical_id} />);

    expect(screen.getByText('O+')).toBeInTheDocument();
    expect(screen.getByText(/Penicilina, Glúten \(leve\)/)).toBeInTheDocument();
    expect(screen.getByText('Juliana')).toBeInTheDocument();
    expect(screen.getByText('Dr. Roberto Santos (Cardiologista)')).toBeInTheDocument();

    const callLink = screen.getByRole('link', { name: /\+55 11 98765-4321/i });
    expect(callLink).toHaveAttribute('href', 'tel:+5511987654321');
  });

  it('renders clean fallback state when medical data is absent', () => {
    render(<MedicalIdCard medicalId={{}} />);

    expect(
      screen.getByText(/Nenhuma informação médica registrada ainda/i)
    ).toBeInTheDocument();
  });
});

describe('LifestyleArchitectureCard (Fase 3)', () => {
  it('renders fasting window, chronotype, water target in liters and active supplements', () => {
    render(<LifestyleArchitectureCard lifestyle={mockFullProfile.lifestyle} />);

    expect(screen.getByText('16:8 (12:00 às 20:00)')).toBeInTheDocument();
    expect(screen.getByText('Intermediário Matutino')).toBeInTheDocument();
    expect(screen.getByText('3.2 L / dia')).toBeInTheDocument();
    expect(screen.getByText('8 horas / noite')).toBeInTheDocument();
    expect(screen.getByText('15% gordura')).toBeInTheDocument();
    expect(screen.getByText('5 compostos ativos')).toBeInTheDocument();
  });
});

describe('EditProfileModal (Fase 3: Abas e Edição Completa)', () => {
  it('allows switching tabs and editing medical and lifestyle attributes', async () => {
    const user = userEvent.setup();
    const onUpdateMock = vi.fn();
    const onCloseMock = vi.fn();

    render(
      <EditProfileModal
        isOpen={true}
        onClose={onCloseMock}
        profile={mockFullProfile}
        onUpdateProfile={onUpdateMock}
      />
    );

    // Inicial na aba Dados Básicos
    expect(screen.getByLabelText(/nome completo/i)).toHaveValue('Gustavo Santos');

    // Navega para Ficha Médica
    const medicalTab = screen.getByRole('tab', { name: /ficha médica/i });
    await user.click(medicalTab);

    expect(screen.getByLabelText(/tipo sanguíneo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/alergias & intolerâncias/i)).toHaveValue(
      'Penicilina, Glúten (leve)'
    );

    // Altera Alergias
    const allergiesInput = screen.getByLabelText(/alergias & intolerâncias/i);
    await user.clear(allergiesInput);
    await user.type(allergiesInput, 'Apenas frutos do mar');

    // Navega para Estilo de Vida
    const lifestyleTab = screen.getByRole('tab', { name: /estilo de vida/i });
    await user.click(lifestyleTab);

    expect(screen.getByLabelText(/meta diária de água/i)).toHaveValue(3200);

    // Salva o formulário
    const saveBtn = screen.getByRole('button', { name: /salvar alterações/i });
    await user.click(saveBtn);

    expect(onUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Gustavo Santos',
        allergies: 'Apenas frutos do mar',
        daily_water_target_ml: 3200,
      })
    );
    expect(onCloseMock).toHaveBeenCalled();
  });
});
