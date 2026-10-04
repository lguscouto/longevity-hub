import React from 'react';
import {
  Calendar,
  Camera,
  ChevronLeft,
  Download,
  FileText,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import { EmptyState, Button, IconButton } from '../ui';
import { PhysicalAssessment, Photo, ANGLE_LABELS, BODY_STATE_LABELS } from './types';

interface AssessmentDetailsProps {
  selectedAssessment: PhysicalAssessment;
  isNotesExpanded: boolean;
  setIsNotesExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  onBackToHistory: () => void;
  onOpenEdit: (assessment: PhysicalAssessment) => void;
  onOpenAddPhotos: () => void;
  onDeleteAssessment: (assessment: { id: string; title?: string; date: string }) => void;
  onDeletePhoto: (params: { assessmentId: string; photoId: string }) => void;
  onOpenLightbox: (photo: Photo) => void;
}

export const AssessmentDetails: React.FC<AssessmentDetailsProps> = ({
  selectedAssessment,
  isNotesExpanded,
  setIsNotesExpanded,
  onBackToHistory,
  onOpenEdit,
  onOpenAddPhotos,
  onDeleteAssessment,
  onDeletePhoto,
  onOpenLightbox,
}) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button
          variant="secondary"
          size="sm"
          onClick={onBackToHistory}
          leftIcon={ChevronLeft}
        >
          Voltar ao Histórico
        </Button>

        <div className="flex flex-wrap items-center gap-2">
          {selectedAssessment.photos.length > 0 && (
            <a
              href={`/api/physical-assessments/${selectedAssessment.id}/photos/download`}
              download
              className="px-3.5 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 text-xs font-medium transition-all inline-flex items-center gap-1.5"
              title="Baixar arquivo ZIP com todas as fotografias"
            >
              <Download className="h-4 w-4" /> Baixar Todas as Fotos ({selectedAssessment.photos.length})
            </a>
          )}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onOpenEdit(selectedAssessment)}
            leftIcon={Pencil}
            className="text-amber-600 dark:text-amber-400"
          >
            Editar Avaliação
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={onOpenAddPhotos}
            leftIcon={Plus}
          >
            Adicionar Fotos
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => onDeleteAssessment({ id: selectedAssessment.id, title: selectedAssessment.title, date: selectedAssessment.assessment_date })}
            leftIcon={Trash2}
          >
            Excluir Registro
          </Button>
        </div>
      </div>

      {/* Details Overview Card */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-6 pb-6 border-b border-slate-200 dark:border-slate-800">
          <div className="min-w-0 flex-1">
            <div className="text-cyan-600 dark:text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-1 flex items-center gap-2">
              <Calendar className="h-4 w-4 flex-shrink-0" />
              {new Date(selectedAssessment.assessment_date + 'T00:00:00').toLocaleDateString('pt-BR')}
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white truncate">
              {selectedAssessment.title || `Avaliação Físico-Corporal`}
            </h2>
          </div>

          {/* Metrics Summary Grid */}
          <div className="flex-shrink-0 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {selectedAssessment.weight_kg && (
              <div className="bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-3 rounded-xl text-center shadow-sm min-w-[95px]">
                <span className="text-slate-400 text-xs block">Peso</span>
                <strong className="text-emerald-600 dark:text-emerald-400 text-lg font-bold">{selectedAssessment.weight_kg} kg</strong>
              </div>
            )}
            {selectedAssessment.body_fat_percentage && (
              <div className="bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-3 rounded-xl text-center shadow-sm min-w-[95px]">
                <span className="text-slate-400 text-xs block">% Gordura</span>
                <strong className="text-cyan-600 dark:text-cyan-400 text-lg font-bold">{selectedAssessment.body_fat_percentage}%</strong>
              </div>
            )}
            {selectedAssessment.waist_cm && (
              <div className="bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-3 rounded-xl text-center shadow-sm min-w-[95px]">
                <span className="text-slate-400 text-xs block">Cintura</span>
                <strong className="text-slate-800 dark:text-slate-200 text-lg font-bold">{selectedAssessment.waist_cm} cm</strong>
              </div>
            )}
            {selectedAssessment.abdomen_cm && (
              <div className="bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-3 rounded-xl text-center shadow-sm min-w-[95px]">
                <span className="text-slate-400 text-xs block">Abdômen</span>
                <strong className="text-slate-800 dark:text-slate-200 text-lg font-bold">{selectedAssessment.abdomen_cm} cm</strong>
              </div>
            )}
          </div>
        </div>

        {/* Dedicated Notes & Bioimpedance Section */}
        {selectedAssessment.notes && (
          <div className="mb-6 p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <FileText className="h-4 w-4 text-cyan-600 dark:text-cyan-400 flex-shrink-0" />
                Anotações e bioimpedância
              </span>
              {selectedAssessment.notes.length > 180 && (
                <button
                  type="button"
                  onClick={() => setIsNotesExpanded(!isNotesExpanded)}
                  className="text-xs text-cyan-600 dark:text-cyan-400 hover:text-cyan-500 font-medium transition-colors cursor-pointer"
                >
                  {isNotesExpanded ? 'Recolher' : 'Ver tudo'}
                </button>
              )}
            </div>
            <div
              className={`text-slate-700 dark:text-slate-300 text-sm leading-relaxed whitespace-pre-line ${
                !isNotesExpanded && selectedAssessment.notes.length > 180 ? 'line-clamp-4' : ''
              }`}
            >
              {selectedAssessment.notes}
            </div>
          </div>
        )}

        {/* Photo Gallery Grid */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Camera className="h-4 w-4 text-cyan-600 dark:text-cyan-400" /> Galeria de Fotografias ({selectedAssessment.photos.length})
          </h3>
          {selectedAssessment.photos.length > 0 && (
            <a
              href={`/api/physical-assessments/${selectedAssessment.id}/photos/download`}
              download
              className="text-xs text-cyan-600 dark:text-cyan-400 hover:text-cyan-500 transition-colors inline-flex items-center gap-1 font-medium"
              title="Baixar todas as fotos em formato ZIP"
            >
              <Download className="h-3.5 w-3.5" /> Baixar todas em ZIP
            </a>
          )}
        </div>

        {selectedAssessment.photos.length === 0 ? (
          <EmptyState
            icon={Camera}
            title="Nenhuma foto anexada"
            description="Nenhuma foto corporal foi anexada a esta avaliação física."
          />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {selectedAssessment.photos.map(photo => (
              <div
                key={photo.id}
                className="relative group rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex flex-col"
              >
                <img
                  src={photo.content_url}
                  alt={photo.description || photo.angle}
                  onClick={() => onOpenLightbox(photo)}
                  className="w-full h-56 object-cover cursor-pointer group-hover:scale-105 transition-transform duration-300"
                />

                {/* Badges Overlay */}
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-white/95 dark:bg-slate-900/95 shadow-xs text-xs font-semibold text-cyan-600 dark:text-cyan-400 border border-slate-200 dark:border-slate-700">
                  {ANGLE_LABELS[photo.angle] || photo.angle}
                </div>

                <IconButton
                  variant="destructive"
                  size="sm"
                  onClick={() => onDeletePhoto({ assessmentId: selectedAssessment.id, photoId: photo.id })}
                  icon={Trash2}
                  aria-label="Excluir foto"
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                />

                <div className="p-2.5 bg-slate-50 dark:bg-slate-900 text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between border-t border-slate-200 dark:border-slate-800">
                  <span>{BODY_STATE_LABELS[photo.body_state || 'unspecified']}</span>
                  <span>{(photo.file_size / 1024).toFixed(0)} KB</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
