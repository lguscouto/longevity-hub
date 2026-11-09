import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DerivedBiomarkersPanel } from './DerivedBiomarkersPanel';
import { requestJson } from '../../lib/api';

vi.mock('../../lib/api', () => ({
  requestJson: vi.fn(),
  ApiError: class ApiError extends Error {
    status: number;
    constructor(message: string, status = 500) {
      super(message);
      this.status = status;
    }
  },
}));

const mockedRequestJson = vi.mocked(requestJson);

const mockResponse = {
  collected_at: '2026-03-10',
  available_dates: ['2026-03-10', '2026-01-15'],
  cohort: 'nhanes',
  metrics_by_category: {
    biological_age: [
      {
        metric_id: 'phenoage',
        display_name: 'PhenoAge (Levine 2018)',
        category: 'biological_age',
        status: 'calculated',
        value: 41.25,
        unit: 'anos',
        algorithm_version: 'levine-2018-gompertz-v1',
        source: 'Levine et al. 2018',
        source_url: 'https://doi.org/10.18632/aging.101414',
        missing_inputs: [],
        limitations: ['Válido para adultos'],
      },
      {
        metric_id: 'prevent_cvd',
        display_name: 'PREVENT CVD Risk',
        category: 'biological_age',
        status: 'blocked_reference',
        value: null,
        unit: '%',
        algorithm_version: 'aha-prevent-2023-v1',
        missing_inputs: [],
        limitations: ['Aguardando validação'],
      },
    ],
    metabolic_insulin: [
      {
        metric_id: 'homa_ir',
        display_name: 'HOMA-IR',
        category: 'metabolic_insulin',
        status: 'calculated',
        value: 1.45,
        unit: null,
        algorithm_version: 'matthews-1985-v1',
        missing_inputs: [],
      },
      {
        metric_id: 'mcauley_index',
        display_name: 'McAuley Index',
        category: 'metabolic_insulin',
        status: 'missing_inputs',
        value: null,
        unit: null,
        algorithm_version: 'mcauley-2001-v1',
        missing_inputs: ['fasting_insulin', 'triglycerides'],
      },
    ],
  },
  direct_biomarkers_series: {},
};

describe('DerivedBiomarkersPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders panel title, categories, and metrics with status badges', async () => {
    mockedRequestJson.mockResolvedValueOnce(mockResponse as any);

    render(<DerivedBiomarkersPanel currentSelectedDate="2026-03-10" />);

    expect(screen.getByText(/Painel de Biomarcadores Derivados/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('PhenoAge (Levine 2018)')).toBeInTheDocument();
    });

    // Check calculated status badge and formatted value
    expect(screen.getByText('41.25 anos')).toBeInTheDocument();
    const calculatedBadges = screen.getAllByText('Calculado');
    expect(calculatedBadges.length).toBeGreaterThan(0);

    // Check blocked reference status badge
    expect(screen.getByText('Pendente ref.')).toBeInTheDocument();

    // Check missing inputs status badge
    expect(screen.getByText('Faltam insumos (2)')).toBeInTheDocument();
  });

  it('handles cohort selector changes and triggers re-fetch with new cohort', async () => {
    mockedRequestJson.mockResolvedValue(mockResponse as any);

    render(<DerivedBiomarkersPanel currentSelectedDate="2026-03-10" />);

    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: /Coorte/i })).toBeInTheDocument();
    });

    const cohortSelect = screen.getByRole('combobox', { name: /Coorte/i });
    fireEvent.change(cohortSelect, { target: { value: 'ukb' } });

    await waitFor(() => {
      expect(mockedRequestJson).toHaveBeenCalledWith(
        expect.stringContaining('cohort=ukb')
      );
    });
  });

  it('handles date selector changes and triggers re-fetch with new date', async () => {
    mockedRequestJson.mockResolvedValue(mockResponse as any);

    render(<DerivedBiomarkersPanel currentSelectedDate="2026-03-10" />);

    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: /Data do laudo:/i })).toBeInTheDocument();
    });

    const dateSelect = screen.getByRole('combobox', { name: /Data do laudo:/i });
    fireEvent.change(dateSelect, { target: { value: '2026-01-15' } });

    await waitFor(() => {
      expect(mockedRequestJson).toHaveBeenCalledWith(
        expect.stringContaining('date=2026-01-15')
      );
    });
  });

  it('displays error message when request fails', async () => {
    mockedRequestJson.mockRejectedValueOnce(new Error('Falha na rede'));

    render(<DerivedBiomarkersPanel currentSelectedDate="2026-03-10" />);

    await waitFor(() => {
      expect(screen.getByText(/Falha ao carregar biomarcadores derivados/i)).toBeInTheDocument();
    });
  });
});
