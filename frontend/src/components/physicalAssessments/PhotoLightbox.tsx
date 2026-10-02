import React, { useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Modal } from '../ui';
import { Photo, ANGLE_LABELS, BODY_STATE_LABELS } from './types';

interface PhotoLightboxProps {
  photo: Photo | null;
  photos?: Photo[];
  onClose: () => void;
  onSelectPhoto?: (photo: Photo) => void;
}

export const PhotoLightbox: React.FC<PhotoLightboxProps> = ({
  photo,
  photos = [],
  onClose,
  onSelectPhoto,
}) => {
  const currentIndex = photo && photos.length > 0 ? photos.findIndex(p => p.id === photo.id) : -1;
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < photos.length - 1;

  const handlePrev = useCallback(() => {
    if (hasPrev && onSelectPhoto) {
      onSelectPhoto(photos[currentIndex - 1]);
    }
  }, [hasPrev, currentIndex, onSelectPhoto, photos]);

  const handleNext = useCallback(() => {
    if (hasNext && onSelectPhoto) {
      onSelectPhoto(photos[currentIndex + 1]);
    }
  }, [hasNext, currentIndex, onSelectPhoto, photos]);

  useEffect(() => {
    if (!photo) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [photo, handlePrev, handleNext]);

  const title = photo
    ? `${ANGLE_LABELS[photo.angle] || photo.angle} — ${BODY_STATE_LABELS[photo.body_state || 'unspecified']}`
    : undefined;

  return (
    <Modal
      isOpen={Boolean(photo)}
      onClose={onClose}
      title={title}
      size="4xl"
      contentClassName="flex flex-col items-center justify-center p-2 sm:p-4 bg-black/40"
    >
      {photo && (
        <div className="relative flex flex-col items-center justify-center w-full">
          <div className="relative flex items-center justify-center w-full max-h-[75vh]">
            {hasPrev && (
              <button
                type="button"
                onClick={handlePrev}
                aria-label="Foto anterior"
                className="absolute left-2 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white border border-slate-700 backdrop-blur transition-all"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            )}

            <img
              src={photo.content_url}
              alt={photo.description || photo.angle}
              className="max-h-[75vh] max-w-full object-contain rounded-xl border border-slate-800 shadow-elevation-3"
            />

            {hasNext && (
              <button
                type="button"
                onClick={handleNext}
                aria-label="Próxima foto"
                className="absolute right-2 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white border border-slate-700 backdrop-blur transition-all"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            )}
          </div>

          <div className="mt-3 text-center flex flex-col items-center gap-1">
            {photos.length > 1 && currentIndex >= 0 && (
              <span className="text-[11px] text-slate-400 font-medium">
                {currentIndex + 1} de {photos.length}
              </span>
            )}
            {photo.description && (
              <p className="text-slate-300 text-xs max-w-lg">
                {photo.description}
              </p>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
};
