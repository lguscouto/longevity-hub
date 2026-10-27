import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { DailyStepsView } from './DailyStepsView';
import { StepsAnalyticsResponse } from './types';

const mockStepsResponse: StepsAnalyticsResponse = {
  summary: {
    total_days: 30,
    total_steps: 285000,
    overall_avg_steps: 9500,
    max_steps: 16851,
    max_steps_date: '2026-10-22',
    min_steps: 4200,
    min_steps_date: '2026-10-05',
    current_streak_goal_days: 5,
    best_streak_goal_days: 12,
    days_above_goal: 22,
    goal_completion_rate_pct: 73.3,
    default_goal: 8000,
    total_calories: 12800,
    total_distance_km: 215.4,
    avg_distance_km: 7.18,
    total_active_minutes: 2100,
    avg_active_minutes: 70,
  },
  weekly_stats: [
    {
      week_key: '2026-W43',
      week_label: '20/10 a 26/10',
      start_date: '2026-10-20',
      end_date: '2026-10-26',
      days_recorded: 7,
      total_steps: 68500,
      avg_steps: 9785,
      goal_met_days: 5,
      goal_hit_pct: 71.4,
      max_steps: 16851,
      trend_vs_previous_pct: 12.5,
    },
    {
      week_key: '2026-W42',
      week_label: '13/10 a 19/10',
      start_date: '2026-10-13',
      end_date: '2026-10-19',
      days_recorded: 7,
      total_steps: 60880,
      avg_steps: 8697,
      goal_met_days: 4,
      goal_hit_pct: 57.1,
      max_steps: 13763,
      trend_vs_previous_pct: -3.2,
    },
  ],
  weekday_averages: [
    { weekday: 0, day_name: 'Segunda-feira', short_name: 'Seg', avg_steps: 9100, days_count: 4, goal_hit_pct: 75.0 },
    { weekday: 1, day_name: 'Terça-feira', short_name: 'Ter', avg_steps: 9800, days_count: 4, goal_hit_pct: 75.0 },
    { weekday: 2, day_name: 'Quarta-feira', short_name: 'Qua', avg_steps: 9400, days_count: 4, goal_hit_pct: 75.0 },
    { weekday: 3, day_name: 'Quinta-feira', short_name: 'Qui', avg_steps: 11200, days_count: 5, goal_hit_pct: 80.0 },
    { weekday: 4, day_name: 'Sexta-feira', short_name: 'Sex', avg_steps: 10400, days_count: 4, goal_hit_pct: 75.0 },
    { weekday: 5, day_name: 'Sábado', short_name: 'Sáb', avg_steps: 12100, days_count: 5, goal_hit_pct: 100.0 },
    { weekday: 6, day_name: 'Domingo', short_name: 'Dom', avg_steps: 6200, days_count: 4, goal_hit_pct: 25.0 },
  ],
  hourly_distribution: Array.from({ length: 24 }, (_, h) => ({
    hour: h,
    label: `${String(h).padStart(2, '0')}h`,
    avg_steps: h === 18 ? 950 : h === 8 ? 600 : 120,
  })),
  monthly_stats: [
    {
      month: '2026-10',
      month_label: 'Outubro 2026',
      days_recorded: 26,
      total_steps: 254800,
      avg_steps: 9800,
      max_steps: 16851,
      max_steps_date: '2026-10-22',
      min_steps: 4200,
      goal_hit_days: 19,
      goal_hit_pct: 73.1,
      total_distance_km: 192.5,
      total_calories: 11400,
      trend_vs_previous_month_pct: 8.5,
    },
    {
      month: '2026-09',
      month_label: 'Setembro 2026',
      days_recorded: 30,
      total_steps: 270900,
      avg_steps: 9030,
      max_steps: 15400,
      max_steps_date: '2026-09-15',
      min_steps: 4100,
      goal_hit_days: 20,
      goal_hit_pct: 66.7,
      total_distance_km: 204.0,
      total_calories: 12100,
      trend_vs_previous_month_pct: null,
    },
  ],
  trend: {
    direction: 'improving',
    description: 'Tendência positiva nos últimos 7 dias.',
    current_7d_avg: 9785,
    previous_7d_avg: 8697,
    delta_7d_pct: 12.5,
    current_30d_avg: 9500,
    previous_30d_avg: 9030,
    delta_30d_pct: 5.2,
    longevity_tier: {
      tier: 'Zona Cardioprotetora (Longevidade Otimizada)',
      color: 'teal',
      badge: 'Ótimo',
      message: 'Atinge o platô cardioprotetor.',
      target_range: '7.500 - 9.999 passos/dia',
    },
  },
  zepp_sync_info: {
    last_sync: '2026-10-26T10:00:00Z',
    source: 'Zepp OS (Amazfit)',
    configured_goal: 8000,
    total_zepp_records: 30,
    has_band_data: true,
  },
  daily_records: [
    {
      date_ref: '2026-10-26',
      steps: 8400,
      goal: 8000,
      goal_met: true,
      distance_km: 6.3,
      calories: 380,
      walking_min: 40,
      running_min: 15,
      active_minutes: 55,
      source: 'Zepp',
      ma7_steps: 9785,
      status: 'above_goal',
    },
    {
      date_ref: '2026-10-25',
      steps: 12400,
      goal: 8000,
      goal_met: true,
      distance_km: 9.5,
      calories: 560,
      walking_min: 65,
      running_min: 25,
      active_minutes: 90,
      source: 'Zepp',
      ma7_steps: 9650,
      status: 'above_goal',
    },
  ],
};

