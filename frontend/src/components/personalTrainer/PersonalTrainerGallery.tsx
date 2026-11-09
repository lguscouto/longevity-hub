import React, { useState, useMemo } from 'react';
import {
  Camera,
  Calendar,
  Download,
  Filter,
  Eye,
  Layers,
  ArrowRight,
  Maximize2,
  Scale,
  Percent,
} from 'lucide-react';
import { Button, EmptyState } from '../ui';
import {
  Photo,
  PhysicalAssessment,
  ANGLE_LABELS,
  BODY_STATE_LABELS,
} from '../physicalAssessments/types';
import { GalleryViewMode, formatDateBr } from './types';

export interface PersonalTrainerGalleryProps {
  assessments: PhysicalAssessment[];
  onSelectPhoto: (photo: Photo, photoList: Photo[]) => void;
}

export const PersonalTrainerGallery: React.FC<PersonalTrainerGalleryProps> = ({
  assessments,
  onSelectPhoto,
}) => {
  const [viewMode, setViewMode] = useState<GalleryViewMode>('timeline');
  const [selectedAngle, setSelectedAngle] = useState<string>('all');
  const [selectedBodyState, setSelectedBodyState] = useState<string>('all');

  // Todas as fotos de todas as avaliações com dados contextuais da avaliação
  const allPhotosWithContext = useMemo(() => {
    const list: Array<{
      photo: Photo;
      assessment: PhysicalAssessment;
      date: string;
      weight?: number;
      bodyFat?: number;
    }> = [];

    // Ordenação cronológica crescente para progressão por ângulo
    const sortedAssessments = [...assessments].sort(
      (a, b) => new Date(a.assessment_date).getTime() - new Date(b.assessment_date).getTime()
    );

    for (const ass of sortedAssessments) {
      for (const p of ass.photos || []) {
        list.push({
          photo: p,
          assessment: ass,
          date: ass.assessment_date,
          weight: ass.weight_kg,
          bodyFat: ass.body_fat_percentage,
        });
      }
    }
    return list;
  }, [assessments]);

  // Fotos filtradas para o mural por ângulo
  const angleMatrixPhotos = useMemo(() => {
    let result = allPhotosWithContext;
    if (selectedAngle !== 'all') {
      result = result.filter(item => item.photo.angle === selectedAngle);
    }
    if (selectedBodyState !== 'all') {
      result = result.filter(item => (item.photo.body_state || 'unspecified') === selectedBodyState);
    }
    return result;
  }, [allPhotosWithContext, selectedAngle, selectedBodyState]);

  if (assessments.length === 0) {
    return (
      <EmptyState
        title="Nenhuma avaliação física cadastrada"
        description="Assim que a primeira avaliação física for cadastrada com fotos, a galeria de poses e a linha do tempo do personal estarão disponíveis aqui."
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls & Filter Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* View Mode Switcher */}
        <div className="flex items-center gap-1.5 bg-slate-100/90 dark:bg-slate-900/90 p-1 rounded-xl border border-slate-200 dark:border-slate-800 self-start md:self-auto">
          <button
            type="button"
            onClick={() => setViewMode('timeline')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === 'timeline'
                ? 'bg-cyan-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Calendar className="h-3.5 w-3.5" /> Linha do Tempo por Avaliação
          </button>
          <button
            type="button"
            onClick={() => {
              setViewMode('by-angle');
              if (selectedAngle === 'all') setSelectedAngle('front');
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === 'by-angle'
                ? 'bg-cyan-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Layers className="h-3.5 w-3.5" /> Mural de Poses Lado a Lado
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {viewMode === 'timeline' ? (
            <>
              <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 font-medium mr-1">
                <Filter className="h-3.5 w-3.5" /> Filtrar poses:
              </div>
              <select
                value={selectedAngle}
                onChange={e => setSelectedAngle(e.target.value)}
                className="text-xs font-medium py-1.5 px-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 focus-visible:ring-2 focus-visible:ring-cyan-500"
              >
                <option value="all">Todas as poses ({assessments.reduce((acc, a) => acc + (a.photos?.length || 0), 0)})</option>
                <option value="front">Frente</option>
                <option value="back">Costas</option>
                <option value="left_side">Lado Esquerdo</option>
                <option value="right_side">Lado Direito</option>
                <option value="other">Outro</option>
              </select>
              <select
                value={selectedBodyState}
                onChange={e => setSelectedBodyState(e.target.value)}
                className="text-xs font-medium py-1.5 px-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 focus-visible:ring-2 focus-visible:ring-cyan-500"
              >
                <option value="all">Todos os estados</option>
                <option value="relaxed">Relaxado</option>
                <option value="flexed">Contraído</option>
                <option value="unspecified">Não informado</option>
              </select>
            </>
          ) : (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 mr-1">
                Pose de Análise:
              </span>
              {[
                { id: 'front', label: 'Frente' },
                { id: 'back', label: 'Costas' },
                { id: 'left_side', label: 'Lado Esquerdo' },
                { id: 'right_side', label: 'Lado Direito' },
                { id: 'other', label: 'Outro' },
              ].map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedAngle(item.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                    selectedAngle === item.id
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* MODE 1: TIMELINE DE AVALIAÇÕES */}
      {viewMode === 'timeline' && (
        <div className="space-y-6">
          {assessments.map(assessment => {
            const photosList = assessment.photos || [];
            const filteredPhotos = photosList.filter(p => {
              if (selectedAngle !== 'all' && p.angle !== selectedAngle) return false;
              if (selectedBodyState !== 'all' && (p.body_state || 'unspecified') !== selectedBodyState) return false;
              return true;
            });

            return (
              <div
                key={assessment.id}
                className="glass-panel p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4"
              >
                {/* Header of Assessment Card */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
                  <div>
                    <div className="flex items-center gap-2 text-cyan-600 dark:text-cyan-400 text-xs font-bold uppercase tracking-wider mb-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {formatDateBr(assessment.assessment_date)}
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      {assessment.title || `Avaliação de ${formatDateBr(assessment.assessment_date)}`}
                    </h3>
                  </div>

                  {/* Badges & Download ZIP */}
                  <div className="flex flex-wrap items-center gap-2">
                    {assessment.weight_kg && (
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                        {assessment.weight_kg} kg
                      </span>
                    )}
                    {assessment.body_fat_percentage && (
                      <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 px-2.5 py-1 rounded-lg border border-cyan-500/20">
                        {assessment.body_fat_percentage}% Gordura
                      </span>
                    )}
                    {assessment.waist_cm && (
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
                        Cintura: {assessment.waist_cm} cm
                      </span>
                    )}
                    {assessment.photos && assessment.photos.length > 0 && (
                      <a
                        href={`/api/physical-assessments/${assessment.id}/photos/download`}
                        download
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30 transition-all"
                        title="Baixar todas as fotos desta avaliação (.zip)"
                      >
                        <Download className="h-3.5 w-3.5" /> Baixar ZIP ({assessment.photos.length})
                      </a>
                    )}
                  </div>
                </div>

                {/* Notes if available */}
                {assessment.notes && (
                  <div className="text-xs text-slate-600 dark:text-slate-400 italic bg-slate-50 dark:bg-slate-950/40 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800/60">
                    "{assessment.notes}"
                  </div>
                )}

                {/* Photo Grid */}
                {filteredPhotos.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-400 dark:text-slate-500">
                    Nenhuma foto corresponde aos filtros selecionados para esta data.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
                    {filteredPhotos.map(photo => (
                      <div
                        key={photo.id}
                        onClick={() => onSelectPhoto(photo, assessment.photos || [])}
                        className="group relative aspect-3/4 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-cyan-500 dark:hover:border-cyan-400 cursor-pointer transition-all shadow-2xs hover:shadow-md"
                      >
                        <img
                          src={photo.content_url}
                          alt={photo.description || ANGLE_LABELS[photo.angle] || 'Foto'}
                          className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-80 group-hover:opacity-95 transition-opacity pointer-events-none" />

                        {/* Top Badge: Body State */}
                        {photo.body_state && photo.body_state !== 'unspecified' && (
                          <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded text-[11px] font-bold bg-slate-900/80 text-white border border-slate-700">
                            {BODY_STATE_LABELS[photo.body_state]}
                          </div>
                        )}

                        {/* Bottom Bar: Angle & Zoom Icon */}
                        <div className="absolute bottom-2 inset-x-2 flex items-center justify-between text-white text-xs font-semibold">
                          <span className="truncate drop-shadow-xs">
                            {ANGLE_LABELS[photo.angle] || photo.angle}
                          </span>
                          <Maximize2 className="h-3.5 w-3.5 text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* MODE 2: MURAL DE POSES LADO A LADO (PROGRESSÃO POR ÂNGULO) */}
      {viewMode === 'by-angle' && (
        <div className="glass-panel p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Layers className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                Evolução Cronológica — Pose: {ANGLE_LABELS[selectedAngle] || selectedAngle}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Fotos alinhadas em sequência da mais antiga para a mais recente para inspeção direta de hipertrofia e definição.
              </p>
            </div>
            <div className="text-xs font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700">
              {angleMatrixPhotos.length} {angleMatrixPhotos.length === 1 ? 'registro' : 'registros'} nesta pose
            </div>
          </div>

          {angleMatrixPhotos.length === 0 ? (
            <div className="py-12 text-center text-slate-400 dark:text-slate-500 text-xs">
              Nenhuma foto cadastrada para a pose "{ANGLE_LABELS[selectedAngle] || selectedAngle}".
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {angleMatrixPhotos.map((item, index) => {
                const isFirst = index === 0;
                const isLatest = index === angleMatrixPhotos.length - 1;

                return (
                  <div
                    key={item.photo.id}
                    onClick={() =>
                      onSelectPhoto(
                        item.photo,
                        angleMatrixPhotos.map(m => m.photo)
                      )
                    }
                    className="group flex flex-col rounded-xl overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-cyan-500 dark:hover:border-cyan-400 cursor-pointer transition-all shadow-xs"
                  >
                    {/* Header Tag */}
                    <div className="p-2.5 bg-slate-50 dark:bg-slate-950 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                        <Calendar className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
                        {formatDateBr(item.date)}
                      </div>
                      {isFirst && (
                        <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                          Início
                        </span>
                      )}
                      {isLatest && !isFirst && (
                        <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          Atual
                        </span>
                      )}
                    </div>

                    {/* Image */}
                    <div className="relative aspect-3/4 bg-slate-950 flex items-center justify-center overflow-hidden">
                      <img
                        src={item.photo.content_url}
                        alt={`Pose ${item.date}`}
                        className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                      />
                      {item.photo.body_state && item.photo.body_state !== 'unspecified' && (
                        <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded text-[11px] font-bold bg-slate-900/80 text-white border border-slate-700">
                          {BODY_STATE_LABELS[item.photo.body_state]}
                        </div>
                      )}
                      <div className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                        <Maximize2 className="h-3.5 w-3.5" />
                      </div>
                    </div>

                    {/* Metrics Footer */}
                    <div className="p-2.5 bg-white dark:bg-slate-900 flex items-center justify-between text-xs border-t border-slate-100 dark:border-slate-800/80">
                      <div className="flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                        <Scale className="h-3 w-3" />
                        {item.weight ? `${item.weight} kg` : '—'}
                      </div>
                      <div className="flex items-center gap-1 font-semibold text-cyan-600 dark:text-cyan-400">
                        <Percent className="h-3 w-3" />
                        {item.bodyFat ? `${item.bodyFat}%` : '—'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
