import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DataConfidenceBadge } from './DataConfidenceBadge';
import { formatLocalDateKey } from '../lib/dataSemantics';

const mockRequestJson = vi.fn();
vi.mock('../lib/api', () => ({
  requestJson: (...args: any[]) => mockRequestJson(...args),
}));

describe('DataConfidenceBadge (UX_UI_51)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders canonical Portuguese confidence label and coverage percentage', async () => {
    const today = formatLocalDateKey();
    mockRequestJson.mockResolvedValueOnce({
      date_ref: today,
      coverage_pct: 85.5,
      confidence: 'high',
      metrics_available: 6,
      metrics_expected: 7,
      warnings: [],
      evaluated_at: new Date().toISOString(),
    });

    render(<DataConfidenceBadge selectedDate={today} />);

    await waitFor(() => {
      expect(screen.getByText('Alta confiança')).toBeInTheDocument();
    });

    expect(screen.getByText('(85.5%)')).toBeInTheDocument();
    expect(screen.queryByText(/Desatualizado/i)).not.toBeInTheDocument();
  });

  it('does not display stale warning on historical dates even if 30 days old', async () => {
    const pastDate = '2026-08-15';
    mockRequestJson.mockResolvedValueOnce({
      date_ref: pastDate,
      coverage_pct: 90,
      confidence: 'medium',
      metrics_available: 4,
      metrics_expected: 7,
      warnings: [],
    });

    render(<DataConfidenceBadge selectedDate={pastDate} />);

    await waitFor(() => {
      expect(screen.getByText('Média confiança')).toBeInTheDocument();
    });

    expect(screen.getByText('(90%)')).toBeInTheDocument();
    expect(screen.queryByText(/Desatualizado/i)).not.toBeInTheDocument();
  });

  it('displays Desatualizado only when today data is stale (>24h since last sync)', async () => {
    const today = formatLocalDateKey();
    const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    mockRequestJson.mockResolvedValueOnce({
      date_ref: today,
      coverage_pct: 30,
      confidence: 'low',
      metrics_available: 2,
      metrics_expected: 7,
      warnings: ['Dados incompletos'],
      last_sync_at: twoDaysAgo,
    });

    render(<DataConfidenceBadge selectedDate={today} />);

    await waitFor(() => {
      expect(screen.getByText('Baixa confiança')).toBeInTheDocument();
    });

    expect(screen.getByText(/Desatualizado/i)).toBeInTheDocument();
  });
});
