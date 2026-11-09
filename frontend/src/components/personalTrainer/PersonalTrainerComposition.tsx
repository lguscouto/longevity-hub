import React from 'react';
import {
  Scale,
  Percent,
  Calendar,
  Ruler,
  Camera,
  Download,
  FileText,
  Activity,
  Sparkles,
} from 'lucide-react';
import { BodyCompositionChart } from '../BodyCompositionChart';
import { PhysicalAssessment } from '../physicalAssessments/types';
import { calcLeanAndFatMass, formatDateBr } from './types';

export interface PersonalTrainerCompositionProps {
  assessments: PhysicalAssessment[];
  chartRefreshKey?: number;
  onSelectAssessment?: (id: string) => void;
  onViewPhotos?: (assessment: PhysicalAssessment) => void;
}

export const PersonalTrainerComposition: React.FC<PersonalTrainerCompositionProps> = ({
  assessments,
  chartRefreshKey = 0,
  onSelectAssessment,
  onViewPhotos,
}) => {
  return (
    <div className="space-y-6">
      {/* Gráfico Longitudinal Interativo */}
      <BodyCompositionChart
        refreshKey={chartRefreshKey}
        onSelectAssessment={onSelectAssessment}
      />

      {/* Tabela Antropométrica Consolidada */}
      <div className="glass-panel p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Ruler className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
              Tabela de Medidas Antropométricas e Bioimpedância
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Registro histórico detalhado de todas as pesagens, perímetros corporais e fotos vinculadas.
            </p>
          </div>
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            {assessments.length} {assessments.length === 1 ? 'coleta registrada' : 'coletas registradas'}
          </div>
        </div>

        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold">
                <th className="py-2.5 px-3">Data</th>
                <th className="py-2.5 px-3">Peso</th>
                <th className="py-2.5 px-3">% Gordura</th>
                <th className="py-2.5 px-3">Massa Magra</th>
                <th className="py-2.5 px-3">Massa Gorda</th>
                <th className="py-2.5 px-3">Cintura</th>
                <th className="py-2.5 px-3">Abdômen</th>
                <th className="py-2.5 px-3">Quadril</th>
                <th className="py-2.5 px-3">Fotos</th>
                <th className="py-2.5 px-3">Anotações</th>
                <th className="py-2.5 px-3 text-right">Arquivo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
              {assessments.map((ass, idx) => {
                const comp = calcLeanAndFatMass(ass.weight_kg, ass.body_fat_percentage);
                const isLatest = idx === 0;

                return (
                  <tr
                    key={ass.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
                        <Calendar className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
                        <span>{formatDateBr(ass.assessment_date)}</span>
                        {isLatest && (
                          <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            Mais recente
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap font-bold text-slate-900 dark:text-white">
                      {ass.weight_kg ? `${ass.weight_kg} kg` : '—'}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap font-bold text-cyan-600 dark:text-cyan-400">
                      {ass.body_fat_percentage ? `${ass.body_fat_percentage}%` : '—'}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap text-slate-700 dark:text-slate-300">
                      {comp.leanMass ? `${comp.leanMass} kg` : '—'}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap text-slate-500 dark:text-slate-400">
                      {comp.fatMass ? `${comp.fatMass} kg` : '—'}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap text-slate-700 dark:text-slate-300">
                      {ass.waist_cm ? `${ass.waist_cm} cm` : '—'}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap text-slate-700 dark:text-slate-300">
                      {ass.abdomen_cm ? `${ass.abdomen_cm} cm` : '—'}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap text-slate-700 dark:text-slate-300">
                      {ass.hip_cm ? `${ass.hip_cm} cm` : '—'}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      {ass.photos && ass.photos.length > 0 ? (
                        <button
                          type="button"
                          onClick={() => onViewPhotos?.(ass)}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30 transition-colors cursor-pointer"
                          title="Visualizar fotos desta avaliação"
                        >
                          <Camera className="h-3 w-3 text-cyan-500" />
                          <span>{ass.photos.length} {ass.photos.length === 1 ? 'foto' : 'fotos'}</span>
                        </button>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>
                    <td className="py-3 px-3 max-w-xs truncate text-slate-500 dark:text-slate-400" title={ass.notes}>
                      {ass.notes || '—'}
                    </td>
                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      {ass.photos && ass.photos.length > 0 ? (
                        <a
                          href={`/api/physical-assessments/${ass.id}/photos/download`}
                          download
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30 transition-all"
                          title="Baixar ZIP de fotos"
                        >
                          <Download className="h-3 w-3" /> ZIP
                        </a>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
