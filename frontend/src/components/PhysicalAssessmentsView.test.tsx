import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
  });

  it('renders history view with assessments list', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockAssessments,
    });

    render(<PhysicalAssessmentsView />);

    expect(screen.getByText(/Carregando avaliações físicas/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Avaliação Inicial')).toBeInTheDocument();
    });

    expect(screen.getByText('78.5 kg')).toBeInTheDocument();
    expect(screen.getByText('Gordura:')).toBeInTheDocument();
    expect(screen.getByText('16.5%')).toBeInTheDocument();
  });

  it('switches to create view when clicking Nova Avaliação button', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockAssessments,
    });

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
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockAssessments,
    });

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
});
