import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { InlineError, ErrorState } from './ErrorState';

describe('ErrorState Primitives', () => {
  describe('InlineError', () => {
    it('renders error message with alert role', () => {
      render(<InlineError message="Falha ao sincronizar" />);
      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveTextContent('Falha ao sincronizar');
    });

    it('renders retry button and triggers callback', () => {
      const handleRetry = vi.fn();
      render(<InlineError message="Erro de conexão" onRetry={handleRetry} retryLabel="Tentar de novo" />);

      const retryBtn = screen.getByRole('button', { name: 'Tentar de novo' });
      fireEvent.click(retryBtn);
      expect(handleRetry).toHaveBeenCalledTimes(1);
    });
  });

  describe('ErrorState', () => {
    it('renders title, message and retry action', () => {
      const handleRetry = vi.fn();
      render(
        <ErrorState
          title="Erro Estrutural"
          message="Não foi possível se comunicar com o banco de dados."
          onRetry={handleRetry}
          actionLabel="Recarregar Página"
        />
      );

      expect(screen.getByText('Erro Estrutural')).toBeInTheDocument();
      expect(screen.getByText('Não foi possível se comunicar com o banco de dados.')).toBeInTheDocument();

      const btn = screen.getByRole('button', { name: 'Recarregar Página' });
      fireEvent.click(btn);
      expect(handleRetry).toHaveBeenCalledTimes(1);
    });

    it('toggles technical details visibility', () => {
      render(
        <ErrorState
          message="Erro na API"
          details="Stack trace: Error at fetch (/api/sync:42)"
        />
      );

      const toggleBtn = screen.getByRole('button', { name: /ver detalhes técnicos/i });
      fireEvent.click(toggleBtn);

      expect(screen.getByText(/Stack trace: Error at fetch/i)).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /ocultar detalhes técnicos/i }));
      expect(screen.queryByText(/Stack trace: Error at fetch/i)).not.toBeInTheDocument();
    });
  });
});
