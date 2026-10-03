import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CardiovascularRatios } from './CardiovascularRatios';
import { LabResult } from './labMarkers';

describe('CardiovascularRatios (UX_UI_54)', () => {
  it('renders CALCULADO badge and formulas for derived metrics (U22-P1-26)', () => {
    const mockLabs: LabResult[] = [
      { collected_at: '2026-08-01', metric_key: 'apob', metric_name: 'ApoB', value: 70, unit: 'mg/dL', record_origin: 'patient_lab' },
      { collected_at: '2026-08-01', metric_key: 'apoa1', metric_name: 'ApoA1', value: 140, unit: 'mg/dL', record_origin: 'patient_lab' },
      { collected_at: '2026-08-01', metric_key: 'triglycerides', metric_name: 'Triglicérides', value: 100, unit: 'mg/dL', record_origin: 'patient_lab' },
      { collected_at: '2026-08-01', metric_key: 'hdl_cholesterol', metric_name: 'Colesterol HDL', value: 50, unit: 'mg/dL', record_origin: 'patient_lab' },
      { collected_at: '2026-08-01', metric_key: 'total_cholesterol', metric_name: 'Colesterol Total', value: 190, unit: 'mg/dL', record_origin: 'patient_lab' },
      { collected_at: '2026-08-01', metric_key: 'ldl_cholesterol', metric_name: 'Colesterol LDL', value: 110, unit: 'mg/dL', record_origin: 'patient_lab' },
    ];

    render(<CardiovascularRatios clinicalLabs={mockLabs} />);

    // Deve exibir 3 tags "Calculado"
    const badges = screen.getAllByText('Calculado');
    expect(badges).toHaveLength(3);

    // Razão ApoB / ApoA1: 70 / 140 = 0.50
    expect(screen.getByTestId('ratio-apob-apoa1')).toHaveTextContent('0.50');
    expect(screen.getByText(/ApoB ÷ ApoA1/i)).toBeInTheDocument();

    // Razão TG / HDL: 100 / 50 = 2.00
    expect(screen.getByTestId('ratio-tg-hdl')).toHaveTextContent('2.00');
    expect(screen.getByText(/Triglicérides ÷ HDL/i)).toBeInTheDocument();

    // Colesterol Remanescente: 190 - 50 - 110 = 30.0 mg/dL
    expect(screen.getByTestId('remnant-cholesterol')).toHaveTextContent('30.0 mg/dL');
    expect(screen.getByText(/Total - HDL - LDL/i)).toBeInTheDocument();
  });

  it('renders fallback placeholders when components are missing', () => {
    render(<CardiovascularRatios clinicalLabs={[]} />);
    expect(screen.getByText('(Sem ApoB/A1)')).toBeInTheDocument();
    expect(screen.getByText('(Sem TG/HDL)')).toBeInTheDocument();
    expect(screen.getByText('(Sem dados)')).toBeInTheDocument();
  });
});
