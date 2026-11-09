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
  context: {
    chronological_age: 45.0,
    biological_sex: 'male',
  },
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
        source: 'Matthews et al., 1985 (Diabetologia)',
        source_url: 'https://doi.org/10.1007/BF00280883',
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

  it('renders panel title, Hero Bar KPI summary, and metrics with contextual badges', async () => {
    mockedRequestJson.mockResolvedValueOnce(mockResponse as any);

    render(<DerivedBiomarkersPanel currentSelectedDate="2026-03-10" />);

    expect(screen.getByText(/Painel de Biomarcadores Derivados/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('PhenoAge (Levine 2018)')).toBeInTheDocument();
    });

    // Check Hero Bar KPI counters
    expect(screen.getByText('Faixa Normal')).toBeInTheDocument();
    expect(screen.getByText('Faixa Ótima')).toBeInTheDocument();
    expect(screen.getAllByText('Pendentes').length).toBeGreaterThanOrEqual(1);

    // Check calculated status badge and formatted value
    expect(screen.getByText('41.25 anos')).toBeInTheDocument();
    expect(screen.getByText('1.45')).toBeInTheDocument();

    // PhenoAge evaluated with age 45 (gap = 41.25 - 45 = -3.75 -> Ótimo)
    expect(screen.getByText('Ótimo')).toBeInTheDocument();

    // HOMA-IR 1.45 is Normal
    expect(screen.getByText('Normal')).toBeInTheDocument();

    // Check clinical note
    expect(screen.getByText(/Sensibilidade à insulina dentro do padrão basal esperado/i)).toBeInTheDocument();

    // Check blocked reference status badge
    expect(screen.getByText('Pendente ref.')).toBeInTheDocument();

    // Check missing inputs status badge
    expect(screen.getByText('Faltam insumos (2)')).toBeInTheDocument();
    expect(screen.getByText(/Requer: fasting_insulin, triglycerides/i)).toBeInTheDocument();

    // Check scientific source citation link
    expect(screen.getByText('Matthews et al., 1985 (Diabetologia)')).toBeInTheDocument();
  });

  it('filters metrics in real time via search input', async () => {
    mockedRequestJson.mockResolvedValue(mockResponse as any);

    render(<DerivedBiomarkersPanel currentSelectedDate="2026-03-10" />);

    await waitFor(() => {
      expect(screen.getByText('PhenoAge (Levine 2018)')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Buscar por nome, sigla ou conceito/i);
    fireEvent.change(searchInput, { target: { value: 'homa' } });

    // HOMA-IR should still be visible
    expect(screen.getByText('HOMA-IR')).toBeInTheDocument();

    // PhenoAge should be filtered out
    expect(screen.queryByText('PhenoAge (Levine 2018)')).not.toBeInTheDocument();
  });

  it('filters metrics by status using quick filter buttons', async () => {
    mockedRequestJson.mockResolvedValue(mockResponse as any);

    render(<DerivedBiomarkersPanel currentSelectedDate="2026-03-10" />);

    await waitFor(() => {
      expect(screen.getByText('PhenoAge (Levine 2018)')).toBeInTheDocument();
    });

    // Click "Pendentes" filter
    const pendentesFilterBtn = screen.getByRole('button', { name: 'Pendentes' });
    fireEvent.click(pendentesFilterBtn);

    // Calculated metrics (PhenoAge, HOMA-IR) should be filtered out
    expect(screen.queryByText('PhenoAge (Levine 2018)')).not.toBeInTheDocument();
    expect(screen.queryByText('HOMA-IR')).not.toBeInTheDocument();

    // Pending metrics should remain visible
    expect(screen.getByText('PREVENT CVD Risk')).toBeInTheDocument();
    expect(screen.getByText('McAuley Index')).toBeInTheDocument();
  });

  it('triggers persistent recalculation when clicking Recalcular button', async () => {
    mockedRequestJson.mockResolvedValueOnce(mockResponse as any);
    mockedRequestJson.mockResolvedValueOnce(mockResponse as any);
    const onRefreshMock = vi.fn();

    render(
      <DerivedBiomarkersPanel
        currentSelectedDate="2026-03-10"
        onRefreshData={onRefreshMock}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Recalcular/i })).toBeInTheDocument();
    });

    const recalcBtn = screen.getByRole('button', { name: /Recalcular/i });
    fireEvent.click(recalcBtn);

    await waitFor(() => {
      expect(mockedRequestJson).toHaveBeenCalledWith(
        expect.stringContaining('/api/biomarkers/derived/recalculate'),
        expect.objectContaining({ method: 'POST' })
      );
    });

    await waitFor(() => {
      expect(screen.getByText(/Biomarcadores recalculados e persistidos com sucesso/i)).toBeInTheDocument();
    });
    expect(onRefreshMock).toHaveBeenCalled();
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

  it('filters metrics with diacritic insensitivity (accent-free search matches accented text)', async () => {
    mockedRequestJson.mockResolvedValue(mockResponse as any);

    render(<DerivedBiomarkersPanel currentSelectedDate="2026-03-10" />);

    await waitFor(() => {
      expect(screen.getByText('PhenoAge (Levine 2018)')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Buscar por nome, sigla ou conceito/i);
    // User types "otimo" without accent, should match PhenoAge whose badge is "Ótimo"
    fireEvent.change(searchInput, { target: { value: 'otimo' } });

    expect(screen.getByText('PhenoAge (Levine 2018)')).toBeInTheDocument();
    expect(screen.queryByText('HOMA-IR')).not.toBeInTheDocument();

    // User types "padrao" without accent, should match HOMA-IR note ("...padrão basal...")
    fireEvent.change(searchInput, { target: { value: 'padrao' } });
    expect(screen.getByText('HOMA-IR')).toBeInTheDocument();
    expect(screen.queryByText('PhenoAge (Levine 2018)')).not.toBeInTheDocument();
  });

  it('filters metrics by clicking specific Hero Bar KPI cards (Ótimo, Normal, Pendentes)', async () => {
    mockedRequestJson.mockResolvedValue(mockResponse as any);

    render(<DerivedBiomarkersPanel currentSelectedDate="2026-03-10" />);

    await waitFor(() => {
      expect(screen.getByText('PhenoAge (Levine 2018)')).toBeInTheDocument();
    });

    // Click "Faixa Ótima" KPI card
    const otimaCard = screen.getByText('Faixa Ótima').closest('div[role="button"]')!;
    fireEvent.click(otimaCard);

    // PhenoAge is Ótimo -> visible; HOMA-IR is Normal -> hidden
    expect(screen.getByText('PhenoAge (Levine 2018)')).toBeInTheDocument();
    expect(screen.queryByText('HOMA-IR')).not.toBeInTheDocument();
    expect(screen.queryByText('PREVENT CVD Risk')).not.toBeInTheDocument();

    // Click "Faixa Normal" KPI card
    const normalCard = screen.getByText('Faixa Normal').closest('div[role="button"]')!;
    fireEvent.click(normalCard);

    // HOMA-IR is Normal -> visible; PhenoAge is Ótimo -> hidden
    expect(screen.getByText('HOMA-IR')).toBeInTheDocument();
    expect(screen.queryByText('PhenoAge (Levine 2018)')).not.toBeInTheDocument();
  });

  it('displays empty state when no biomarkers match filters and resets with Limpar filtros button', async () => {
    mockedRequestJson.mockResolvedValue(mockResponse as any);

    render(<DerivedBiomarkersPanel currentSelectedDate="2026-03-10" />);

    await waitFor(() => {
      expect(screen.getByText('PhenoAge (Levine 2018)')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Buscar por nome, sigla ou conceito/i);
    fireEvent.change(searchInput, { target: { value: 'termoinexistente123' } });

    expect(screen.getByText('Nenhum biomarcador encontrado')).toBeInTheDocument();
    expect(screen.getByText(/Nenhum indicador corresponde aos termos de busca/i)).toBeInTheDocument();

    // Click "Limpar filtros" button
    const clearBtn = screen.getByRole('button', { name: /Limpar filtros/i });
    fireEvent.click(clearBtn);

    // Both categories and metrics should be restored
    await waitFor(() => {
      expect(screen.getByText('PhenoAge (Levine 2018)')).toBeInTheDocument();
      expect(screen.getByText('HOMA-IR')).toBeInTheDocument();
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
