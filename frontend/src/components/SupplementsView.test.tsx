import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { SupplementsView } from './SupplementsView';

const mockSupplements = [
  {
    id: 1,
    name: 'Metformina',
    dosage: '500mg',
    category: 'Suplemento',
    frequency: 'Diário',
    timing: 'Manhã',
    start_date: '2026-01-01',
    notes: 'Tomar em jejum'
  },
  {
    id: 2,
    name: 'Creatina Monohidratada',
    dosage: '5g',
    category: 'Suplemento',
    frequency: 'Diário',
    timing: 'Almoço',
    start_date: '2026-01-01',
    notes: 'Com carboidrato'
  },
  {
    id: 3,
    name: 'Cipionato de Testosterona',
    dosage: '100mg/semana',
    category: 'Hormônio',
    frequency: 'Semanal',
    timing: 'Tarde',
    start_date: '2026-02-01',
    notes: 'Aplicação intramuscular'
  },
  {
    id: 4,
    name: 'Magnésio Treonato',
    dosage: '300mg',
    category: 'Suplemento',
    frequency: 'Diário',
    timing: 'Antes de Dormir',
    start_date: '2026-01-15',
    notes: '30min antes de deitar'
  }
];

const mockTakenIds = [1];

const mockAuditLogs = [
  {
    id: 101,
    supplement_id: 1,
    compound_name: 'Metformina',
    category: 'Suplemento',
    action_type: 'ADICIONADO',
    old_value: undefined,
    new_value: '500mg - Diário - Manhã',
    created_at: '2026-01-01T08:00:00Z'
  },
  {
    id: 102,
    supplement_id: 2,
    compound_name: 'Creatina Monohidratada',
    category: 'Suplemento',
    action_type: 'DOSE_ALTERADA',
    old_value: '3g',
    new_value: '5g',
    created_at: '2026-01-10T12:00:00Z'
  },
  {
    id: 103,
    supplement_id: 3,
    compound_name: 'Cipionato de Testosterona',
    category: 'Hormônio',
    action_type: 'HORARIO_ALTERADO',
    old_value: 'Manhã',
    new_value: 'Tarde',
    created_at: '2026-02-05T14:30:00Z'
  }
];

const mockFetch = vi.fn();
(globalThis as any).fetch = mockFetch;

