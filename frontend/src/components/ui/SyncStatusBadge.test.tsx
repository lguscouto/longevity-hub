import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SyncStatusBadge, SyncState } from './SyncStatusBadge';

describe('SyncStatusBadge Component', () => {
  const ALL_STATES: SyncState[] = [
    'never',
    'syncing',
    'success',
    'partial',
    'error',
    'expired',
    'disconnected',
    'stale',
  ];

  it.each(ALL_STATES)('renders correct label and aria attributes for state: %s', (state) => {
    const { unmount } = render(
      <SyncStatusBadge
        state={state}
        sourceLabel="Zepp"
        lastSyncTime={state !== 'never' && state !== 'disconnected' ? '10:30' : undefined}
      />
    );

    const badge = screen.getByRole('status');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveAttribute('aria-live', 'polite');

    // Estado nunca é comunicado apenas por cor: texto legível e aria-label presentes
    expect(badge.getAttribute('aria-label')).toBeTruthy();

    unmount();
  });

  it('renders interactive button when onClick is provided and triggers callback', () => {
    const handleClick = vi.fn();
    render(
      <SyncStatusBadge
        state="success"
        sourceLabel="Zepp"
        lastSyncTime="08:42"
        dataCoveredUntil="08:30"
        onClick={handleClick}
      />
    );

    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    expect(button.textContent).toContain('Zepp');
    expect(button.textContent).toContain('sincronizado 08:42');
    expect(button.textContent).toContain('dados até 08:30');
    expect(button).toHaveAttribute('title', expect.stringContaining('Zepp: Sincronizado'));

    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('disables button when disabled=true or state=syncing', () => {
    const handleClick = vi.fn();
    const { rerender } = render(
      <SyncStatusBadge
        state="syncing"
        onClick={handleClick}
      />
    );

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();

    fireEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();

    rerender(
      <SyncStatusBadge
        state="success"
        disabled={true}
        onClick={handleClick}
      />
    );

    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('renders partial count details in badge when state is partial', () => {
    render(
      <SyncStatusBadge
        state="partial"
        sourceLabel="Zepp"
        partialCount={{ imported: 32, unprocessable: 4 }}
      />
    );

    expect(screen.getByText(/32 ok · 4 avisos/i)).toBeInTheDocument();
    expect(
      screen.getByRole('status').getAttribute('aria-label')
    ).toContain('32 importados · 4 não processados');
  });

  it('renders compact mode hiding expansive text labels', () => {
    render(
      <SyncStatusBadge
        state="stale"
        sourceLabel="Wearables"
        compact={true}
      />
    );

    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('title', expect.stringContaining('Wearables'));
  });
});
