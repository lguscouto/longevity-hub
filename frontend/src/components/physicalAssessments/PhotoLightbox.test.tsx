import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { PhotoLightbox } from './PhotoLightbox';
import { Photo } from './types';

const mockPhotos: Photo[] = [
  {
    id: 'p-1',
    assessment_id: 'ass-1',
    angle: 'front',
    body_state: 'relaxed',
    description: 'Foto frontal em jejum',
    stored_filename: 'p1.jpg',
    relative_path: 'data/p1.jpg',
    mime_type: 'image/jpeg',
    file_size: 50000,
    sha256: 'abc',
    display_order: 0,
    created_at: '2026-07-28T10:00:00Z',
    content_url: '/api/photos/p1',
  },
  {
    id: 'p-2',
    assessment_id: 'ass-1',
    angle: 'back',
    body_state: 'flexed',
    description: 'Foto dorsal contraída',
    stored_filename: 'p2.jpg',
    relative_path: 'data/p2.jpg',
    mime_type: 'image/jpeg',
    file_size: 52000,
    sha256: 'def',
    display_order: 1,
    created_at: '2026-07-28T10:00:00Z',
    content_url: '/api/photos/p2',
  },
];

describe('PhotoLightbox', () => {
  it('does not render dialog when photo is null', () => {
    const { container } = render(
      <PhotoLightbox photo={null} onClose={vi.fn()} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders photo title, image, and description when photo is provided', () => {
    render(
      <PhotoLightbox
        photo={mockPhotos[0]}
        photos={mockPhotos}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/Frente — Relaxado/i)).toBeInTheDocument();
    expect(screen.getByAltText('Foto frontal em jejum')).toBeInTheDocument();
    expect(screen.getByText('Foto frontal em jejum')).toBeInTheDocument();
    expect(screen.getByText('1 de 2')).toBeInTheDocument();
  });

  it('navigates to next photo on next button click and on ArrowRight key', () => {
    const handleSelectPhoto = vi.fn();
    render(
      <PhotoLightbox
        photo={mockPhotos[0]}
        photos={mockPhotos}
        onClose={vi.fn()}
        onSelectPhoto={handleSelectPhoto}
      />
    );

    const nextBtn = screen.getByLabelText('Próxima foto');
    fireEvent.click(nextBtn);
    expect(handleSelectPhoto).toHaveBeenCalledWith(mockPhotos[1]);

    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(handleSelectPhoto).toHaveBeenCalledTimes(2);
  });

  it('navigates to previous photo on prev button click and on ArrowLeft key', () => {
    const handleSelectPhoto = vi.fn();
    render(
      <PhotoLightbox
        photo={mockPhotos[1]}
        photos={mockPhotos}
        onClose={vi.fn()}
        onSelectPhoto={handleSelectPhoto}
      />
    );

    const prevBtn = screen.getByLabelText('Foto anterior');
    fireEvent.click(prevBtn);
    expect(handleSelectPhoto).toHaveBeenCalledWith(mockPhotos[0]);

    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(handleSelectPhoto).toHaveBeenCalledTimes(2);
  });
});
