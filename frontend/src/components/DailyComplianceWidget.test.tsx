import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { DailyComplianceWidget } from './DailyComplianceWidget';
import * as api from '../lib/api';

describe('DailyComplianceWidget', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders "Sem registro" instead of "0%" when there is no record for the selected date (U22-P0-05)', async () => {
    vi.spyOn(api, 'requestJson').mockResolvedValueOnce([
      {
        date_ref: '2026-08-10',
        sleep_schedule_ok: true,
        supplements_ok: true,
        exercise_ok: true,
        fasting_window_ok: true,
      },
    ]);

    render(<DailyComplianceWidget selectedDate="2026-08-18" />);

    await waitFor(() => {
      expect(screen.getByTestId('compliance-no-record')).toBeInTheDocument();
    });

    expect(screen.getByText('Sem registro')).toBeInTheDocument();
    expect(screen.queryByText('0%')).not.toBeInTheDocument();

    // Os 4 pilares devem estar desmarcados (aria-checked="false")
    const switches = screen.getAllByRole('switch');
    expect(switches).toHaveLength(4);
    switches.forEach((sw) => {
      expect(sw).toHaveAttribute('aria-checked', 'false');
    });
  });

  it('renders score percentage when date has an existing record', async () => {
    vi.spyOn(api, 'requestJson').mockResolvedValueOnce([
      {
        date_ref: '2026-08-18',
        sleep_schedule_ok: true,
        supplements_ok: true,
        exercise_ok: false,
        fasting_window_ok: true,
      },
    ]);

    render(<DailyComplianceWidget selectedDate="2026-08-18" />);

    await waitFor(() => {
      expect(screen.getByTestId('compliance-score')).toHaveTextContent('75%');
    });

    expect(screen.queryByText('Sem registro')).not.toBeInTheDocument();

    const sleepSwitch = screen.getByRole('switch', { name: /Janela de Sono/i });
    expect(sleepSwitch).toHaveAttribute('aria-checked', 'true');

    const exerciseSwitch = screen.getByRole('switch', { name: /Treino \/ Exercício/i });
    expect(exerciseSwitch).toHaveAttribute('aria-checked', 'false');
  });

  it('renders explicit 0% when recorded date genuinely has all false', async () => {
    vi.spyOn(api, 'requestJson').mockResolvedValueOnce([
      {
        date_ref: '2026-08-18',
        sleep_schedule_ok: false,
        supplements_ok: false,
        exercise_ok: false,
        fasting_window_ok: false,
      },
    ]);

    render(<DailyComplianceWidget selectedDate="2026-08-18" />);

    await waitFor(() => {
      expect(screen.getByTestId('compliance-score')).toHaveTextContent('0%');
    });
    expect(screen.queryByText('Sem registro')).not.toBeInTheDocument();
  });

  it('toggles a pillar switch, updates score and sends POST /api/compliance', async () => {
    const user = userEvent.setup();
    const requestJsonMock = vi.spyOn(api, 'requestJson');

    // Inicialmente sem registro
    requestJsonMock.mockResolvedValueOnce([]);
    // Mock do POST
    requestJsonMock.mockResolvedValueOnce({ ok: true });

    render(<DailyComplianceWidget selectedDate="2026-08-18" />);

    await waitFor(() => {
      expect(screen.getByText('Sem registro')).toBeInTheDocument();
    });

    const sleepSwitch = screen.getByRole('switch', { name: /Janela de Sono/i });
    await user.click(sleepSwitch);

    expect(sleepSwitch).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByTestId('compliance-score')).toHaveTextContent('25%');

    expect(requestJsonMock).toHaveBeenCalledWith('/api/compliance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date_ref: '2026-08-18',
        sleep_schedule_ok: true,
        supplements_ok: false,
        exercise_ok: false,
        fasting_window_ok: false,
      }),
    });
  });

  it('allows keyboard activation (Space/Enter) on switch buttons', async () => {
    const user = userEvent.setup();
    const requestJsonMock = vi.spyOn(api, 'requestJson');

    requestJsonMock.mockResolvedValueOnce([]);
    requestJsonMock.mockResolvedValueOnce({ ok: true });

    render(<DailyComplianceWidget selectedDate="2026-08-18" />);

    await waitFor(() => {
      expect(screen.getByText('Sem registro')).toBeInTheDocument();
    });

    const supplementsSwitch = screen.getByRole('switch', { name: /Suplementação/i });
    supplementsSwitch.focus();
    expect(supplementsSwitch).toHaveFocus();

    await user.keyboard(' ');

    expect(supplementsSwitch).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByTestId('compliance-score')).toHaveTextContent('25%');
  });

  it('displays load error when fetch fails', async () => {
    vi.spyOn(api, 'requestJson').mockRejectedValueOnce(new api.ApiError(500, 'Erro de servidor'));

    render(<DailyComplianceWidget selectedDate="2026-08-18" />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Erro de servidor');
    });
  });
});
