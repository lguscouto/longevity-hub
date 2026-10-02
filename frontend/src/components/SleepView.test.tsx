import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { SleepView } from './SleepView';

// Global fetch mock
const mockFetch = vi.fn();
(globalThis as any).fetch = mockFetch;

const mockSleepMetrics = [
  // Setembro de 2026
  {
    date_ref: '2026-09-02',
    sleep_minutes: 510,
    sleep_deep_min: 80,
    sleep_rem_min: 90,
    sleep_light_min: 310,
    sleep_awake_min: 30,
    hrv_ms: 50.0,
    rhr_bpm: 52.0,
    source: 'Zepp',
  },
  {
    date_ref: '2026-09-01',
    sleep_minutes: 490,
    sleep_deep_min: 70,
    sleep_rem_min: 85,
    sleep_light_min: 305,
    sleep_awake_min: 30,
    hrv_ms: 48.0,
    rhr_bpm: 54.0,
    source: 'Zepp',
  },
  // Agosto de 2026
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

  it('renders sleep loading state and then sleep dashboard, month filter bar and monthly table', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify(mockSleepMetrics),
    });

    render(<SleepView />);

    expect(screen.getByText(/Carregando histórico de sono.../i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Monitoramento & Fases do Sono')).toBeInTheDocument();
    });

    // Month filter bar elements
    expect(screen.getByText('Filtrar por Mês:')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Selecionar Mês' })).toBeInTheDocument();

    // Monthly averages comparison table
    expect(screen.getByText('Médias de Sono de Cada Mês')).toBeInTheDocument();
    expect(screen.getByText('Setembro de 2026')).toBeInTheDocument();
    expect(screen.getByText('Agosto de 2026')).toBeInTheDocument();

    expect(screen.getByText('Distribuição de Fases do Sono')).toBeInTheDocument();
    expect(screen.getByText('Histórico Completo de Registros do Sono (4)')).toBeInTheDocument();
  });

  it('filters by month using the select dropdown and recalculates monthly KPIs', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify(mockSleepMetrics),
    });

    render(<SleepView />);

    await waitFor(() => {
      expect(screen.getByText('Monitoramento & Fases do Sono')).toBeInTheDocument();
    });

    const monthSelect = screen.getByRole('combobox', { name: 'Selecionar Mês' });

    // Select September 2026: (510 + 490) / 2 = 500 min = 8h 20m
    fireEvent.change(monthSelect, { target: { value: '2026-09' } });

    // Active context banner should indicate September
    expect(screen.getByText('Médias do mês:')).toBeInTheDocument();
    expect(screen.getAllByText(/2 noites/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText('8h 20m').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('49 ms').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('53 bpm').length).toBeGreaterThanOrEqual(1);

    // Table header updates to September
    expect(screen.getByText(/Histórico de Registros do Sono - Setembro de 2026 \(2\)/i)).toBeInTheDocument();

    // Only September rows should be visible in table
    expect(screen.getByText('02/09/2026')).toBeInTheDocument();
    expect(screen.getByText('01/09/2026')).toBeInTheDocument();
    expect(screen.queryByText('08/08/2026')).not.toBeInTheDocument();

    // Reset back to All via "Limpar filtro"
    const clearBtn = screen.getByText('Limpar filtro');
    fireEvent.click(clearBtn);

    expect(screen.getByText('Histórico Completo de Registros do Sono (4)')).toBeInTheDocument();
    expect(screen.getByText('08/08/2026')).toBeInTheDocument();
  });

  it('filters by month using quick pill buttons', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify(mockSleepMetrics),
    });

    render(<SleepView />);

    await waitFor(() => {
      expect(screen.getByText('Monitoramento & Fases do Sono')).toBeInTheDocument();
    });

    // Click on Ago/26 pill
    const agoPill = screen.getByRole('button', { name: /Ago\/26/i });
    fireEvent.click(agoPill);

    expect(screen.getByText(/Histórico de Registros do Sono - Agosto de 2026 \(2\)/i)).toBeInTheDocument();
    expect(screen.getByText('08/08/2026')).toBeInTheDocument();
    expect(screen.queryByText('02/09/2026')).not.toBeInTheDocument();

    // Click on Todos pill
    const todosPill = screen.getByRole('button', { name: 'Todos' });
    fireEvent.click(todosPill);

    expect(screen.getByText('Histórico Completo de Registros do Sono (4)')).toBeInTheDocument();
  });

  it('filters by clicking row action in the monthly averages comparison table', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify(mockSleepMetrics),
    });

    render(<SleepView />);

    await waitFor(() => {
      expect(screen.getByText('Médias de Sono de Cada Mês')).toBeInTheDocument();
    });

    // Click on "Filtrar Mês" button for September in the monthly table
    const filterButtons = screen.getAllByRole('button', { name: 'Filtrar Mês' });
    expect(filterButtons.length).toBe(2);

    fireEvent.click(filterButtons[0]); // First is newest (September)

    expect(screen.getByText(/Histórico de Registros do Sono - Setembro de 2026 \(2\)/i)).toBeInTheDocument();
  });

  it('toggles monthly comparison table visibility', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify(mockSleepMetrics),
    });

    render(<SleepView />);

    await waitFor(() => {
      expect(screen.getByText('Médias de Sono de Cada Mês')).toBeInTheDocument();
    });

    const toggleBtn = screen.getByRole('button', { name: /Ocultar Quadro Mensal/i });
    fireEvent.click(toggleBtn);

    expect(screen.queryByText('Médias de Sono de Cada Mês')).not.toBeInTheDocument();

    const showBtn = screen.getByRole('button', { name: /Ver Quadro Mensal/i });
    fireEvent.click(showBtn);

    expect(screen.getByText('Médias de Sono de Cada Mês')).toBeInTheDocument();
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

    const btn30d = screen.getByRole('radio', { name: /30d/i });
    fireEvent.click(btn30d);

    expect(btn30d).toHaveClass('bg-indigo-600');
  });

  it('renders sleep start, wake time, efficiency and respiratory rate across cards, monthly table and historical table', async () => {
    const metricsWithCircadian = [
      {
        date_ref: '2026-10-01',
        sleep_minutes: 404,
        sleep_deep_min: 64,
        sleep_rem_min: 106,
        sleep_light_min: 234,
        sleep_awake_min: 40,
        sleep_start: '2026-09-30T22:38:00-03:00',
        sleep_end: '2026-10-01T06:02:00-03:00',
        respiratory_rate_rpm: 16.2,
        hrv_ms: 55.0,
        rhr_bpm: 50.0,
        source: 'Zepp',
      },
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify(metricsWithCircadian),
    });

    render(<SleepView />);

    await waitFor(() => {
      expect(screen.getByText('Monitoramento & Fases do Sono')).toBeInTheDocument();
    });

    // Circadian KPI cards
    expect(screen.getByText('Média Dormir')).toBeInTheDocument();
    expect(screen.getByText('Média Acordar')).toBeInTheDocument();
    expect(screen.getByText('Regularidade')).toBeInTheDocument();
    expect(screen.getByText('Taxa Respiratória')).toBeInTheDocument();

    // Table columns & cards
    expect(screen.getByText('Dormiu')).toBeInTheDocument();
    expect(screen.getByText('Acordou')).toBeInTheDocument();
    expect(screen.getAllByText('Eficiência').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Taxa Resp.').length).toBeGreaterThanOrEqual(1);

    // Table row values
    expect(screen.getAllByText('22:38').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('30/09/2026').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('06:02').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('01/10/2026').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('16.2 rpm').length).toBeGreaterThanOrEqual(1);
    // 404 / (404 + 40) = 404 / 444 = 91%
    expect(screen.getAllByText('91%').length).toBeGreaterThanOrEqual(1);
  });

  it('applies combined efficiency badge rule: flags high efficiency with short sleep (< 6h) as Sono Curto in amber', async () => {
    const metricsWithShortSleep = [
      {
        date_ref: '2026-09-28',
        sleep_minutes: 267, // 4h 27m (< 6h)
        sleep_deep_min: 51,
        sleep_rem_min: 75,
        sleep_light_min: 141,
        sleep_awake_min: 33, // 267 / 300 = 89%
        sleep_start: '2026-09-27T23:56:00-03:00',
        sleep_end: '2026-09-28T04:56:00-03:00',
        respiratory_rate_rpm: 16.6,
        source: 'Zepp',
      },
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify(metricsWithShortSleep),
    });

    render(<SleepView />);

    await waitFor(() => {
      expect(screen.getByText('Monitoramento & Fases do Sono')).toBeInTheDocument();
    });

    // 89% should be displayed with "Sono Curto" tag in KPI Card, Monthly Table, and Daily Table
    expect(screen.getAllByText('89%').length).toBeGreaterThanOrEqual(1);
    const shortBadges = screen.getAllByText('Sono Curto');
    expect(shortBadges.length).toBeGreaterThanOrEqual(3);

    // Should have amber badge class and informative tooltip for short sleep
    const tableBadge = shortBadges[shortBadges.length - 1].closest('span[title]');
    expect(tableBadge).toHaveClass('text-amber-700');
    expect(tableBadge?.getAttribute('title')).toContain('sono curto (< 6h');
  });
});

