import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BiomarkersView } from './BiomarkersView';

vi.mock('./DerivedBiomarkersPanel', () => ({ DerivedBiomarkersPanel: () => <div>Painel derivado</div> }));

describe('BiomarkersView', () => {
  it('keeps cardiovascular ratios for eligible legacy markers', () => {
    render(<BiomarkersView labs={[
      { collected_at: '2026-07-30', metric_key: 'triglycerides', metric_name: 'Triglicérides', value: 90, unit: 'mg/dL', record_origin: 'patient_lab' },
      { collected_at: '2026-07-30', metric_key: 'hdl', metric_name: 'Colesterol HDL', value: 60, unit: 'mg/dL', record_origin: 'patient_lab' },
      { collected_at: '2026-07-30', metric_key: 'total_cholesterol', metric_name: 'Colesterol Total', value: 180, unit: 'mg/dL', record_origin: 'patient_lab' },
      { collected_at: '2026-07-30', metric_key: 'ldl', metric_name: 'Colesterol LDL', value: 100, unit: 'mg/dL', record_origin: 'patient_lab' },
    ]} />);
    expect(screen.getByText('1.50')).toBeInTheDocument();
    expect(screen.getByText('20.0 mg/dL')).toBeInTheDocument();
    expect(screen.getByText('Painel derivado')).toBeInTheDocument();
  });

  it('excludes results without clinical provenance from ratios', () => {
    render(<BiomarkersView labs={[
      { collected_at: '2026-07-30', metric_key: 'triglycerides', metric_name: 'Triglicérides', value: 90, unit: 'mg/dL' },
      { collected_at: '2026-07-30', metric_key: 'hdl', metric_name: 'Colesterol HDL', value: 60, unit: 'mg/dL' },
    ]} />);
    expect(screen.getByText('(Sem TG/HDL)')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/não entram nos cálculos/i);
  });

  it('distinguishes loading failure from absent data', () => {
    render(<BiomarkersView labs={[]} labsLoadError />);
    expect(screen.getByRole('status')).toHaveTextContent(/não foi possível carregar/i);
    expect(screen.queryByText('(Sem TG/HDL)')).not.toBeInTheDocument();
    expect(screen.getByText('Painel derivado')).toBeInTheDocument();
  });
});
