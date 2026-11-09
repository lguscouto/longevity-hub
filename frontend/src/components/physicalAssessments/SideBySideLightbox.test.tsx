import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { SideBySideLightbox, MatchedPhotoPair } from './SideBySideLightbox';
import { Photo, PhysicalAssessment } from './types';

const mockPrevPhoto: Photo = {
  id: 'p-prev',
  assessment_id: 'ass-1',
  angle: 'front',
  body_state: 'relaxed',
  description: 'Frente - Relaxado',
  stored_filename: 'prev.jpg',
  relative_path: 'data/prev.jpg',
  mime_type: 'image/jpeg',
  file_size: 50000,
  sha256: 'abc',
  display_order: 0,
  created_at: '2026-11-02T10:00:00Z',
  content_url: '/api/photos/prev',
};

const mockCurrPhoto: Photo = {
  id: 'p-curr',
  assessment_id: 'ass-2',
  angle: 'front',
  body_state: 'relaxed',
  description: 'Frente - Relaxado',
  stored_filename: 'curr.jpg',
  relative_path: 'data/curr.jpg',
  mime_type: 'image/jpeg',
  file_size: 52000,
  sha256: 'def',
  display_order: 0,
  created_at: '2026-11-07T10:00:00Z',
  content_url: '/api/photos/curr',
};

const mockBackPair: MatchedPhotoPair = {
  angle: 'back',
  body_state: 'flexed',
  previous_photo: { ...mockPrevPhoto, id: 'back-prev', angle: 'back', body_state: 'flexed' },
  current_photo: { ...mockCurrPhoto, id: 'back-curr', angle: 'back', body_state: 'flexed' },
};

const mockPairs: MatchedPhotoPair[] = [
  {
    angle: 'front',
    body_state: 'relaxed',
    previous_photo: mockPrevPhoto,
    current_photo: mockCurrPhoto,
  },
  mockBackPair,
];

const mockPrevAssessment: Partial<PhysicalAssessment> = {
  id: 'ass-1',
  assessment_date: '2026-11-02',
  weight_kg: 75.5,
  body_fat_percentage: 25.5,
};

const mockCurrAssessment: Partial<PhysicalAssessment> = {
  id: 'ass-2',
  assessment_date: '2026-11-07',
  weight_kg: 75.2,
  body_fat_percentage: 23.3,
};

describe('SideBySideLightbox', () => {
  it('does not render dialog when isOpen is false', () => {
    const { container } = render(
      <SideBySideLightbox
        isOpen={false}
        onClose={vi.fn()}
        pairs={mockPairs}
        currentIndex={0}
        onNavigate={vi.fn()}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders side by side photos, assessment dates and metrics when open', () => {
    render(
      <SideBySideLightbox
        isOpen={true}
        onClose={vi.fn()}
        pairs={mockPairs}
        currentIndex={0}
        onNavigate={vi.fn()}
        previousAssessment={mockPrevAssessment}
        currentAssessment={mockCurrAssessment}
      />
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/Ângulo: Frente/i)).toBeInTheDocument();
    expect(screen.getByText('Relaxado')).toBeInTheDocument();
    expect(screen.getByText(/75.5 kg/i)).toBeInTheDocument();
    expect(screen.getByText(/25.5% BF/i)).toBeInTheDocument();
    expect(screen.getByText(/75.2 kg/i)).toBeInTheDocument();
    expect(screen.getByText(/23.3% BF/i)).toBeInTheDocument();

    const prevImg = screen.getByAltText('Foto Anterior');
    const currImg = screen.getByAltText('Foto Atual');
    expect(prevImg).toHaveAttribute('src', '/api/photos/prev');
    expect(currImg).toHaveAttribute('src', '/api/photos/curr');
  });

  it('navigates through pairs using buttons and arrow keys', () => {
    const handleNavigate = vi.fn();
    render(
      <SideBySideLightbox
        isOpen={true}
        onClose={vi.fn()}
        pairs={mockPairs}
        currentIndex={0}
        onNavigate={handleNavigate}
        previousAssessment={mockPrevAssessment}
        currentAssessment={mockCurrAssessment}
      />
    );

    const nextBtn = screen.getByLabelText('Próximo par fotográfico');
    fireEvent.click(nextBtn);
    expect(handleNavigate).toHaveBeenCalledWith(1);

    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(handleNavigate).toHaveBeenCalledWith(1);
  });

  it('calls onClose when close button is clicked or Escape key is pressed', () => {
    const handleClose = vi.fn();
    render(
      <SideBySideLightbox
        isOpen={true}
        onClose={handleClose}
        pairs={mockPairs}
        currentIndex={0}
        onNavigate={vi.fn()}
      />
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(1);

    const closeBtn = screen.getByLabelText('Fechar comparativo em tela cheia');
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(2);
  });
});
