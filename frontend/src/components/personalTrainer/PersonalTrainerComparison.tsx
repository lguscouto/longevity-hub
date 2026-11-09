import React, { useState, useMemo, useEffect } from 'react';
import {
  ArrowLeftRight,
  Columns2,
  SlidersHorizontal,
  Maximize2,
  Calendar,
  Scale,
  Percent,
  Ruler,
  Activity,
  Sparkles,
  AlertCircle,
  RefreshCw,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { Button, EmptyState } from '../ui';
import {
  PhysicalAssessment,
  ComparisonManifest,
  Photo,
  ANGLE_LABELS,
  BODY_STATE_LABELS,
} from '../physicalAssessments/types';
import { SideBySideLightbox } from '../physicalAssessments/SideBySideLightbox';
import { calcLeanAndFatMass, formatDateBr } from './types';

export interface PersonalTrainerComparisonProps {
  assessments: PhysicalAssessment[];
  comparePrevId: string;
  setComparePrevId: (id: string) => void;
  compareCurrId: string;
  setCompareCurrId: (id: string) => void;
  compareLoading: boolean;
  compareError: string | null;
  comparisonManifest: ComparisonManifest | null;
  onRunComparison: (prevId?: string, currId?: string) => void;
  onOpenLightbox: (photo: Photo) => void;
}

type ComparisonViewMode = 'side-by-side' | 'slider';

export const PersonalTrainerComparison: React.FC<PersonalTrainerComparisonProps> = ({
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
  const [selectedAngle, setSelectedAngle] = useState<string>('all');
  const [viewMode, setViewMode] = useState<ComparisonViewMode>('side-by-side');
  const [sliderPosition, setSliderPosition] = useState<number>(50);
  const [isDraggingSlider, setIsDraggingSlider] = useState<boolean>(false);
  const [sideBySideLightboxIndex, setSideBySideLightboxIndex] = useState<number | null>(null);

  // Auto-inicializa seleção se vazia
  useEffect(() => {
    if (assessments.length >= 2) {
      if (!comparePrevId && !compareCurrId) {
        setComparePrevId(assessments[assessments.length - 1].id);
        setCompareCurrId(assessments[0].id);
      }
    }
  }, [assessments, comparePrevId, compareCurrId, setComparePrevId, setCompareCurrId]);

  // Executa comparativo automático quando os dois IDs são definidos
  useEffect(() => {
    if (comparePrevId && compareCurrId && comparePrevId !== compareCurrId && !comparisonManifest) {
      onRunComparison(comparePrevId, compareCurrId);
    }
  }, [comparePrevId, compareCurrId]);

  const selectedPrevAssessment = useMemo(
    () => assessments.find(a => a.id === comparePrevId),
    [assessments, comparePrevId]
  );
  const selectedCurrAssessment = useMemo(
    () => assessments.find(a => a.id === compareCurrId),
    [assessments, compareCurrId]
  );

  const filteredPhotos = useMemo(() => {
    if (!comparisonManifest) return [];
    if (selectedAngle === 'all') return comparisonManifest.matched_photos;
    return comparisonManifest.matched_photos.filter(m => m.angle === selectedAngle);
  }, [comparisonManifest, selectedAngle]);

  const compositionStats = useMemo(() => {
    if (!comparisonManifest) return null;
    const prev = comparisonManifest.previous_assessment;
    const curr = comparisonManifest.current_assessment;
    const prevComp = calcLeanAndFatMass(prev.weight_kg, prev.body_fat_percentage);
    const currComp = calcLeanAndFatMass(curr.weight_kg, curr.body_fat_percentage);

    const leanDelta =
      prevComp.leanMass !== null && currComp.leanMass !== null
        ? Number((currComp.leanMass - prevComp.leanMass).toFixed(2))
        : null;
    const fatMassDelta =
      prevComp.fatMass !== null && currComp.fatMass !== null
        ? Number((currComp.fatMass - prevComp.fatMass).toFixed(2))
        : null;

    return {
      prevLean: prevComp.leanMass,
      currLean: currComp.leanMass,
      leanDelta,
      prevFatMass: prevComp.fatMass,
      currFatMass: currComp.fatMass,
      fatMassDelta,
    };
  }, [comparisonManifest]);

  const handleSwapPeriods = () => {
    if (!comparePrevId || !compareCurrId) return;
    const prev = comparePrevId;
    const curr = compareCurrId;
    setComparePrevId(curr);
    setCompareCurrId(prev);
    onRunComparison(curr, prev);
  };

  const handleSelectInitialVsLatest = () => {
    if (assessments.length < 2) return;
    const prevId = assessments[assessments.length - 1].id;
    const currId = assessments[0].id;
    setComparePrevId(prevId);
    setCompareCurrId(currId);
    onRunComparison(prevId, currId);
  };

  const handleSelectPreviousVsLatest = () => {
    if (assessments.length < 2) return;
    const prevId = assessments[1].id;
    const currId = assessments[0].id;
    setComparePrevId(prevId);
    setCompareCurrId(currId);
    onRunComparison(prevId, currId);
  };

  const updateSliderFromPointer = (clientX: number, rect: DOMRect) => {
    if (rect.width <= 0) return;
    const rawPct = ((clientX - rect.left) / rect.width) * 100;
    const clamped = Math.max(5, Math.min(95, Math.round(rawPct)));
    setSliderPosition(clamped);
  };

  if (assessments.length < 2) {
    return (
      <EmptyState
        title="São necessárias pelo menos duas avaliações para comparar"
        description="Cadastre pelo menos duas avaliações físicas com fotos para liberar o comparativo lado a lado e a análise de evolução antropométrica."
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Selector & Action Panel */}
      <div className="glass-panel p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ArrowLeftRight className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
              Comparador de Evolução e Poses
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Selecione as duas avaliações para confrontar fotos no mesmo ângulo e avaliar as variações corporais.
            </p>
          </div>

          {/* Quick Presets */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={handleSelectInitialVsLatest}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer"
            >
              Início vs Atual
            </button>
            <button
              type="button"
              onClick={handleSelectPreviousVsLatest}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer"
            >
              Última vs Penúltima
            </button>
            <button
              type="button"
              onClick={handleSwapPeriods}
              className="p-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer"
              title="Inverter períodos"
            >
              <ArrowLeftRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Period Dropdowns & Run Button */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
          <div className="sm:col-span-5">
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
              Avaliação Anterior / Base:
            </label>
            <select
              value={comparePrevId}
              onChange={e => setComparePrevId(e.target.value)}
              className="w-full text-xs font-medium py-2 px-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus-visible:ring-2 focus-visible:ring-cyan-500"
            >
              <option value="">Selecione uma avaliação base...</option>
              {assessments.map(ass => (
                <option key={ass.id} value={ass.id}>
                  {formatDateBr(ass.assessment_date)} — {ass.title || 'Avaliação'} ({ass.weight_kg ? `${ass.weight_kg}kg` : 'sem peso'})
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-5">
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
              Avaliação Recente / Atual:
            </label>
            <select
              value={compareCurrId}
              onChange={e => setCompareCurrId(e.target.value)}
              className="w-full text-xs font-medium py-2 px-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus-visible:ring-2 focus-visible:ring-cyan-500"
            >
              <option value="">Selecione uma avaliação recente...</option>
              {assessments.map(ass => (
                <option key={ass.id} value={ass.id}>
                  {formatDateBr(ass.assessment_date)} — {ass.title || 'Avaliação'} ({ass.weight_kg ? `${ass.weight_kg}kg` : 'sem peso'})
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => onRunComparison(comparePrevId, compareCurrId)}
              disabled={!comparePrevId || !compareCurrId || comparePrevId === compareCurrId || compareLoading}
              leftIcon={compareLoading ? RefreshCw : ArrowLeftRight}
              className="w-full text-xs min-h-[38px] font-bold"
            >
              {compareLoading ? 'Comparando...' : 'Comparar'}
            </Button>
          </div>
        </div>

        {compareError && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{compareError}</span>
          </div>
        )}
      </div>

      {/* MANIFEST RESULTS */}
      {comparisonManifest && (
        <div className="space-y-6 animate-fadeIn">
          {/* Summary Deltas Hero */}
          <div className="glass-panel p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Resumo de Evolução ({comparisonManifest.days_between} dias de intervalo)
                </h4>
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                De <strong>{formatDateBr(comparisonManifest.previous_assessment.assessment_date)}</strong> até{' '}
                <strong>{formatDateBr(comparisonManifest.current_assessment.assessment_date)}</strong>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {/* Delta 1: Peso */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 text-center">
                <span className="text-xs text-slate-400 block mb-0.5">Peso</span>
                <div className="text-sm font-bold text-slate-900 dark:text-white">
                  {comparisonManifest.previous_assessment.weight_kg ?? '—'}kg →{' '}
                  {comparisonManifest.current_assessment.weight_kg ?? '—'}kg
                </div>
                {comparisonManifest.deltas.weight_kg !== undefined && comparisonManifest.deltas.weight_kg !== null && (
                  <span
                    className={`inline-block text-xs font-bold mt-1 px-2 py-0.5 rounded-full ${
                      comparisonManifest.deltas.weight_kg < 0
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : comparisonManifest.deltas.weight_kg > 0
                        ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                    }`}
                  >
                    {comparisonManifest.deltas.weight_kg > 0
                      ? `+${comparisonManifest.deltas.weight_kg} kg`
                      : `${comparisonManifest.deltas.weight_kg} kg`}
                  </span>
                )}
              </div>

              {/* Delta 2: % Gordura */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 text-center">
                <span className="text-xs text-slate-400 block mb-0.5">% Gordura</span>
                <div className="text-sm font-bold text-slate-900 dark:text-white">
                  {comparisonManifest.previous_assessment.body_fat_percentage ?? '—'}% →{' '}
                  {comparisonManifest.current_assessment.body_fat_percentage ?? '—'}%
                </div>
                {comparisonManifest.deltas.body_fat_percentage !== undefined &&
                  comparisonManifest.deltas.body_fat_percentage !== null && (
                    <span
                      className={`inline-block text-xs font-bold mt-1 px-2 py-0.5 rounded-full ${
                        comparisonManifest.deltas.body_fat_percentage < 0
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : comparisonManifest.deltas.body_fat_percentage > 0
                          ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                      }`}
                    >
                      {comparisonManifest.deltas.body_fat_percentage > 0
                        ? `+${comparisonManifest.deltas.body_fat_percentage}%`
                        : `${comparisonManifest.deltas.body_fat_percentage}%`}
                    </span>
                  )}
              </div>

              {/* Delta 3: Massa Magra Estimada */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 text-center">
                <span className="text-xs text-slate-400 block mb-0.5">Massa Magra</span>
                <div className="text-sm font-bold text-slate-900 dark:text-white">
                  {compositionStats?.prevLean ?? '—'}kg → {compositionStats?.currLean ?? '—'}kg
                </div>
                {compositionStats?.leanDelta !== null && compositionStats?.leanDelta !== undefined && (
                  <span
                    className={`inline-block text-xs font-bold mt-1 px-2 py-0.5 rounded-full ${
                      compositionStats.leanDelta > 0
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : compositionStats.leanDelta < 0
                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                    }`}
                  >
                    {compositionStats.leanDelta > 0
                      ? `+${compositionStats.leanDelta} kg`
                      : `${compositionStats.leanDelta} kg`}
                  </span>
                )}
              </div>

              {/* Delta 4: Cintura */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 text-center">
                <span className="text-xs text-slate-400 block mb-0.5">Cintura</span>
                <div className="text-sm font-bold text-slate-900 dark:text-white">
                  {comparisonManifest.previous_assessment.waist_cm ?? '—'}cm →{' '}
                  {comparisonManifest.current_assessment.waist_cm ?? '—'}cm
                </div>
                {comparisonManifest.deltas.waist_cm !== undefined && comparisonManifest.deltas.waist_cm !== null && (
                  <span
                    className={`inline-block text-xs font-bold mt-1 px-2 py-0.5 rounded-full ${
                      comparisonManifest.deltas.waist_cm < 0
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                    }`}
                  >
                    {comparisonManifest.deltas.waist_cm > 0
                      ? `+${comparisonManifest.deltas.waist_cm} cm`
                      : `${comparisonManifest.deltas.waist_cm} cm`}
                  </span>
                )}
              </div>

              {/* Delta 5: Abdômen */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 text-center">
                <span className="text-xs text-slate-400 block mb-0.5">Abdômen</span>
                <div className="text-sm font-bold text-slate-900 dark:text-white">
                  {comparisonManifest.previous_assessment.abdomen_cm ?? '—'}cm →{' '}
                  {comparisonManifest.current_assessment.abdomen_cm ?? '—'}cm
                </div>
                {comparisonManifest.deltas.abdomen_cm !== undefined && comparisonManifest.deltas.abdomen_cm !== null && (
                  <span
                    className={`inline-block text-xs font-bold mt-1 px-2 py-0.5 rounded-full ${
                      comparisonManifest.deltas.abdomen_cm < 0
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                    }`}
                  >
                    {comparisonManifest.deltas.abdomen_cm > 0
                      ? `+${comparisonManifest.deltas.abdomen_cm} cm`
                      : `${comparisonManifest.deltas.abdomen_cm} cm`}
                  </span>
                )}
              </div>

              {/* Delta 6: Quadril */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 text-center">
                <span className="text-xs text-slate-400 block mb-0.5">Quadril</span>
                <div className="text-sm font-bold text-slate-900 dark:text-white">
                  {comparisonManifest.previous_assessment.hip_cm ?? '—'}cm →{' '}
                  {comparisonManifest.current_assessment.hip_cm ?? '—'}cm
                </div>
                {comparisonManifest.deltas.hip_cm !== undefined && comparisonManifest.deltas.hip_cm !== null && (
                  <span className="inline-block text-xs font-bold mt-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    {comparisonManifest.deltas.hip_cm > 0
                      ? `+${comparisonManifest.deltas.hip_cm} cm`
                      : `${comparisonManifest.deltas.hip_cm} cm`}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Visual Mode Bar & Angle Filter */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 bg-slate-100/90 dark:bg-slate-900/90 p-1 rounded-xl border border-slate-200 dark:border-slate-800 self-start">
              <button
                type="button"
                onClick={() => setViewMode('side-by-side')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  viewMode === 'side-by-side'
                    ? 'bg-cyan-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Columns2 className="h-3.5 w-3.5" /> Lado a Lado
              </button>
              <button
                type="button"
                onClick={() => setViewMode('slider')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  viewMode === 'slider'
                    ? 'bg-cyan-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" /> Cortina Interativa (Slider)
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Pose:</span>
              <select
                value={selectedAngle}
                onChange={e => setSelectedAngle(e.target.value)}
                className="text-xs font-medium py-1.5 px-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 focus-visible:ring-2 focus-visible:ring-cyan-500"
              >
                <option value="all">Todas as poses pareadas ({comparisonManifest.matched_photos.length})</option>
                {Array.from(new Set(comparisonManifest.matched_photos.map(m => m.angle))).map(angle => (
                  <option key={angle} value={angle}>
                    {ANGLE_LABELS[angle] || angle}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Matched Photos Section */}
          {filteredPhotos.length === 0 ? (
            <div className="glass-panel p-8 text-center text-xs text-slate-500 rounded-2xl border border-slate-200 dark:border-slate-800">
              Nenhuma foto pareada encontrada para a pose selecionada entre essas duas datas.
            </div>
          ) : (
            <div className="space-y-6">
              {filteredPhotos.map((match, idx) => (
                <div
                  key={idx}
                  className="glass-panel p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700">
                      Pose: {ANGLE_LABELS[match.angle] || match.angle}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSideBySideLightboxIndex(idx)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-600 dark:text-cyan-400 hover:text-cyan-500 cursor-pointer"
                    >
                      <Maximize2 className="h-3.5 w-3.5" /> Tela Cheia
                    </button>
                  </div>

                  {/* SIDE BY SIDE MODE */}
                  {viewMode === 'side-by-side' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Left: Previous */}
                      <div className="flex flex-col rounded-xl overflow-hidden bg-slate-950 border border-slate-800">
                        <div className="p-2 bg-slate-900 flex items-center justify-between text-xs text-slate-300 font-medium">
                          <span>Anterior ({formatDateBr(comparisonManifest.previous_assessment.assessment_date)})</span>
                          {match.previous_photo?.body_state && (
                            <span className="text-[11px] font-bold text-slate-400">
                              {BODY_STATE_LABELS[match.previous_photo.body_state]}
                            </span>
                          )}
                        </div>
                        <div className="relative aspect-3/4 flex items-center justify-center p-2">
                          {match.previous_photo ? (
                            <img
                              src={match.previous_photo.content_url}
                              alt="Anterior"
                              className="w-full h-full object-contain cursor-pointer"
                              onClick={() => match.previous_photo && onOpenLightbox(match.previous_photo)}
                            />
                          ) : (
                            <span className="text-xs text-slate-600">Sem foto anterior</span>
                          )}
                        </div>
                      </div>

                      {/* Right: Current */}
                      <div className="flex flex-col rounded-xl overflow-hidden bg-slate-950 border border-slate-800">
                        <div className="p-2 bg-slate-900 flex items-center justify-between text-xs text-slate-300 font-medium">
                          <span>Atual ({formatDateBr(comparisonManifest.current_assessment.assessment_date)})</span>
                          {match.current_photo?.body_state && (
                            <span className="text-[11px] font-bold text-emerald-400">
                              {BODY_STATE_LABELS[match.current_photo.body_state]}
                            </span>
                          )}
                        </div>
                        <div className="relative aspect-3/4 flex items-center justify-center p-2">
                          {match.current_photo ? (
                            <img
                              src={match.current_photo.content_url}
                              alt="Atual"
                              className="w-full h-full object-contain cursor-pointer"
                              onClick={() => match.current_photo && onOpenLightbox(match.current_photo)}
                            />
                          ) : (
                            <span className="text-xs text-slate-600">Sem foto atual</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SLIDER MODE */}
                  {viewMode === 'slider' && match.previous_photo && match.current_photo && (
                    <div className="space-y-2">
                      {/* Division Presets */}
                      <div className="flex items-center justify-end gap-1.5 text-xs text-slate-400">
                        <span>Divisão:</span>
                        {[25, 50, 75].map(pct => (
                          <button
                            key={pct}
                            type="button"
                            onClick={() => setSliderPosition(pct)}
                            className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all cursor-pointer ${
                              sliderPosition === pct
                                ? 'bg-cyan-600 text-white shadow-xs'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                            }`}
                          >
                            {pct}%
                          </button>
                        ))}
                      </div>

                      <div
                        role="slider"
                        tabIndex={0}
                        aria-valuemin={5}
                        aria-valuemax={95}
                        aria-valuenow={sliderPosition}
                        aria-label={`Comparador deslizante para pose ${ANGLE_LABELS[match.angle] || match.angle}`}
                        onKeyDown={e => {
                          if (e.key === 'ArrowLeft') {
                            e.preventDefault();
                            setSliderPosition(p => Math.max(5, p - 5));
                          } else if (e.key === 'ArrowRight') {
                            e.preventDefault();
                            setSliderPosition(p => Math.min(95, p + 5));
                          }
                        }}
                        onPointerDown={e => {
                          setIsDraggingSlider(true);
                          updateSliderFromPointer(e.clientX, e.currentTarget.getBoundingClientRect());
                        }}
                        onPointerMove={e => {
                          if (isDraggingSlider || e.buttons === 1) {
                            updateSliderFromPointer(e.clientX, e.currentTarget.getBoundingClientRect());
                          }
                        }}
                        onPointerUp={() => setIsDraggingSlider(false)}
                        onPointerLeave={() => setIsDraggingSlider(false)}
                        onPointerCancel={() => setIsDraggingSlider(false)}
                        className="relative aspect-3/4 max-w-xl mx-auto rounded-xl overflow-hidden bg-slate-950 border border-slate-800 select-none cursor-ew-resize focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:outline-none"
                        style={{ touchAction: 'none' }}
                      >
                        {/* Current Image (Base Layer - Right / After) */}
                        <img
                          src={match.current_photo.content_url}
                          alt="Atual"
                          draggable={false}
                          className="absolute inset-0 w-full h-full object-contain pointer-events-none p-1"
                        />

                        {/* Previous Image (Clipped Top Layer - Left / Before) */}
                        <div
                          className="absolute inset-0 overflow-hidden pointer-events-none"
                          style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
                        >
                          <img
                            src={match.previous_photo.content_url}
                            alt="Anterior"
                            draggable={false}
                            className="absolute inset-0 w-full h-full object-contain pointer-events-none p-1"
                          />
                        </div>

                        {/* Divider Line */}
                        <div
                          className="absolute top-0 bottom-0 w-0.5 bg-white shadow-md pointer-events-none"
                          style={{ left: `${sliderPosition}%` }}
                        >
                          <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-8 w-8 rounded-full bg-cyan-600 border-2 border-white shadow-lg flex items-center justify-center text-white text-xs">
                            <ArrowLeftRight className="h-4 w-4" />
                          </div>
                        </div>

                        {/* Labels with Lightbox Zoom Actions */}
                        <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-black/75 backdrop-blur-xs text-white text-[11px] font-bold flex items-center gap-1.5 border border-white/10">
                          <span>Antes ({formatDateBr(comparisonManifest.previous_assessment.assessment_date)})</span>
                          <button
                            type="button"
                            aria-label="Ampliar foto anterior"
                            onClick={e => {
                              e.stopPropagation();
                              if (match.previous_photo) onOpenLightbox(match.previous_photo);
                            }}
                            className="text-slate-300 hover:text-white transition-colors cursor-pointer"
                          >
                            <Maximize2 className="h-3 w-3" />
                          </button>
                        </div>
                        <div className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-black/75 backdrop-blur-xs text-white text-[11px] font-bold flex items-center gap-1.5 border border-white/10">
                          <span>Depois ({formatDateBr(comparisonManifest.current_assessment.assessment_date)})</span>
                          <button
                            type="button"
                            aria-label="Ampliar foto atual"
                            onClick={e => {
                              e.stopPropagation();
                              if (match.current_photo) onOpenLightbox(match.current_photo);
                            }}
                            className="text-slate-300 hover:text-white transition-colors cursor-pointer"
                          >
                            <Maximize2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Fullscreen Side-by-Side Lightbox */}
          {sideBySideLightboxIndex !== null && (
            <SideBySideLightbox
              isOpen={true}
              onClose={() => setSideBySideLightboxIndex(null)}
              pairs={filteredPhotos}
              currentIndex={sideBySideLightboxIndex}
              onNavigate={setSideBySideLightboxIndex}
              previousAssessment={comparisonManifest.previous_assessment}
              currentAssessment={comparisonManifest.current_assessment}
            />
          )}
        </div>
      )}
    </div>
  );
};
