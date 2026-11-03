import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { AssessmentComparison } from './AssessmentComparison';
import { PhysicalAssessment, ComparisonManifest, Photo } from './types';

const mockPrevPhoto: Photo = {
  id: 'photo-prev-1',
  assessment_id: 'ass-1',
  angle: 'left_side',
  body_state: 'relaxed',
  description: 'Perfil Esquerdo - Relaxado',
  stored_filename: 'prev.jpg',
  relative_path: 'data/prev.jpg',
  mime_type: 'image/jpeg',
  file_size: 120000,
  sha256: 'hash1',
  width: 3060,
  height: 4080,
  display_order: 2,
  created_at: '2026-06-01T10:00:00Z',
  content_url: '/api/physical-assessments/ass-1/photos/photo-prev-1/content',
};

const mockCurrPhoto: Photo = {
  id: 'photo-curr-1',
  assessment_id: 'ass-2',
  angle: 'left_side',
  body_state: 'relaxed',
  description: 'Perfil Esquerdo - Relaxado',
  stored_filename: 'curr.jpg',
  relative_path: 'data/curr.jpg',
  mime_type: 'image/jpeg',
  file_size: 130000,
  sha256: 'hash2',
  width: 3060,
  height: 4080,
  display_order: 2,
  created_at: '2026-07-01T10:00:00Z',
  content_url: '/api/physical-assessments/ass-2/photos/photo-curr-1/content',
};

const mockFrontFlexedPhoto: Photo = {
  id: 'photo-curr-2',
  assessment_id: 'ass-2',
  angle: 'front',
  body_state: 'flexed',
  description: 'Frente - Contraído (Duplo Bíceps)',
  stored_filename: 'curr2.jpg',
  relative_path: 'data/curr2.jpg',
  mime_type: 'image/jpeg',
  file_size: 140000,
  sha256: 'hash3',
  width: 3060,
  height: 4080,
  display_order: 5,
  created_at: '2026-07-01T10:00:00Z',
  content_url: '/api/physical-assessments/ass-2/photos/photo-curr-2/content',
};

const mockAssessments: PhysicalAssessment[] = [
  {
    id: 'ass-2',
    assessment_date: '2026-07-01',
    title: 'Evolução Mês 1',
    weight_kg: 78.0,
    body_fat_percentage: 16.5,
    created_at: '2026-07-01T10:00:00Z',
    updated_at: '2026-07-01T10:00:00Z',
    photos: [mockCurrPhoto, mockFrontFlexedPhoto],
  },
  {
    id: 'ass-1',
    assessment_date: '2026-06-01',
    title: 'Baseline',
    weight_kg: 80.0,
    body_fat_percentage: 18.0,
    created_at: '2026-06-01T10:00:00Z',
    updated_at: '2026-06-01T10:00:00Z',
    photos: [mockPrevPhoto],
  },
];

const mockManifest: ComparisonManifest = {
  previous_assessment: mockAssessments[1],
  current_assessment: mockAssessments[0],
  days_between: 30,
  deltas: {
    weight_kg: -2.0,
    body_fat_percentage: -1.5,
    waist_cm: -2.0,
    abdomen_cm: -3.0,
    hip_cm: -1.0,
  },
  matched_photos: [
    {
      angle: 'left_side',
      body_state: 'relaxed',
      previous_photo: mockPrevPhoto,
      current_photo: mockCurrPhoto,
    },
    {
      angle: 'front',
      body_state: 'flexed',
      previous_photo: null,
      current_photo: mockFrontFlexedPhoto,
    },
  ],
};

describe('AssessmentComparison', () => {
  it('renders period selectors, quick presets, and enables button when both periods selected', () => {
    const handleRun = vi.fn();
    const setPrev = vi.fn();
    const setCurr = vi.fn();

    render(
      <AssessmentComparison
        assessments={mockAssessments}
        comparePrevId="ass-1"
        setComparePrevId={setPrev}
        compareCurrId="ass-2"
        setCompareCurrId={setCurr}
        compareLoading={false}
        compareError={null}
        comparisonManifest={null}
        onRunComparison={handleRun}
        onOpenLightbox={vi.fn()}
      />
    );

    const runBtn = screen.getByRole('button', { name: /Gerar Comparativo Lado a Lado/i });
    expect(runBtn).not.toBeDisabled();
    fireEvent.click(runBtn);
    expect(handleRun).toHaveBeenCalled();

    const swapBtn = screen.getByRole('button', { name: /Inverter/i });
    fireEvent.click(swapBtn);
    expect(setPrev).toHaveBeenCalledWith('ass-2');
    expect(setCurr).toHaveBeenCalledWith('ass-1');
  });

  it('renders comparison manifest deltas, full uncropped photos (object-contain), body states, and slider mode', () => {
    const handleLightbox = vi.fn();
    render(
      <AssessmentComparison
        assessments={mockAssessments}
        comparePrevId="ass-1"
        setComparePrevId={vi.fn()}
        compareCurrId="ass-2"
        setCompareCurrId={vi.fn()}
        compareLoading={false}
        compareError={null}
        comparisonManifest={mockManifest}
        onRunComparison={vi.fn()}
        onOpenLightbox={handleLightbox}
      />
    );

    expect(screen.getByText('30 dias entre as avaliações')).toBeInTheDocument();
    expect(screen.getByText('-2 kg')).toBeInTheDocument();
    expect(screen.getByText('-1.5%')).toBeInTheDocument();

    // Verifica que as fotos usam object-contain (sem corte object-cover)
    const prevImg = screen.getByAltText('Anterior');
    expect(prevImg.className).toContain('object-contain');
    expect(prevImg.className).not.toContain('object-cover');

    // Verifica estados corporais e descrições
    expect(screen.getByText('Relaxado')).toBeInTheDocument();
    expect(screen.getByText('Contraído')).toBeInTheDocument();
    expect(screen.getByText(/Perfil Esquerdo - Relaxado/i)).toBeInTheDocument();

    // Testa filtro por ângulo
    fireEvent.click(screen.getByRole('button', { name: /Frente \(1\)/i }));
    expect(screen.queryByText(/Perfil Esquerdo - Relaxado/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Frente - Contraído/i)).toBeInTheDocument();

    // Volta para Todos e ativa o modo Slider Antes/Depois
    fireEvent.click(screen.getByRole('button', { name: /Todos \(2\)/i }));
    fireEvent.click(screen.getByRole('button', { name: /Slider Antes\/Depois/i }));

    const slider = screen.getByRole('slider', { name: /Comparador deslizante para Lado Esquerdo/i });
    expect(slider).toHaveAttribute('aria-valuenow', '50');
    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    expect(slider).toHaveAttribute('aria-valuenow', '55');
  });
});
