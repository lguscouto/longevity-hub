import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LoadingInline, LoadingPanel } from './LoadingIndicator';

describe('LoadingIndicator Primitives', () => {
  describe('LoadingInline', () => {
    it('renders with default message and status role', () => {
      render(<LoadingInline />);
      const status = screen.getByRole('status');
      expect(status).toBeInTheDocument();
      expect(status).toHaveTextContent('Carregando...');
      expect(status).toHaveAttribute('aria-live', 'polite');
    });

    it('renders custom message', () => {
      render(<LoadingInline message="Sincronizando sensores..." size="sm" />);
      expect(screen.getByText('Sincronizando sensores...')).toBeInTheDocument();
    });
  });

  describe('LoadingPanel', () => {
    it('renders skeleton panel with custom message and rows', () => {
      const { container } = render(
        <LoadingPanel message="Carregando exames..." skeletonRows={4} />
      );

      const status = screen.getByRole('status');
      expect(status).toBeInTheDocument();
      expect(screen.getByText('Carregando exames...')).toBeInTheDocument();

      const pulseBars = container.querySelectorAll('.animate-pulse');
      expect(pulseBars).toHaveLength(4);
    });
  });
});
