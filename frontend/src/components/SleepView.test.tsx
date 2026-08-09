import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { SleepView } from './SleepView';

// Global fetch mock
const mockFetch = vi.fn();
(globalThis as any).fetch = mockFetch;

const mockSleepMetrics = [
  {
    date_ref: '2026-08-08',
    sleep_minutes: 450,
    sleep_deep_min: 62,
    sleep_rem_min: 74,
    sleep_light_min: 216,
    sleep_awake_min: 8,
    hrv_ms: 45.2,
    rhr_bpm: 54.0,
    source: 'Zepp',
  },
  {
    date_ref: '2026-08-07',
    sleep_minutes: 420,
    sleep_deep_min: 55,
    sleep_rem_min: 68,
    sleep_light_min: 200,
    sleep_awake_min: 15,
    hrv_ms: 42.0,
    rhr_bpm: 56.0,
    source: 'Zepp',
  },
];

describe('SleepView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders sleep loading state and then sleep dashboard and chart', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify(mockSleepMetrics),
    });

    render(<SleepView />);

    expect(screen.getByText(/Carregando histórico de sono.../i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Monitoramento & Fases do Sono')).toBeInTheDocument();
    });

    expect(screen.getByText('Distribuição de Fases do Sono')).toBeInTheDocument();
    expect(screen.getByText('Histórico Completo de Registros do Sono (2)')).toBeInTheDocument();
  });

  it('filters table by date search term', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify(mockSleepMetrics),
    });

    render(<SleepView />);

    await waitFor(() => {
      expect(screen.getByText('08/08/2026')).toBeInTheDocument();
      expect(screen.getByText('07/08/2026')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Filtrar por data/i);
    fireEvent.change(searchInput, { target: { value: '2026-08-08' } });

    expect(screen.getByText('08/08/2026')).toBeInTheDocument();
    expect(screen.queryByText('07/08/2026')).not.toBeInTheDocument();
  });

  it('switches chart range selector', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify(mockSleepMetrics),
    });

    render(<SleepView />);

    await waitFor(() => {
      expect(screen.getByText('Distribuição de Fases do Sono')).toBeInTheDocument();
    });

    const btn30d = screen.getByRole('button', { name: '30d' });
    fireEvent.click(btn30d);

    expect(btn30d).toHaveClass('bg-indigo-600');
  });
});
