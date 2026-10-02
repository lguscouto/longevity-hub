import React from 'react';
import { ArrowLeftRight, AlertCircle, RefreshCw, Camera } from 'lucide-react';
import { EmptyState } from '../ui';
import { PhysicalAssessment, ComparisonManifest, Photo, ANGLE_LABELS } from './types';

interface AssessmentComparisonProps {
  assessments: PhysicalAssessment[];
  comparePrevId: string;
  setComparePrevId: (id: string) => void;
  compareCurrId: string;
  setCompareCurrId: (id: string) => void;
  compareLoading: boolean;
  compareError: string | null;
  comparisonManifest: ComparisonManifest | null;
  onRunComparison: () => void;
  onOpenLightbox: (photo: Photo) => void;
}

export const AssessmentComparison: React.FC<AssessmentComparisonProps> = ({
  assessments,
  comparePrevId,
  setComparePrevId,
  compareCurrId,
  setCompareCurrId,
  compareLoading,
  compareError,
  comparisonManifest,
  onRunComparison,
  onOpenLightbox,
}) => {
  return (
    <div className="space-y-6">
      <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <ArrowLeftRight className="h-5 w-5 text-violet-500" /> Seleção de Períodos para Comparação
        </h3>

        {compareError && (
          <div role="alert" className="p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{compareError}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">Avaliação Anterior (Baseline)</label>
            <select
              value={comparePrevId}
              onChange={e => setComparePrevId(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:border-violet-500"
            >
              <option value="">Selecione a avaliação anterior...</option>
              {assessments.map(a => (
                <option key={a.id} value={a.id}>
                  {new Date(a.assessment_date + 'T00:00:00').toLocaleDateString('pt-BR')} — {a.title || 'Sem título'} ({a.weight_kg ? `${a.weight_kg}kg` : 'sem peso'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">Avaliação Atual (Evolução)</label>
            <select
              value={compareCurrId}
              onChange={e => setCompareCurrId(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:border-violet-500"
            >
              <option value="">Selecione a avaliação recente...</option>
              {assessments.map(a => (
                <option key={a.id} value={a.id}>
                  {new Date(a.assessment_date + 'T00:00:00').toLocaleDateString('pt-BR')} — {a.title || 'Sem título'} ({a.weight_kg ? `${a.weight_kg}kg` : 'sem peso'})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={onRunComparison}
            disabled={compareLoading || !comparePrevId || !compareCurrId}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white font-semibold text-sm shadow-lg hover:shadow-purple-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {compareLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ArrowLeftRight className="h-4 w-4" />}
            Gerar Comparativo Lado a Lado
          </button>
        </div>
      </div>

      {/* Comparison Results */}
      {comparisonManifest && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <span className="text-xs font-semibold text-violet-500 uppercase tracking-wider">Intervalo Decorrido</span>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  {comparisonManifest.days_between} dias entre as avaliações
                </h3>
              </div>

              <div className="flex gap-4 text-sm text-slate-700 dark:text-slate-300">
                <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-center shadow-sm">
                  <span className="text-xs text-slate-400 block">Baseline</span>
                  <strong>{new Date(comparisonManifest.previous_assessment.assessment_date + 'T00:00:00').toLocaleDateString('pt-BR')}</strong>
                </div>
                <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-center shadow-sm">
                  <span className="text-xs text-slate-400 block">Evolução</span>
                  <strong>{new Date(comparisonManifest.current_assessment.assessment_date + 'T00:00:00').toLocaleDateString('pt-BR')}</strong>
                </div>
              </div>
            </div>

            {/* Deltas Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
              <div className="bg-white/60 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <span className="text-xs text-slate-400 block">Variação de Peso</span>
                {comparisonManifest.deltas.weight_kg !== null ? (
                  <strong className={`text-lg font-bold ${comparisonManifest.deltas.weight_kg! <= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {comparisonManifest.deltas.weight_kg! > 0 ? `+${comparisonManifest.deltas.weight_kg}` : comparisonManifest.deltas.weight_kg} kg
                  </strong>
                ) : (
                  <span className="text-slate-500 text-sm">—</span>
                )}
              </div>

              <div className="bg-white/60 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <span className="text-xs text-slate-400 block">Variação % Gordura</span>
                {comparisonManifest.deltas.body_fat_percentage !== null ? (
                  <strong className={`text-lg font-bold ${comparisonManifest.deltas.body_fat_percentage! <= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {comparisonManifest.deltas.body_fat_percentage! > 0 ? `+${comparisonManifest.deltas.body_fat_percentage}` : comparisonManifest.deltas.body_fat_percentage}%
                  </strong>
                ) : (
                  <span className="text-slate-500 text-sm">—</span>
                )}
              </div>

              <div className="bg-white/60 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <span className="text-xs text-slate-400 block">Variação Cintura</span>
                {comparisonManifest.deltas.waist_cm !== null ? (
                  <strong className="text-lg font-bold text-slate-800 dark:text-slate-200">
                    {comparisonManifest.deltas.waist_cm! > 0 ? `+${comparisonManifest.deltas.waist_cm}` : comparisonManifest.deltas.waist_cm} cm
                  </strong>
                ) : (
                  <span className="text-slate-500 text-sm">—</span>
                )}
              </div>

              <div className="bg-white/60 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <span className="text-xs text-slate-400 block">Variação Abdômen</span>
                {comparisonManifest.deltas.abdomen_cm !== null ? (
                  <strong className="text-lg font-bold text-slate-800 dark:text-slate-200">
                    {comparisonManifest.deltas.abdomen_cm! > 0 ? `+${comparisonManifest.deltas.abdomen_cm}` : comparisonManifest.deltas.abdomen_cm} cm
                  </strong>
                ) : (
                  <span className="text-slate-500 text-sm">—</span>
                )}
              </div>
            </div>
          </div>

          {/* Side-by-side Matched Photos */}
          <div className="space-y-6">
            <h4 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Camera className="h-5 w-5 text-cyan-500" /> Comparativo Fotográfico Lado a Lado Por Ângulo
            </h4>

            {comparisonManifest.matched_photos.length === 0 ? (
              <EmptyState
                icon={Camera}
                title="Nenhuma foto correspondente"
                description="Nenhuma foto equivalente foi encontrada para parear lado a lado nesta comparação."
              />
            ) : (
              <div className="space-y-6">
                {comparisonManifest.matched_photos.map((match, idx) => (
                  <div key={idx} className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                      <span className="text-sm font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider">
                        Ângulo: {ANGLE_LABELS[match.angle] || match.angle}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Previous Photo */}
                      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col items-center">
                        <span className="text-xs font-semibold text-slate-400 mb-2">
                          Anterior ({new Date(comparisonManifest.previous_assessment.assessment_date + 'T00:00:00').toLocaleDateString('pt-BR')})
                        </span>
                        {match.previous_photo ? (
                          <img
                            src={match.previous_photo.content_url}
                            alt="Anterior"
                            onClick={() => onOpenLightbox(match.previous_photo!)}
                            className="w-full h-80 object-cover rounded-lg border border-slate-800 cursor-pointer hover:scale-102 transition-transform"
                          />
                        ) : (
                          <div className="w-full h-80 flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 bg-slate-100/40 dark:bg-slate-900/40 rounded-lg text-xs">
                            <Camera className="h-8 w-8 mb-2" /> Foto não disponível nesta avaliação
                          </div>
                        )}
                      </div>

                      {/* Current Photo */}
                      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col items-center">
                        <span className="text-xs font-semibold text-slate-400 mb-2">
                          Atual ({new Date(comparisonManifest.current_assessment.assessment_date + 'T00:00:00').toLocaleDateString('pt-BR')})
                        </span>
                        {match.current_photo ? (
                          <img
                            src={match.current_photo.content_url}
                            alt="Atual"
                            onClick={() => onOpenLightbox(match.current_photo!)}
                            className="w-full h-80 object-cover rounded-lg border border-slate-800 cursor-pointer hover:scale-102 transition-transform"
                          />
                        ) : (
                          <div className="w-full h-80 flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 bg-slate-100/40 dark:bg-slate-900/40 rounded-lg text-xs">
                            <Camera className="h-8 w-8 mb-2" /> Foto não disponível nesta avaliação
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