const mockFetch = vi.fn();
(globalThis as any).fetch = mockFetch;

describe('DailyStepsView', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockStepsResponse,
      text: async () => JSON.stringify(mockStepsResponse),
    });
  });

  it('renders loading state initially and then shows main header and badges', async () => {
    render(<DailyStepsView />);
    expect(screen.getByText(/Carregando estatísticas e histórico de passos do Zepp/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Passos Diários & Atividade Física/i })).toBeInTheDocument();
    });

    expect(screen.getByText(/Zepp OS \(Amazfit\)/i)).toBeInTheDocument();
    expect(screen.getByText(/30 dias sincronizados/i)).toBeInTheDocument();
  });

  it('renders summary cards with overall average, 7d average and longevity badge', async () => {
    render(<DailyStepsView />);

    await waitFor(() => {
      expect(screen.getByText('Média Diária Geral')).toBeInTheDocument();
    });

    expect(screen.getByText('9.500')).toBeInTheDocument(); // Overall avg
    expect(screen.getAllByText('9.785').length).toBeGreaterThan(0); // 7d current avg
    expect(screen.getAllByText('+12.5%').length).toBeGreaterThan(0); // 7d delta
    expect(screen.getAllByText('16.851').length).toBeGreaterThan(0); // Record
    expect(screen.getByText('73.3%')).toBeInTheDocument(); // Goal completion rate
  });

  it('allows toggling between chart mode and accessible table mode', async () => {
    render(<DailyStepsView />);

    await waitFor(() => {
      expect(screen.getByText(/Evolução e Tendência de Passos/i)).toBeInTheDocument();
    });

    const tableToggleBtn = screen.getByRole('button', { name: /visualização em tabela/i });
    fireEvent.click(tableToggleBtn);

    expect(screen.getByRole('table', { name: /Histórico de passos do período/i })).toBeInTheDocument();
    expect(screen.getAllByText('26/10/2026').length).toBeGreaterThan(0);
  });

  it('renders weekly pattern and monthly consolidated table', async () => {
    render(<DailyStepsView />);

    await waitFor(() => {
      expect(screen.getByText('Padrão por Dia da Semana')).toBeInTheDocument();
    });

    expect(screen.getByText(/Dia mais ativo/i)).toBeInTheDocument();
    expect(screen.getByText(/Ritmo Circadiano de Passos/i)).toBeInTheDocument();
    expect(screen.getByText(/70 min ativos\/dia/i)).toBeInTheDocument();
    expect(screen.getAllByText('Outubro 2026').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Setembro 2026').length).toBeGreaterThan(0);
  });

  it('triggers onSyncZepp when clicking Sincronizar Zepp', async () => {
    const handleSync = vi.fn().mockResolvedValue(undefined);
    render(<DailyStepsView onSyncZepp={handleSync} />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Sincronizar Zepp/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Sincronizar Zepp/i }));
    expect(handleSync).toHaveBeenCalledTimes(1);
  });
});
