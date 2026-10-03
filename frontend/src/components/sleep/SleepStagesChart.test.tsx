import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SleepStagesChart } from './SleepStagesChart';
import { DailyMetric } from './types';

const mockDailyMetrics: DailyMetric[] = [
  {
    date_ref: '2026-09-02',
    sleep_minutes: 480,
    sleep_deep_min: 90,
    sleep_rem_min: 110,
    sleep_light_min: 250,
    sleep_awake_min: 30,
    respiratory_rate_rpm: 14.5,
    source: 'Zepp',
  },
  {
    date_ref: '2026-09-01',
    sleep_minutes: 420,
    sleep_deep_min: 60,
    sleep_rem_min: 80,
    sleep_light_min: 240,
    sleep_awake_min: 40,
    respiratory_rate_rpm: 15.0,
    source: 'Zepp',
  },
];

describe('SleepStagesChart (UX_UI_57)', () => {
  it('renders chart with period summary metrics (duration, efficiency, deep, REM - U22-P1-65)', () => {
    render(
      <SleepStagesChart
        chartData={mockDailyMetrics}
        chartRange="last20"
        onChartRangeChange={vi.fn()}
        selectedMonth="all"
        monthlySummaries={[]}
        onClearMonthFilter={vi.fn()}
      />
    );

    expect(screen.getByText('Distribuição de Fases do Sono')).toBeInTheDocument();
    expect(screen.getByText('Duração Média')).toBeInTheDocument();
    expect(screen.getByText('Eficiência Média')).toBeInTheDocument();
    expect(screen.getByText('Sono Profundo Médio')).toBeInTheDocument();
    expect(screen.getByText('Sono REM Médio')).toBeInTheDocument();
  });

  it('provides accessible keyboard focus on stacked bars (U22-P1-35 / U22-P1-64)', () => {
    render(
      <SleepStagesChart
        chartData={mockDailyMetrics}
        chartRange="last20"
        onChartRangeChange={vi.fn()}
        selectedMonth="all"
        monthlySummaries={[]}
        onClearMonthFilter={vi.fn()}
      />
    );

    const barBtn = screen.getByRole('button', {
      name: /Estágios do sono em 2026-09-02/i,
    });
    expect(barBtn).toBeInTheDocument();

    // Focus triggers tooltip update
    fireEvent.focus(barBtn);
    expect(screen.getByRole('region', { name: /Detalhes do sono de 2026-09-02/i })).toBeInTheDocument();

    // Pressing Enter keeps it selected
    fireEvent.keyDown(barBtn, { key: 'Enter' });
    expect(screen.getByRole('region', { name: /Detalhes do sono de 2026-09-02/i })).toBeInTheDocument();
  });

  it('switches between interactive chart and accessible semantic table (U22-P1-35 / U22-P1-64)', () => {
    render(
      <SleepStagesChart
        chartData={mockDailyMetrics}
        chartRange="last20"
        onChartRangeChange={vi.fn()}
        selectedMonth="all"
        monthlySummaries={[]}
        onClearMonthFilter={vi.fn()}
      />
    );

    const chartBtn = screen.getByRole('button', { name: 'Gráfico' });
    const tableBtn = screen.getByRole('button', { name: 'Tabela' });

    expect(chartBtn).toHaveAttribute('aria-pressed', 'true');
    expect(tableBtn).toHaveAttribute('aria-pressed', 'false');

    // Click Tabela
    fireEvent.click(tableBtn);
    expect(tableBtn).toHaveAttribute('aria-pressed', 'true');
    expect(chartBtn).toHaveAttribute('aria-pressed', 'false');

    // Semantic table is now rendered
    const table = screen.getByRole('table', { name: /Tabela detalhada de estágios do sono/i });
    expect(table).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Duração Total' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Profundo' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'REM' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Eficiência' })).toBeInTheDocument();

    // Verify row data
    expect(screen.getByText('2026-09-02')).toBeInTheDocument();
    expect(screen.getByText('2026-09-01')).toBeInTheDocument();
  });

  it('renders EmptyState when chartData is empty', () => {
    render(
      <SleepStagesChart
        chartData={[]}
        chartRange="last20"
        onChartRangeChange={vi.fn()}
        selectedMonth="all"
        monthlySummaries={[]}
        onClearMonthFilter={vi.fn()}
      />
    );

    expect(screen.getByText('Sem registros de sono no período')).toBeInTheDocument();
  });
});
