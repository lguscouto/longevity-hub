import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import React from 'react';
import { PhysicalAssessmentsView } from './PhysicalAssessmentsView';

// Global fetch mock
const mockFetch = vi.fn();
(globalThis as any).fetch = mockFetch;

const mockAssessments = [
  {
    id: 'ass-1',
    assessment_date: '2026-07-28',
    title: 'Avaliação Inicial',
    weight_kg: 78.5,
    body_fat_percentage: 16.5,
    waist_cm: 82.0,
    created_at: '2026-07-28T10:00:00Z',
    updated_at: '2026-07-28T10:00:00Z',
    photos: [
      {
        id: 'photo-1',
        assessment_id: 'ass-1',
        angle: 'front',
        body_state: 'relaxed',
        stored_filename: 'photo-1.jpg',
        relative_path: 'data/physical_assessments/ass-1/photo-1.jpg',
        mime_type: 'image/jpeg',
        file_size: 102400,
        sha256: 'abc123hash',
        display_order: 0,
        created_at: '2026-07-28T10:00:00Z',
        content_url: '/api/physical-assessments/ass-1/photos/photo-1/content',
      },
    ],
  },
];

describe('PhysicalAssessmentsView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockImplementation(async (url: string) => {
      if (typeof url === 'string' && url.includes('/timeline')) {
        return {
          ok: true,
          json: async () => ({
            target_weight_kg: null,
            points: [],
            summary: {
              latest_weight_kg: null,
              weight_delta: null,
              latest_body_fat_pct: null,
              body_fat_delta: null,
              latest_lean_mass_kg: null,
              lean_mass_delta: null,
              total_points: 0,
              assessment_count: 0,
            },
          }),
        };
      }
      return {
        ok: true,
        json: async () => mockAssessments,
      };
    });
  });

  it('renders history view with assessments list', async () => {
    render(<PhysicalAssessmentsView />);

    expect(screen.getByText(/Carregando avaliações físicas/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Avaliação Inicial')).toBeInTheDocument();
    });

    expect(screen.getByText('78.5 kg')).toBeInTheDocument();
    expect(screen.getByText('Gordura:')).toBeInTheDocument();
    expect(screen.getByText('16.5%')).toBeInTheDocument();

    const downloadLink = screen.getByTitle(/Baixar todas as fotos \(1 fotos\)/i);
    expect(downloadLink).toBeInTheDocument();
    expect(downloadLink).toHaveAttribute('href', '/api/physical-assessments/ass-1/photos/download');
  });

  it('switches to create view when clicking Nova Avaliação button', async () => {
    render(<PhysicalAssessmentsView />);

    await waitFor(() => {
      expect(screen.getByText('Avaliação Inicial')).toBeInTheDocument();
    });

    const createBtn = screen.getByRole('button', { name: /Nova Avaliação/i });
    fireEvent.click(createBtn);

    expect(screen.getByText(/Dados Principais da Avaliação/i)).toBeInTheDocument();
    expect(screen.getByText(/Data da Avaliação/i)).toBeInTheDocument();
    expect(screen.getByText(/Salvar Avaliação Física/i)).toBeInTheDocument();
  });

  it('switches to compare view and renders comparison mode', async () => {
    render(<PhysicalAssessmentsView />);

    await waitFor(() => {
      expect(screen.getByText('Avaliação Inicial')).toBeInTheDocument();
    });

    const compareBtn = screen.getByRole('button', { name: /Comparar Períodos/i });
    fireEvent.click(compareBtn);

    expect(screen.getByText(/Seleção de Períodos para Comparação/i)).toBeInTheDocument();
    expect(screen.getByText(/Avaliação Anterior \(Baseline\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Avaliação Atual \(Evolução\)/i)).toBeInTheDocument();
  });

  it('opens edit modal and submits updated assessment metrics', async () => {
    mockFetch.mockImplementation(async (url: string, opts?: any) => {
      if (typeof url === 'string' && url.includes('/timeline')) {
        return {
          ok: true,
          json: async () => ({ target_weight_kg: null, points: [], summary: {} }),
        };
      }
      if (opts?.method === 'PATCH') {
        return {
          ok: true,
          json: async () => ({
            ...mockAssessments[0],
            weight_kg: 79.0,
          }),
        };
      }
      return {
        ok: true,
        json: async () => mockAssessments,
      };
    });

    render(<PhysicalAssessmentsView />);

    await waitFor(() => {
      expect(screen.getByText('Avaliação Inicial')).toBeInTheDocument();
    });

    const editBtn = screen.getByTitle('Editar avaliação');
    fireEvent.click(editBtn);

    expect(screen.getByText('Editar avaliação física')).toBeInTheDocument();

    const weightInput = screen.getByPlaceholderText('Ex: 78.5');
    expect(weightInput).toHaveValue(78.5);

    fireEvent.change(weightInput, { target: { value: '79.0' } });

    const saveBtn = screen.getByRole('button', { name: /Salvar Alterações/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/physical-assessments/ass-1',
        expect.objectContaining({
          method: 'PATCH',
          body: expect.stringContaining('"weight_kg":79'),
        })
      );
    });

    await waitFor(() => {
      expect(screen.queryByText('Editar avaliação física')).not.toBeInTheDocument();
      expect(screen.getByText('79 kg')).toBeInTheDocument();
    });
  });

  it('renders dedicated notes & bioimpedance section in details view with expand/collapse', async () => {
    const assessmentWithLongNotes = {
      ...mockAssessments[0],
      notes: 'Bioimpedância Fitdays (30/08/2026):\n- Peso: 89.6 kg\n- Gordura: 27.9%\n- Massa Muscular: 61.3 kg\n- Água: 51.9%\n- Taxa Muscular: 68.3%\n- Massa Livre: 64.6 kg\n- Gordura Visceral: 11.0\n- Massa Óssea: 3.3 kg',
    };

    mockFetch.mockImplementation(async (url: string) => {
      if (typeof url === 'string' && url.includes('/timeline')) {
        return {
          ok: true,
          json: async () => ({ target_weight_kg: null, points: [], summary: {} }),
        };
      }
      return {
        ok: true,
        json: async () => [assessmentWithLongNotes],
      };
    });

    render(<PhysicalAssessmentsView />);

    await waitFor(() => {
      expect(screen.getByText('Avaliação Inicial')).toBeInTheDocument();
    });

    const detailsBtn = screen.getByRole('button', { name: /Ver Detalhes/i });
    fireEvent.click(detailsBtn);

    await waitFor(() => {
      expect(screen.getByText('Anotações e bioimpedância')).toBeInTheDocument();
    });

    expect(screen.getByText(/Bioimpedância Fitdays/)).toBeInTheDocument();

    const expandBtn = screen.getByRole('button', { name: /Ver tudo/i });
    expect(expandBtn).toBeInTheDocument();

    fireEvent.click(expandBtn);
    expect(screen.getByRole('button', { name: /Recolher/i })).toBeInTheDocument();
  });

  it('navigates through 5 wizard steps forward and backward, verifying review summary', async () => {
    render(<PhysicalAssessmentsView />);

    await waitFor(() => {
      expect(screen.getByText('Avaliação Inicial')).toBeInTheDocument();
    });

    // Enter create mode
    fireEvent.click(screen.getByRole('button', { name: /Nova Avaliação/i }));

    // Step 1: Dados Básicos
    expect(screen.getByText(/Dados Principais da Avaliação/i)).toBeInTheDocument();
    const weightInput = screen.getByLabelText(/Peso \(kg\)/i);
    fireEvent.change(weightInput, { target: { value: '82.5' } });

    // Advance to Step 2: Medidas
    fireEvent.click(screen.getByRole('button', { name: /Próxima Etapa/i }));
    expect(screen.getByText(/Medidas corporais e circunferências/i)).toBeInTheDocument();
    const waistInput = screen.getByLabelText(/Cintura \(cm\)/i);
    fireEvent.change(waistInput, { target: { value: '84.0' } });

    // Advance to Step 3: Composição
    fireEvent.click(screen.getByRole('button', { name: /Próxima Etapa/i }));
    expect(screen.getByText(/Composição corporal e percentual de gordura/i)).toBeInTheDocument();
    const bodyFatInput = screen.getByLabelText(/Gordura Corporal \(%\)/i);
    fireEvent.change(bodyFatInput, { target: { value: '17.2' } });

    // Advance to Step 4: Fotos
    fireEvent.click(screen.getByRole('button', { name: /Próxima Etapa/i }));
    expect(screen.getByText(/Fotografias Corporais/i)).toBeInTheDocument();

    // Advance to Step 5: Revisão
    fireEvent.click(screen.getByRole('button', { name: /Próxima Etapa/i }));
    expect(screen.getByText(/Resumo para Conferência/i)).toBeInTheDocument();
    expect(screen.getByText('82.5 kg')).toBeInTheDocument();
    expect(screen.getByText(/Cintura: 84/i)).toBeInTheDocument();

    // Step back to Step 4
    fireEvent.click(screen.getByRole('button', { name: /Etapa Anterior/i }));
    expect(screen.getByText(/Fotografias Corporais/i)).toBeInTheDocument();
  });

  it('restores draft from localStorage and allows discarding it', async () => {
    localStorage.setItem(
      'longevidade_physical_assessment_draft',
      JSON.stringify({
        formDate: '2026-10-01',
        formTitle: 'Rascunho de Teste',
        formWeight: '80.0',
        formBodyFat: '15.0',
        formWaist: '81.0',
        formAbdomen: '',
        formHip: '',
        formNotes: 'Notas salvas no rascunho',
      })
    );

    render(<PhysicalAssessmentsView />);

    await waitFor(() => {
      expect(screen.getByText('Avaliação Inicial')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Nova Avaliação/i }));

    // Draft notification should appear
    expect(screen.getByText(/Rascunho de avaliação anterior recuperado automaticamente/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue('Rascunho de Teste')).toBeInTheDocument();
    expect(screen.getByDisplayValue('80.0')).toBeInTheDocument();

    // Discard draft
    const discardBtn = screen.getByRole('button', { name: /Descartar rascunho/i });
    fireEvent.click(discardBtn);

    expect(screen.queryByText(/Rascunho de avaliação anterior recuperado automaticamente/i)).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue('Rascunho de Teste')).not.toBeInTheDocument();
  });

  it('confirms assessment deletion via accessible ConfirmDialog', async () => {
    mockFetch.mockImplementation(async (url: string, opts?: any) => {
      if (typeof url === 'string' && url.includes('/timeline')) {
        return {
          ok: true,
          json: async () => ({ target_weight_kg: null, points: [], summary: {} }),
        };
      }
      if (opts?.method === 'DELETE') {
        return {
          ok: true,
          json: async () => ({ status: 'deleted' }),
        };
      }
      return {
        ok: true,
        json: async () => mockAssessments,
      };
    });

    render(<PhysicalAssessmentsView />);

    await waitFor(() => {
      expect(screen.getByText('Avaliação Inicial')).toBeInTheDocument();
    });

    const deleteBtn = screen.getByTitle('Excluir avaliação');
    fireEvent.click(deleteBtn);

    // Confirm dialog should open
    await waitFor(() => {
      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Excluir avaliação?' })).toBeInTheDocument();
    });

    const dialog = screen.getByRole('alertdialog');
    const confirmBtn = within(dialog).getByRole('button', { name: 'Excluir avaliação' });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/physical-assessments/ass-1',
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });
});