describe('SupplementsView (UX-P1-19)', () => {
  beforeEach(() => {
    mockFetch.mockReset();

    mockFetch.mockImplementation(async (input: string | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();

      if (url === '/api/supplements' && (!init || init.method === 'GET')) {
        return {
          ok: true,
          status: 200,
          text: async () => JSON.stringify(mockSupplements)
        };
      }

      if (url.startsWith('/api/supplements/logs/')) {
        return {
          ok: true,
          status: 200,
          text: async () => JSON.stringify(mockTakenIds)
        };
      }

      if (url === '/api/supplements/audit-logs') {
        return {
          ok: true,
          status: 200,
          text: async () => JSON.stringify(mockAuditLogs)
        };
      }

      if (url === '/api/supplements/toggle' && init?.method === 'POST') {
        return {
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ status: 'ok' })
        };
      }

      if (url === '/api/supplements/delete' && init?.method === 'POST') {
        return {
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ status: 'deleted' })
        };
      }

      if (url === '/api/supplements/analyze-ai' && init?.method === 'POST') {
        return {
          ok: true,
          status: 200,
          text: async () => JSON.stringify({
            status: 'success',
            analysis: '## Parecer Farmacológico\n* Sinergia positiva entre Creatina e Magnésio.\n| Composto | Janela | Status |\n| Metformina | Jejum | Otimizado |'
          })
        };
      }

      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({})
      };
    });
  });

  it('renders top summary metrics and segmented navigation tabs', async () => {
    render(<SupplementsView selectedDate="2026-10-02" />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2, name: /suplementos e rotina/i })).toBeInTheDocument();
    });

    // Check metric cards
    expect(screen.getByText(/itens ativos/i)).toBeInTheDocument();
    expect(screen.getByText(/adesão do dia/i)).toBeInTheDocument();
    expect(screen.getByText(/alterações registradas/i)).toBeInTheDocument();

    // Check tabs
    expect(screen.getByRole('button', { name: /hoje \(rotina\)/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /minha rotina/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /histórico de alterações/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /análise com ia/i })).toBeInTheDocument();
  });

  it('organizes daily routine chronobiologically in Hoje tab and toggles supplement dose', async () => {
    render(<SupplementsView selectedDate="2026-10-02" />);

    await waitFor(() => {
      expect(screen.getByText('Manhã / Jejum')).toBeInTheDocument();
    });

    expect(screen.getByText('Almoço')).toBeInTheDocument();
    expect(screen.getByText('Tarde / Treino')).toBeInTheDocument();
    expect(screen.getByText('Noite / Antes de Dormir')).toBeInTheDocument();

    // Metformina is taken (id: 1)
    expect(screen.getByText('Metformina')).toBeInTheDocument();
    expect(screen.getByText('Tomado')).toBeInTheDocument();

    // Creatina is pending (id: 2)
    const creatinaCard = screen.getByText('Creatina Monohidratada').closest('button')!;
    expect(creatinaCard).toBeInTheDocument();
    expect(screen.getAllByText('Pendente').length).toBeGreaterThan(0);

    // Click creatina to toggle
    fireEvent.click(creatinaCard);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/supplements/toggle',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ supplement_id: 2, date_ref: '2026-10-02' })
        })
      );
    });
  });

  it('switches to Minha rotina tab, filters by category and search term', async () => {
    render(<SupplementsView selectedDate="2026-10-02" />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /minha rotina/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /minha rotina/i }));

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/buscar suplemento ou composto/i)).toBeInTheDocument();
    });

    // All compounds visible
    expect(screen.getByText('Metformina')).toBeInTheDocument();
    expect(screen.getByText('Cipionato de Testosterona')).toBeInTheDocument();

    // Filter by Hormônio
    fireEvent.click(screen.getByRole('button', { name: /hormônios e peptídeos/i }));
    expect(screen.queryByText('Metformina')).not.toBeInTheDocument();
    expect(screen.getByText('Cipionato de Testosterona')).toBeInTheDocument();

    // Filter by search
    fireEvent.click(screen.getByRole('button', { name: /todos/i }));
    const searchInput = screen.getByPlaceholderText(/buscar suplemento ou composto/i);
    fireEvent.change(searchInput, { target: { value: 'Creatina' } });

    expect(screen.getByText('Creatina Monohidratada')).toBeInTheDocument();
    expect(screen.queryByText('Metformina')).not.toBeInTheDocument();
  });

  it('triggers delete confirmation dialog and deletes compound via ConfirmDialog', async () => {
    render(<SupplementsView selectedDate="2026-10-02" />);

    // Go to Protocol tab
    await waitFor(() => {
      fireEvent.click(screen.getByRole('button', { name: /minha rotina/i }));
    });

    await waitFor(() => {
      expect(screen.getAllByTitle('Remover item').length).toBeGreaterThan(0);
    });

    // Click delete on first compound (Metformina)
    const deleteButtons = screen.getAllByTitle('Remover item');
    fireEvent.click(deleteButtons[0]);

    // Check ConfirmDialog is open with accessible role alertdialog
    await waitFor(() => {
      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
      expect(screen.getByText(/deseja remover metformina/i)).toBeInTheDocument();
    });

    // Confirm deletion
    const confirmBtn = screen.getByRole('button', { name: 'Remover' });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/supplements/delete',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ supplement_id: 1 })
        })
      );
    });
  });

  it('switches to Histórico de alterações tab and displays immutable longitudinal events', async () => {
    render(<SupplementsView selectedDate="2026-10-02" />);

    await waitFor(() => {
      fireEvent.click(screen.getByRole('button', { name: /histórico de alterações/i }));
    });

    await waitFor(() => {
      expect(screen.getByText(/histórico de alterações na rotina/i)).toBeInTheDocument();
    });

    expect(screen.getByText('ADICIONADO')).toBeInTheDocument();
    expect(screen.getByText('DOSE_ALTERADA')).toBeInTheDocument();
    expect(screen.getByText('HORARIO_ALTERADO')).toBeInTheDocument();

    // Filter audit logs
    const auditSearch = screen.getByPlaceholderText(/buscar no histórico/i);
    fireEvent.change(auditSearch, { target: { value: 'Cipionato' } });

    expect(screen.getByText('Cipionato de Testosterona')).toBeInTheDocument();
    expect(screen.queryByText('Creatina Monohidratada')).not.toBeInTheDocument();
  });

  it('switches to Análise com IA tab and runs AI evaluation', async () => {
    render(<SupplementsView selectedDate="2026-10-02" />);

    await waitFor(() => {
      fireEvent.click(screen.getByRole('button', { name: /^análise com ia$/i }));
    });

    await waitFor(() => {
      expect(screen.getByText(/análise integrada do copiloto/i)).toBeInTheDocument();
    });

    // Trigger AI analysis
    const analyzeBtn = screen.getByRole('button', { name: /gerar nova análise/i });
    fireEvent.click(analyzeBtn);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/supplements/analyze-ai',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ date_ref: '2026-10-02' })
        })
      );
    });

    // Check rendered analysis
    await waitFor(() => {
      expect(screen.getByText('Parecer Farmacológico')).toBeInTheDocument();
      expect(screen.getByText(/Sinergia positiva entre Creatina e Magnésio/i)).toBeInTheDocument();
    });
  });
});
