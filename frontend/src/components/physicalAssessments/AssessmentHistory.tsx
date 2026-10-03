import React from 'react';
import {
  Calendar,
  Camera,
  Eye,
  Download,
  Pencil,
  Trash2,
} from 'lucide-react';
import { BodyCompositionChart } from '../BodyCompositionChart';
import { EmptyState } from '../ui';
import { PhysicalAssessment } from './types';

interface AssessmentHistoryProps {
  assessments: PhysicalAssessment[];
  chartRefreshKey: number;
  onSelectAssessment: (id: string) => void;
  onOpenCreate: () => void;
  onOpenEdit: (assessment: PhysicalAssessment) => void;
  onDeleteAssessment: (assessment: { id: string; title?: string; date: string }) => void;
}

export const AssessmentHistory: React.FC<AssessmentHistoryProps> = ({
  assessments,
  chartRefreshKey,
  onSelectAssessment,
  onOpenCreate,
  onOpenEdit,
  onDeleteAssessment,
}) => {
  return (
    <div className="space-y-6">
      <BodyCompositionChart
        refreshKey={chartRefreshKey}
        onSelectAssessment={onSelectAssessment}
      />

      {assessments.length === 0 ? (
        <EmptyState
          title="Nenhuma avaliação física cadastrada"
          description="Registre sua primeira avaliação física para acompanhar fotos de frente, costas e lados, peso e percentual de gordura."
          action={{
            label: 'Registrar Primeira Avaliação',
            onClick: onOpenCreate,
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {assessments.map(ass => {
            const frontPhoto = ass.photos.find(p => p.angle === 'front') || ass.photos[0];
            return (
              <div
                key={ass.id}
                className="glass-panel rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between group"
              >
                {/* Thumbnail Header */}
                <div className="relative h-48 bg-slate-100 dark:bg-slate-950 flex items-center justify-center overflow-hidden">
                  {frontPhoto ? (
                    <img
                      src={frontPhoto.content_url}
                      alt={`Avaliação ${ass.assessment_date}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="flex flex-col items-center text-slate-400 dark:text-slate-600 gap-2">
                      <Camera className="h-10 w-10" />
                      <span className="text-xs">Sem fotos</span>
                    </div>
                  )}
                  <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-white/95 dark:bg-slate-900/95 shadow-xs border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-200 font-medium flex items-center gap-1.5">
                    <Camera className="h-3.5 w-3.5 text-cyan-400" />
                    {ass.photos.length} {ass.photos.length === 1 ? 'foto' : 'fotos'}
                  </div>
                </div>

                {/* Content Body */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 text-cyan-600 dark:text-cyan-400 text-xs font-semibold uppercase tracking-wider">
                        <Calendar className="h-3.5 w-3.5" />
                        {new Date(ass.assessment_date + 'T00:00:00').toLocaleDateString('pt-BR')}
                      </div>
                      {ass.weight_kg && (
                        <div className="text-xs text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                          {ass.weight_kg} kg
                        </div>
                      )}
                    </div>

                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 line-clamp-1">
                      {ass.title || `Avaliação de ${new Date(ass.assessment_date + 'T00:00:00').toLocaleDateString('pt-BR')}`}
                    </h3>

                    {/* Badges for metrics */}
                    <div className="flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400 mb-3">
                      {ass.body_fat_percentage && (
                        <span className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2 py-1 rounded">
                          Gordura: <strong className="text-slate-800 dark:text-slate-200">{ass.body_fat_percentage}%</strong>
                        </span>
                      )}
                      {ass.waist_cm && (
                        <span className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2 py-1 rounded">
                          Cintura: <strong className="text-slate-800 dark:text-slate-200">{ass.waist_cm} cm</strong>
                        </span>
                      )}
                      {ass.notes && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1 italic w-full break-words">
                          "{ass.notes}"
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Card Action Buttons */}
                  <div className="pt-4 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between gap-2 mt-4">
                    <button
                      onClick={() => onSelectAssessment(ass.id)}
                      className="flex-1 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white text-xs font-medium transition-all flex items-center justify-center gap-1.5"
                    >
                      <Eye className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" /> Ver Detalhes
                    </button>
                    {ass.photos.length > 0 && (
                      <a
                        href={`/api/physical-assessments/${ass.id}/photos/download`}
                        download
                        className="p-2 rounded-xl bg-white dark:bg-slate-900 hover:bg-cyan-500/10 dark:hover:bg-cyan-500/20 text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 border border-slate-200 dark:border-slate-800 hover:border-cyan-500/30 transition-all flex items-center justify-center"
                        title={`Baixar todas as fotos (${ass.photos.length} fotos)`}
                      >
                        <Download className="h-4 w-4" />
                      </a>
                    )}
                    <button
                      onClick={() => onOpenEdit(ass)}
                      className="p-2 rounded-xl bg-white dark:bg-slate-900 hover:bg-amber-500/10 dark:hover:bg-amber-500/20 text-slate-400 hover:text-amber-500 border border-slate-200 dark:border-slate-800 hover:border-amber-500/30 transition-all"
                      title="Editar avaliação"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onDeleteAssessment({ id: ass.id, title: ass.title, date: ass.assessment_date })}
                      className="p-2 rounded-xl bg-white dark:bg-slate-900 hover:bg-rose-500/10 dark:hover:bg-rose-500/20 text-slate-400 hover:text-rose-500 border border-slate-200 dark:border-slate-800 hover:border-rose-500/30 transition-all"
                      title="Excluir avaliação"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
