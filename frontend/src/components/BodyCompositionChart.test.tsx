import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { BodyCompositionChart, TimelineData } from './BodyCompositionChart';

// Global fetch mock
const mockFetch = vi.fn();
(globalThis as any).fetch = mockFetch;

const mockTimelineData: TimelineData = {
  target_weight_kg: 75.0,
  points: [
    {
      date: '2026-05-01',
      weight_kg: 82.0,
      body_fat_pct: 20.0,
      lean_mass_kg: 65.6,
      fat_mass_kg: 16.4,
      source: 'Zepp',
      is_physical_assessment: false,
      assessment_id: null,
      assessment_title: null,
      photo_count: 0,
      waist_cm: null,
      abdomen_cm: null,
      hip_cm: null,
    },
    {
      date: '2026-06-01',
      weight_kg: 80.0,
      body_fat_pct: 18.5,
      lean_mass_kg: 65.2,
      fat_mass_kg: 14.8,
      source: 'GoogleHealth',
      is_physical_assessment: false,
      assessment_id: null,
      assessment_title: null,
      photo_count: 0,
      waist_cm: null,
      abdomen_cm: null,
      hip_cm: null,
    },
    {
      date: '2026-07-01',
      weight_kg: 78.5,
      body_fat_pct: 16.5,
      lean_mass_kg: 65.55,
      fat_mass_kg: 12.95,
      source: 'Avaliação Física',
      is_physical_assessment: true,
      assessment_id: 'ass-xyz',
      assessment_title: 'Avaliação Trimestral',
      photo_count: 3,
      waist_cm: 81.0,
      abdomen_cm: 83.0,
      hip_cm: 98.0,
    },
  ],
  summary: {
    latest_weight_kg: 78.5,
    weight_delta: -3.5,
    latest_body_fat_pct: 16.5,
    body_fat_delta: -3.5,
    latest_lean_mass_kg: 65.55,
    lean_mass_delta: -0.05,
    total_points: 3,
    assessment_count: 1,
  },
};

describe('BodyCompositionChart', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state and then chart with KPIs', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockTimelineData,
    });

    render(<BodyCompositionChart />);

    expect(screen.getByText(/Carregando evolução da composição corporal/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Evolução da Composição Corporal')).toBeInTheDocument();
    });

    // Check KPI values
    expect(screen.getByText('78.5 kg')).toBeInTheDocument();
    expect(screen.getByText('-3.5 kg')).toBeInTheDocument();
    expect(screen.getByText('16.5%')).toBeInTheDocument();
    expect(screen.getByText('-3.5%')).toBeInTheDocument();
    expect(screen.getByText('65.55 kg')).toBeInTheDocument();
    expect(screen.getByText('Meta:')).toBeInTheDocument();
    expect(screen.getByText('75 kg')).toBeInTheDocument();
  });

  it('switches between view modes (tabs)', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockTimelineData,
    });

    render(<BodyCompositionChart />);

    await waitFor(() => {
      expect(screen.getByText('Evolução da Composição Corporal')).toBeInTheDocument();
    });

    // Switch to Massa Magra vs Gorda
    const compTab = screen.getByRole('button', { name: /Massa Magra vs. Gorda/i });
    fireEvent.click(compTab);
    expect(compTab.className).toContain('from-cyan-500');

    // Switch to Medidas (cm)
    const measurementsTab = screen.getByRole('button', { name: /Medidas \(cm\)/i });
    fireEvent.click(measurementsTab);
    expect(measurementsTab.className).toContain('from-purple-500');

    // Switch back to Peso & % Gordura
    const weightTab = screen.getByRole('button', { name: /Peso & % Gordura/i });
    fireEvent.click(weightTab);
    expect(weightTab.className).toContain('from-emerald-500');
  });

  it('switches time range filters', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockTimelineData,
    });

    render(<BodyCompositionChart />);

    await waitFor(() => {
      expect(screen.getByText('Evolução da Composição Corporal')).toBeInTheDocument();
    });

    const range1M = screen.getByRole('button', { name: '1M' });
    fireEvent.click(range1M);
    expect(range1M.className).toContain('bg-slate-800');

    const rangeAll = screen.getByRole('button', { name: 'Tudo' });
    fireEvent.click(rangeAll);
    expect(rangeAll.className).toContain('bg-slate-800');
  });

  it('renders nothing when there are 0 points', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        target_weight_kg: null,
        points: [],
        summary: {
          latest_weight_kg: null,
          weight_delta: null,
          latest_body_fat_pct: null,
          body_fat_delta: null,
          latest_lean_mass_kg: null,
          lean_mass_delta: null,
          total_points: 0,
          assessment_count: 0,
        },
      }),
    });

    const { container } = render(<BodyCompositionChart />);

    await waitFor(() => {
      expect(screen.queryByText(/Carregando evolução/i)).not.toBeInTheDocument();
    });

    expect(container.firstChild).toBeNull();
  });
});
