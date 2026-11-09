import React, { useEffect, useCallback, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, X, Maximize2, Minimize2, Camera } from 'lucide-react';
import { IconButton } from '../ui/IconButton';
import { Button } from '../ui/Button';
import { Photo, PhysicalAssessment, ANGLE_LABELS, BODY_STATE_LABELS } from './types';

export interface MatchedPhotoPair {
  angle: string;
  body_state?: string | null;
  previous_photo?: Photo | null;
  current_photo?: Photo | null;
}

export interface SideBySideLightboxProps {
  isOpen: boolean;
  onClose: () => void;
  pairs: MatchedPhotoPair[];
  currentIndex: number;
  onNavigate: (index: number) => void;
  previousAssessment?: Partial<PhysicalAssessment>;
  currentAssessment?: Partial<PhysicalAssessment>;
}

function formatDateBr(dateStr?: string): string {
  if (!dateStr) return '—';
  return new Date(dateStr.slice(0, 10) + 'T00:00:00').toLocaleDateString('pt-BR');
}

export const SideBySideLightbox: React.FC<SideBySideLightboxProps> = ({
  isOpen,
  onClose,
  pairs,
  currentIndex,
  onNavigate,
  previousAssessment,
  currentAssessment,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const currentPair = pairs[currentIndex] || null;
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < pairs.length - 1;

  const handlePrev = useCallback(() => {
    if (hasPrev) {
      onNavigate(currentIndex - 1);
    }
  }, [hasPrev, currentIndex, onNavigate]);

  const handleNext = useCallback(() => {
    if (hasNext) {
      onNavigate(currentIndex + 1);
    }
  }, [hasNext, currentIndex, onNavigate]);

  const toggleNativeFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, handlePrev, handleNext]);

  if (!isOpen || !currentPair || typeof document === 'undefined') {
    return null;
  }

  const prevDateStr = formatDateBr(previousAssessment?.assessment_date);
  const currDateStr = formatDateBr(currentAssessment?.assessment_date);

  const angleLabel = ANGLE_LABELS[currentPair.angle] || currentPair.angle;
  const bodyStateLabel = BODY_STATE_LABELS[currentPair.body_state || 'relaxed'] || currentPair.body_state;
  const poseDescription = currentPair.current_photo?.description || currentPair.previous_photo?.description;

  const content = (
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-label={`Comparativo fotográfico lado a lado em tela cheia - ${angleLabel}`}
      data-testid="side-by-side-lightbox"
      className="fixed inset-0 z-50 bg-slate-950/95 flex flex-col text-slate-100 animate-fade-in select-none"
    >
      {/* Barra Superior / Header */}
      <header className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-slate-800 bg-slate-900/80 shrink-0 gap-3">
        {/* Identificação do Ângulo */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 min-w-0">
          <span className="text-sm sm:text-base font-bold text-cyan-400 uppercase tracking-wider">
            Ângulo: {angleLabel}
          </span>

          {currentPair.body_state && (
            <span
              className={`px-2.5 py-0.5 rounded-pill text-xs font-semibold border ${
                currentPair.body_state === 'flexed'
                  ? 'bg-violet-500/15 text-violet-300 border-violet-500/30'
                  : 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
              }`}
            >
              {bodyStateLabel}
            </span>
          )}

          {poseDescription && (
            <span className="hidden sm:inline text-xs text-slate-400 font-medium truncate max-w-xs">
              • {poseDescription}
            </span>
          )}

          {pairs.length > 1 && (
            <span className="text-xs text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-pill">
              {currentIndex + 1} de {pairs.length}
            </span>
          )}
        </div>

        {/* Ações / Navegação */}
        <div className="flex items-center gap-1.5 shrink-0">
          {pairs.length > 1 && (
            <>
              <IconButton
                icon={ChevronLeft}
                aria-label="Par fotográfico anterior"
                variant="ghost"
                size="sm"
                disabled={!hasPrev}
                onClick={handlePrev}
                className="text-slate-300 hover:text-white disabled:opacity-40"
              />
              <IconButton
                icon={ChevronRight}
                aria-label="Próximo par fotográfico"
                variant="ghost"
                size="sm"
                disabled={!hasNext}
                onClick={handleNext}
                className="text-slate-300 hover:text-white disabled:opacity-40"
              />
            </>
          )}

          <IconButton
            icon={isFullscreen ? Minimize2 : Maximize2}
            aria-label={isFullscreen ? 'Sair da tela cheia nativa' : 'Expandir para tela cheia nativa'}
            variant="ghost"
            size="sm"
            onClick={toggleNativeFullscreen}
            className="text-slate-300 hover:text-white hidden sm:flex"
          />

          <IconButton
            icon={X}
            aria-label="Fechar comparativo em tela cheia"
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-slate-300 hover:text-white hover:bg-rose-500/20"
          />
        </div>
      </header>

      {/* Área Principal das Duas Fotos Lado a Lado */}
      <main className="flex-1 min-h-0 p-3 sm:p-5 grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 overflow-hidden">
        {/* Painel Esquerdo: Foto Anterior */}
        <section className="flex flex-col h-full min-h-0 bg-slate-900/60 rounded-surface-sm border border-slate-800 overflow-hidden">
          <div className="flex items-center justify-between px-3.5 py-2 border-b border-slate-800/80 bg-slate-900/80 shrink-0">
            <span className="text-xs sm:text-sm font-semibold text-slate-200">
              Anterior ({prevDateStr})
            </span>
            <span className="text-xs text-slate-400">
              {previousAssessment?.weight_kg ? `${previousAssessment.weight_kg} kg` : 'Sem peso'}
              {previousAssessment?.body_fat_percentage ? ` • ${previousAssessment.body_fat_percentage}% BF` : ''}
            </span>
          </div>

          <div className="flex-1 min-h-0 p-2 flex items-center justify-center bg-slate-950/80 relative overflow-hidden">
            {currentPair.previous_photo ? (
              <img
                src={currentPair.previous_photo.content_url}
                alt="Foto Anterior"
                draggable={false}
                className="w-full h-full max-h-[82vh] object-contain rounded-surface-xs"
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-slate-500 text-xs gap-2">
                <Camera className="h-8 w-8 text-slate-600" />
                Foto não disponível nesta avaliação
              </div>
            )}
          </div>
        </section>

        {/* Painel Direito: Foto Atual */}
        <section className="flex flex-col h-full min-h-0 bg-violet-950/20 rounded-surface-sm border border-violet-500/20 overflow-hidden">
          <div className="flex items-center justify-between px-3.5 py-2 border-b border-violet-500/20 bg-violet-950/40 shrink-0">
            <span className="text-xs sm:text-sm font-semibold text-violet-300">
              Atual ({currDateStr})
            </span>
            <span className="text-xs text-slate-400">
              {currentAssessment?.weight_kg ? `${currentAssessment.weight_kg} kg` : 'Sem peso'}
              {currentAssessment?.body_fat_percentage ? ` • ${currentAssessment.body_fat_percentage}% BF` : ''}
            </span>
          </div>

          <div className="flex-1 min-h-0 p-2 flex items-center justify-center bg-slate-950/80 relative overflow-hidden">
            {currentPair.current_photo ? (
              <img
                src={currentPair.current_photo.content_url}
                alt="Foto Atual"
                draggable={false}
                className="w-full h-full max-h-[82vh] object-contain rounded-surface-xs"
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-slate-500 text-xs gap-2">
                <Camera className="h-8 w-8 text-slate-600" />
                Foto não disponível nesta avaliação
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Rodapé Informativo / Atalhos de Teclado */}
      <footer className="px-4 py-2 border-t border-slate-800 bg-slate-900/60 shrink-0 flex items-center justify-between text-xs text-slate-400">
        <span className="hidden sm:inline">
          Dica: Use as setas <kbd className="px-1.5 py-0.5 rounded-surface-xs bg-slate-800 border border-slate-700 text-slate-300">←</kbd> <kbd className="px-1.5 py-0.5 rounded-surface-xs bg-slate-800 border border-slate-700 text-slate-300">→</kbd> para navegar entre poses • <kbd className="px-1.5 py-0.5 rounded-surface-xs bg-slate-800 border border-slate-700 text-slate-300">ESC</kbd> para fechar
        </span>
        <span className="sm:hidden text-center w-full">
          Deslize ou feche no canto superior direito
        </span>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={onClose}
          className="text-slate-300 hover:text-white hidden sm:inline-flex"
        >
          Fechar
        </Button>
      </footer>
    </div>
  );

  return createPortal(content, document.body);
};
