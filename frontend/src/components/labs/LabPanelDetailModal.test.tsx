import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LabPanelDetailModal } from './LabPanelDetailModal';
import { LabResult } from './labMarkers';

describe('LabPanelDetailModal (UX_UI_54)', () => {
  it('segregates clinical normal vs optimal without turning normal into attention (U22-P1-22 & U22-P1-23)', () => {
    const mockResults: LabResult[] = [
      // Ótimo: ApoB <= 60
      {
        collected_at: '2026-08-01',
        metric_key: 'apob',
        metric_name: 'Apolipoproteína B (ApoB)',
        value: 58,
        unit: 'mg/dL',
        record_origin: 'patient_lab',
        optimal_target: 60,
        ref_min: 60,
        ref_max: 130,
      },
      // Na referência clínica, mas não ótimo: Glicose 92 mg/dL (ref: 70-99, ótimo: 70-85)
      {
        collected_at: '2026-08-01',
        metric_key: 'fasting_glucose',
        metric_name: 'Glicose de Jejum',
        value: 92,
        unit: 'mg/dL',
        record_origin: 'patient_lab',
        optimal_target: 85,
        ref_min: 70,
        ref_max: 99,
      },
      // Fora da referência clínica: PCR 4.5 mg/L (ref max: 3.0)
      {
        collected_at: '2026-08-01',
        metric_key: 'hscrp',
        metric_name: 'Proteína C-Reativa (PCR-us)',
        value: 4.5,
        unit: 'mg/L',
        record_origin: 'patient_lab',
        optimal_target: 0.5,
        ref_min: 0,
        ref_max: 3.0,
      },
      // Não clínico: sem proveniência de laudo
      {
        collected_at: '2026-08-01',
        metric_key: 'ferritin',
        metric_name: 'Ferritina Sanguínea',
        value: 120,
        unit: 'ng/mL',
        record_origin: 'synthetic',
        optimal_target: 100,
        ref_min: 30,
        ref_max: 300,
      },
    ];

    render(
      <LabPanelDetailModal
        date="2026-08-01"
        results={mockResults}
        onClose={vi.fn()}
      />
    );

    // Deve exibir o badge Ótimo
    expect(screen.getByText('Ótimo')).toBeInTheDocument();

    // Deve exibir "Na referência" para a Glicose de 92 (NÃO deve ser "Atenção")
    expect(screen.getByText('Na referência')).toBeInTheDocument();

    // Deve exibir "Atenção clínica" para o PCR de 4.5
    expect(screen.getByText('Atenção clínica')).toBeInTheDocument();

    // Deve exibir "Não clínico" para o dado sintético
    expect(screen.getByText('Não clínico')).toBeInTheDocument();
  });
});
