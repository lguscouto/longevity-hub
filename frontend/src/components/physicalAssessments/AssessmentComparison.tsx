import React, { useState, useMemo } from 'react';
import {
  ArrowLeftRight,
  AlertCircle,
  RefreshCw,
  Camera,
  Columns2,
  SlidersHorizontal,
  Maximize2,
  ArrowRight,
  Sparkles,
  Scale,
  Percent,
  Ruler,
  Activity,
} from 'lucide-react';
import { EmptyState, Select, FormField, Button, IconButton } from '../ui';
import {
  PhysicalAssessment,
  ComparisonManifest,
  Photo,
  ANGLE_LABELS,
  BODY_STATE_LABELS,
} from './types';

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

type ComparisonViewMode = 'side-by-side' | 'slider';

function formatDateBr(dateStr?: string): string {
  if (!dateStr) return '—';
  return new Date(dateStr.slice(0, 10) + 'T00:00:00').toLocaleDateString('pt-BR');
}

function calcLeanAndFatMass(weight?: number | null, bfPct?: number | null) {
  if (
    typeof weight === 'number' &&
    typeof bfPct === 'number' &&
    weight > 0 &&
    bfPct >= 0 &&
    bfPct <= 100
  ) {
    const fatMass = Number((weight * (bfPct / 100)).toFixed(2));
    const leanMass = Number((weight - fatMass).toFixed(2));
    return { fatMass, leanMass };
  }
  return { fatMass: null, leanMass: null };
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
  const [selectedAngle, setSelectedAngle] = useState<string>('all');
  const [viewMode, setViewMode] = useState<ComparisonViewMode>('side-by-side');
  const [sliderPosition, setSliderPosition] = useState<number>(50);
  const [isDraggingSlider, setIsDraggingSlider] = useState<boolean>(false);

  const selectedPrevAssessment = useMemo(
    () => assessments.find(a => a.id === comparePrevId),
    [assessments, comparePrevId]
  );
  const selectedCurrAssessment = useMemo(
    () => assessments.find(a => a.id === compareCurrId),
    [assessments, compareCurrId]
  );

  // Contagem de pares por ângulo para barra de filtro
  const angleCounts = useMemo(() => {
    const counts: Record<string, number> = { all: 0 };
    if (!comparisonManifest) return counts;
    for (const item of comparisonManifest.matched_photos) {
      counts.all += 1;
      counts[item.angle] = (counts[item.angle] || 0) + 1;
    }
    return counts;
  }, [comparisonManifest]);

  const filteredPhotos = useMemo(() => {
    if (!comparisonManifest) return [];
    if (selectedAngle === 'all') return comparisonManifest.matched_photos;
    return comparisonManifest.matched_photos.filter(m => m.angle === selectedAngle);
  }, [comparisonManifest, selectedAngle]);

  // Cálculos derivados de massa magra e massa gorda para enriquecer o resumo
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
    if (!comparePrevId && !compareCurrId) return;
    const prev = comparePrevId;
    setComparePrevId(compareCurrId);
    setCompareCurrId(prev);
  };

  const handleSelectInitialVsLatest = () => {
    if (assessments.length < 2) return;
    setComparePrevId(assessments[assessments.length - 1].id);
    setCompareCurrId(assessments[0].id);
  };

  const handleSelectPreviousVsLatest = () => {
    if (assessments.length < 2) return;
    setComparePrevId(assessments[1].id);
    setCompareCurrId(assessments[0].id);
  };

  const updateSliderFromPointer = (clientX: number, rect: DOMRect) => {
    if (rect.width <= 0) return;
    const rawPct = ((clientX - rect.left) / rect.width) * 100;
    const clamped = Math.max(5, Math.min(95, Math.round(rawPct)));
    setSliderPosition(clamped);
  };

  return (
    <div className="space-y-6">
      {/* 1. Painel de Seleção de Períodos */}
      <div className="glass-panel p-6 rounded-surface-md border border-slate-200 dark:border-slate-800 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ArrowLeftRight className="h-5 w-5 text-violet-500" /> Seleção de Períodos para Comparação
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Compare a evolução corporal, medidas e fotos inteiras lado a lado ou com sobreposição interativa.
            </p>
          </div>

          {assessments.length >= 2 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-400 font-medium mr-1">Atalhos:</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                leftIcon={Sparkles}
                onClick={handleSelectInitialVsLatest}
              >
                Início vs. Atual
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSelectPreviousVsLatest}
              >
                Penúltima vs. Atual
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                leftIcon={ArrowLeftRight}
                onClick={handleSwapPeriods}
                disabled={!comparePrevId || !compareCurrId}
                title="Inverter avaliação anterior e atual"
              >
                Inverter
              </Button>
            </div>
          )}
        </div>

        {compareError && (
          <div
            role="alert"
            className="p-3 rounded-surface-sm border border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2"
          >
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{compareError}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-surface-sm bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2.5">
            <FormField id="compare-prev-id" label="Avaliação Anterior (Baseline)">
              <Select
                id="compare-prev-id"
                value={comparePrevId}
                onChange={e => setComparePrevId(e.target.value)}
              >
                <option value="">Selecione a avaliação anterior...</option>
                {assessments.map(a => (
                  <option key={a.id} value={a.id}>
                    {formatDateBr(a.assessment_date)} — {a.title || 'Sem título'} ({a.weight_kg ? `${a.weight_kg}kg` : 'sem peso'})
                  </option>
                ))}
              </Select>
            </FormField>

            {selectedPrevAssessment && (
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-400 pt-1">
                <span className="px-2 py-0.5 rounded-surface-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-medium">
                  Data: <strong className="text-slate-800 dark:text-slate-200">{formatDateBr(selectedPrevAssessment.assessment_date)}</strong>
                </span>
                {selectedPrevAssessment.weight_kg && (
                  <span className="px-2 py-0.5 rounded-surface-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    Peso: <strong className="text-slate-800 dark:text-slate-200">{selectedPrevAssessment.weight_kg} kg</strong>
                  </span>
                )}
                {selectedPrevAssessment.body_fat_percentage && (
                  <span className="px-2 py-0.5 rounded-surface-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    BF: <strong className="text-slate-800 dark:text-slate-200">{selectedPrevAssessment.body_fat_percentage}%</strong>
                  </span>
                )}
                <span className="px-2 py-0.5 rounded-surface-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  {selectedPrevAssessment.photos.length} {selectedPrevAssessment.photos.length === 1 ? 'foto' : 'fotos'}
                </span>
              </div>
            )}
          </div>

          <div className="p-4 rounded-surface-sm bg-violet-500/5 dark:bg-violet-500/5 border border-violet-500/20 space-y-2.5">
            <FormField id="compare-curr-id" label="Avaliação Atual (Evolução)">
              <Select
                id="compare-curr-id"
                value={compareCurrId}
                onChange={e => setCompareCurrId(e.target.value)}
              >
                <option value="">Selecione a avaliação recente...</option>
                {assessments.map(a => (
                  <option key={a.id} value={a.id}>
                    {formatDateBr(a.assessment_date)} — {a.title || 'Sem título'} ({a.weight_kg ? `${a.weight_kg}kg` : 'sem peso'})
                  </option>
                ))}
              </Select>
            </FormField>

            {selectedCurrAssessment && (
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-400 pt-1">
                <span className="px-2 py-0.5 rounded-surface-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-medium">
                  Data: <strong className="text-violet-600 dark:text-violet-400">{formatDateBr(selectedCurrAssessment.assessment_date)}</strong>
                </span>
                {selectedCurrAssessment.weight_kg && (
                  <span className="px-2 py-0.5 rounded-surface-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    Peso: <strong className="text-slate-800 dark:text-slate-200">{selectedCurrAssessment.weight_kg} kg</strong>
                  </span>
                )}
                {selectedCurrAssessment.body_fat_percentage && (
                  <span className="px-2 py-0.5 rounded-surface-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    BF: <strong className="text-slate-800 dark:text-slate-200">{selectedCurrAssessment.body_fat_percentage}%</strong>
                  </span>
                )}
                <span className="px-2 py-0.5 rounded-surface-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  {selectedCurrAssessment.photos.length} {selectedCurrAssessment.photos.length === 1 ? 'foto' : 'fotos'}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            variant="primary"
            leftIcon={compareLoading ? RefreshCw : ArrowLeftRight}
            loading={compareLoading}
            loadingText="Gerando Comparativo..."
            onClick={onRunComparison}
            disabled={!comparePrevId || !compareCurrId}
            className="bg-violet-600 hover:bg-violet-500 border-violet-600/30"
          >
            Gerar Comparativo Lado a Lado
          </Button>
        </div>
      </div>

      {/* 2. Resultados da Comparação */}
      {comparisonManifest && (
        <div className="space-y-6">
          {/* Painel de Evolução Antropométrica ("De -> Para" + Deltas) */}
          <div className="glass-panel p-6 rounded-surface-md border border-slate-200 dark:border-slate-800 space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <span className="text-xs font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-wider">
                  Intervalo Decorrido
                </span>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
                  {comparisonManifest.days_between} dias entre as avaliações
                </h3>
              </div>

              <div className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300">
                <div className="bg-white dark:bg-slate-900 px-3.5 py-2 rounded-surface-sm border border-slate-200 dark:border-slate-800 text-center shadow-subtle">
                  <span className="text-xs text-slate-400 block">Baseline</span>
                  <strong>{formatDateBr(comparisonManifest.previous_assessment.assessment_date)}</strong>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 shrink-0" />
                <div className="bg-violet-500/10 px-3.5 py-2 rounded-surface-sm border border-violet-500/30 text-center shadow-subtle">
                  <span className="text-xs text-violet-600 dark:text-violet-300 block">Evolução</span>
                  <strong className="text-violet-950 dark:text-violet-100">
                    {formatDateBr(comparisonManifest.current_assessment.assessment_date)}
                  </strong>
                </div>
              </div>
            </div>

            {/* Grid de Cards Analíticos */}
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
              {/* Card 1: Peso */}
              <div className="bg-white/70 dark:bg-slate-900/70 p-4 rounded-surface-sm border border-slate-200 dark:border-slate-800 shadow-subtle flex flex-col justify-between gap-1.5">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span>Variação de Peso</span>
                  <Scale className="h-3.5 w-3.5 text-slate-400" />
                </div>
                {comparisonManifest.deltas.weight_kg !== null &&
                comparisonManifest.deltas.weight_kg !== undefined ? (
                  <strong
                    className={`text-lg font-bold ${
                      comparisonManifest.deltas.weight_kg <= 0 ? 'text-emerald-500' : 'text-rose-500'
                    }`}
                  >
                    {comparisonManifest.deltas.weight_kg > 0
                      ? `+${comparisonManifest.deltas.weight_kg}`
                      : comparisonManifest.deltas.weight_kg}{' '}
                    kg
                  </strong>
                ) : (
                  <span className="text-slate-500 text-sm">—</span>
                )}
                {comparisonManifest.previous_assessment.weight_kg != null &&
                  comparisonManifest.current_assessment.weight_kg != null && (
                    <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      {comparisonManifest.previous_assessment.weight_kg} kg
                      <ArrowRight className="h-3 w-3 text-slate-400 shrink-0" />
                      <span className="font-semibold text-slate-700 dark:text-slate-200">
                        {comparisonManifest.current_assessment.weight_kg} kg
                      </span>
                    </span>
                  )}
              </div>

              {/* Card 2: % Gordura */}
              <div className="bg-white/70 dark:bg-slate-900/70 p-4 rounded-surface-sm border border-slate-200 dark:border-slate-800 shadow-subtle flex flex-col justify-between gap-1.5">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span>Variação % Gordura</span>
                  <Percent className="h-3.5 w-3.5 text-slate-400" />
                </div>
                {comparisonManifest.deltas.body_fat_percentage !== null &&
                comparisonManifest.deltas.body_fat_percentage !== undefined ? (
                  <strong
                    className={`text-lg font-bold ${
                      comparisonManifest.deltas.body_fat_percentage <= 0
                        ? 'text-emerald-500'
                        : 'text-rose-500'
                    }`}
                  >
                    {comparisonManifest.deltas.body_fat_percentage > 0
                      ? `+${comparisonManifest.deltas.body_fat_percentage}`
                      : comparisonManifest.deltas.body_fat_percentage}
                    %
                  </strong>
                ) : (
                  <span className="text-slate-500 text-sm">—</span>
                )}
                {comparisonManifest.previous_assessment.body_fat_percentage != null &&
                  comparisonManifest.current_assessment.body_fat_percentage != null && (
                    <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      {comparisonManifest.previous_assessment.body_fat_percentage}%
                      <ArrowRight className="h-3 w-3 text-slate-400 shrink-0" />
                      <span className="font-semibold text-slate-700 dark:text-slate-200">
                        {comparisonManifest.current_assessment.body_fat_percentage}%
                      </span>
                    </span>
                  )}
              </div>

              {/* Card 3: Massa Gorda Estimada */}
              <div className="bg-white/70 dark:bg-slate-900/70 p-4 rounded-surface-sm border border-slate-200 dark:border-slate-800 shadow-subtle flex flex-col justify-between gap-1.5">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span>Massa Gorda Est.</span>
                  <Activity className="h-3.5 w-3.5 text-slate-400" />
                </div>
                {compositionStats?.fatMassDelta !== null &&
                compositionStats?.fatMassDelta !== undefined ? (
                  <strong
                    className={`text-lg font-bold ${
                      compositionStats.fatMassDelta <= 0 ? 'text-emerald-500' : 'text-rose-500'
                    }`}
                  >
                    {compositionStats.fatMassDelta > 0
                      ? `+${compositionStats.fatMassDelta}`
                      : compositionStats.fatMassDelta}{' '}
                    kg
                  </strong>
                ) : (
                  <span className="text-slate-500 text-sm">—</span>
                )}
                {compositionStats?.prevFatMass != null && compositionStats?.currFatMass != null && (
                  <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    {compositionStats.prevFatMass} kg
                    <ArrowRight className="h-3 w-3 text-slate-400 shrink-0" />
                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                      {compositionStats.currFatMass} kg
                    </span>
                  </span>
                )}
              </div>

              {/* Card 4: Massa Magra Estimada */}
              <div className="bg-white/70 dark:bg-slate-900/70 p-4 rounded-surface-sm border border-slate-200 dark:border-slate-800 shadow-subtle flex flex-col justify-between gap-1.5">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span>Massa Magra Est.</span>
                  <Activity className="h-3.5 w-3.5 text-cyan-500" />
                </div>
                {compositionStats?.leanDelta !== null &&
                compositionStats?.leanDelta !== undefined ? (
                  <strong
                    className={`text-lg font-bold ${
                      compositionStats.leanDelta >= 0 ? 'text-emerald-500' : 'text-amber-500'
                    }`}
                  >
                    {compositionStats.leanDelta > 0
                      ? `+${compositionStats.leanDelta}`
                      : compositionStats.leanDelta}{' '}
                    kg
                  </strong>
                ) : (
                  <span className="text-slate-500 text-sm">—</span>
                )}
                {compositionStats?.prevLean != null && compositionStats?.currLean != null && (
                  <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    {compositionStats.prevLean} kg
                    <ArrowRight className="h-3 w-3 text-slate-400 shrink-0" />
                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                      {compositionStats.currLean} kg
                    </span>
                  </span>
                )}
              </div>

              {/* Card 5: Cintura */}
              <div className="bg-white/70 dark:bg-slate-900/70 p-4 rounded-surface-sm border border-slate-200 dark:border-slate-800 shadow-subtle flex flex-col justify-between gap-1.5">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span>Variação Cintura</span>
                  <Ruler className="h-3.5 w-3.5 text-slate-400" />
                </div>
                {comparisonManifest.deltas.waist_cm !== null &&
                comparisonManifest.deltas.waist_cm !== undefined ? (
                  <strong className="text-lg font-bold text-slate-800 dark:text-slate-200">
                    {comparisonManifest.deltas.waist_cm > 0
                      ? `+${comparisonManifest.deltas.waist_cm}`
                      : comparisonManifest.deltas.waist_cm}{' '}
                    cm
                  </strong>
                ) : (
                  <span className="text-slate-500 text-sm">—</span>
                )}
                {comparisonManifest.previous_assessment.waist_cm != null &&
                  comparisonManifest.current_assessment.waist_cm != null && (
                    <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      {comparisonManifest.previous_assessment.waist_cm} cm
                      <ArrowRight className="h-3 w-3 text-slate-400 shrink-0" />
                      <span className="font-semibold text-slate-700 dark:text-slate-200">
                        {comparisonManifest.current_assessment.waist_cm} cm
                      </span>
                    </span>
                  )}
              </div>

              {/* Card 6: Abdômen */}
              <div className="bg-white/70 dark:bg-slate-900/70 p-4 rounded-surface-sm border border-slate-200 dark:border-slate-800 shadow-subtle flex flex-col justify-between gap-1.5">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span>Variação Abdômen</span>
                  <Ruler className="h-3.5 w-3.5 text-slate-400" />
                </div>
                {comparisonManifest.deltas.abdomen_cm !== null &&
                comparisonManifest.deltas.abdomen_cm !== undefined ? (
                  <strong className="text-lg font-bold text-slate-800 dark:text-slate-200">
                    {comparisonManifest.deltas.abdomen_cm > 0
                      ? `+${comparisonManifest.deltas.abdomen_cm}`
                      : comparisonManifest.deltas.abdomen_cm}{' '}
                    cm
                  </strong>
                ) : (
                  <span className="text-slate-500 text-sm">—</span>
                )}
                {comparisonManifest.previous_assessment.abdomen_cm != null &&
                  comparisonManifest.current_assessment.abdomen_cm != null && (
                    <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      {comparisonManifest.previous_assessment.abdomen_cm} cm
                      <ArrowRight className="h-3 w-3 text-slate-400 shrink-0" />
                      <span className="font-semibold text-slate-700 dark:text-slate-200">
                        {comparisonManifest.current_assessment.abdomen_cm} cm
                      </span>
                    </span>
                  )}
              </div>
            </div>
          </div>

          {/* 3. Galeria Comparativa de Fotos (Sem Cortes + Filtros + Modo Slider) */}
          <div className="space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <h4 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Camera className="h-5 w-5 text-cyan-500" /> Comparativo Fotográfico Lado a Lado Por Ângulo
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Fotografias exibidas em proporção integral sem cortes. Clique em qualquer imagem para abrir em tela cheia.
                </p>
              </div>

              {comparisonManifest.matched_photos.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  {/* Alternador Lado a Lado vs Slider */}
                  <div className="inline-flex items-center gap-1 p-1 rounded-surface-sm bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <Button
                      type="button"
                      size="sm"
                      variant={viewMode === 'side-by-side' ? 'primary' : 'ghost'}
                      leftIcon={Columns2}
                      onClick={() => setViewMode('side-by-side')}
                      className={
                        viewMode === 'side-by-side'
                          ? 'bg-cyan-600 hover:bg-cyan-500 border-cyan-600/30'
                          : ''
                      }
                    >
                      Lado a Lado
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={viewMode === 'slider' ? 'primary' : 'ghost'}
                      leftIcon={SlidersHorizontal}
                      onClick={() => setViewMode('slider')}
                      className={
                        viewMode === 'slider'
                          ? 'bg-violet-600 hover:bg-violet-500 border-violet-600/30'
                          : ''
                      }
                    >
                      Slider Antes/Depois
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Barra de Filtros por Ângulo */}
            {comparisonManifest.matched_photos.length > 0 && (
              <div
                role="group"
                aria-label="Filtrar por ângulo fotográfico"
                className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1"
              >
                <Button
                  type="button"
                  size="sm"
                  variant={selectedAngle === 'all' ? 'primary' : 'secondary'}
                  onClick={() => setSelectedAngle('all')}
                >
                  Todos ({angleCounts.all})
                </Button>
                {(['front', 'back', 'left_side', 'right_side', 'other'] as const).map(angleKey => {
                  const count = angleCounts[angleKey] || 0;
                  if (count === 0) return null;
                  return (
                    <Button
                      key={angleKey}
                      type="button"
                      size="sm"
                      variant={selectedAngle === angleKey ? 'primary' : 'secondary'}
                      onClick={() => setSelectedAngle(angleKey)}
                    >
                      {ANGLE_LABELS[angleKey] || angleKey} ({count})
                    </Button>
                  );
                })}
              </div>
            )}

            {comparisonManifest.matched_photos.length === 0 ? (
              <EmptyState
                icon={Camera}
                title="Nenhuma foto correspondente"
                description="Nenhuma foto equivalente foi encontrada para parear lado a lado nesta comparação."
              />
            ) : (
              <div className="space-y-6">
                {filteredPhotos.map((match, idx) => {
                  const resolvedBodyState =
                    match.body_state ||
                    match.current_photo?.body_state ||
                    match.previous_photo?.body_state ||
                    'unspecified';
                  const hasDistinctBodyState =
                    resolvedBodyState && resolvedBodyState !== 'unspecified';
                  const poseDescription =
                    match.current_photo?.description || match.previous_photo?.description || null;
                  const canUseSlider =
                    viewMode === 'slider' &&
                    Boolean(match.previous_photo) &&
                    Boolean(match.current_photo);

                  const prevDateStr = formatDateBr(
                    comparisonManifest.previous_assessment.assessment_date
                  );
                  const currDateStr = formatDateBr(
                    comparisonManifest.current_assessment.assessment_date
                  );

                  return (
                    <div
                      key={`${match.angle}-${resolvedBodyState}-${idx}`}
                      className="glass-panel p-5 sm:p-6 rounded-surface-md border border-slate-200 dark:border-slate-800 space-y-4"
                    >
                      {/* Cabeçalho do Par Fotográfico */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3.5">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <span className="text-sm font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider">
                            Ângulo: {ANGLE_LABELS[match.angle] || match.angle}
                          </span>

                          {hasDistinctBodyState && (
                            <span
                              className={`px-2.5 py-0.5 rounded-pill text-xs font-semibold border ${
                                resolvedBodyState === 'flexed'
                                  ? 'bg-violet-500/10 text-violet-600 dark:text-violet-300 border-violet-500/30'
                                  : 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-300 border-cyan-500/30'
                              }`}
                            >
                              {BODY_STATE_LABELS[resolvedBodyState] || resolvedBodyState}
                            </span>
                          )}

                          {poseDescription && (
                            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                              • {poseDescription}
                            </span>
                          )}
                        </div>

                        {canUseSlider && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-slate-400 mr-1">Divisão:</span>
                            {[25, 50, 75].map(pct => (
                              <Button
                                key={pct}
                                type="button"
                                size="sm"
                                variant={sliderPosition === pct ? 'secondary' : 'ghost'}
                                onClick={() => setSliderPosition(pct)}
                              >
                                {pct}%
                              </Button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* MODO SLIDER INTERATIVO (ANTES / DEPOIS SOBREPOSTOS) */}
                      {canUseSlider && match.previous_photo && match.current_photo ? (
                        <div className="space-y-3">
                          <div
                            role="slider"
                            tabIndex={0}
                            aria-label={`Comparador deslizante para ${ANGLE_LABELS[match.angle] || match.angle}`}
                            aria-valuemin={5}
                            aria-valuemax={95}
                            aria-valuenow={sliderPosition}
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
                              updateSliderFromPointer(
                                e.clientX,
                                e.currentTarget.getBoundingClientRect()
                              );
                            }}
                            onPointerMove={e => {
                              if (!isDraggingSlider && e.buttons !== 1) return;
                              updateSliderFromPointer(
                                e.clientX,
                                e.currentTarget.getBoundingClientRect()
                              );
                            }}
                            onPointerUp={() => setIsDraggingSlider(false)}
                            onPointerLeave={() => setIsDraggingSlider(false)}
                            className="relative w-full h-[520px] sm:h-[620px] bg-slate-950 rounded-surface-sm border border-slate-200 dark:border-slate-800 overflow-hidden select-none cursor-ew-resize"
                          >
                            {/* Camada Base: Foto Atual (Direita) */}
                            <img
                              src={match.current_photo.content_url}
                              alt="Atual"
                              draggable={false}
                              className="absolute inset-0 w-full h-full object-contain p-2 pointer-events-none"
                            />

                            {/* Camada Superior Recortada: Foto Anterior (Esquerda) */}
                            <div
                              className="absolute inset-0 overflow-hidden pointer-events-none"
                              style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
                            >
                              <img
                                src={match.previous_photo.content_url}
                                alt="Anterior"
                                draggable={false}
                                className="w-full h-full object-contain p-2"
                              />
                            </div>

                            {/* Linha Divisória Vertical */}
                            <div
                              className="absolute inset-y-0 w-0.5 bg-white shadow-elevation-2 pointer-events-none"
                              style={{ left: `${sliderPosition}%` }}
                            >
                              <div className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 h-9 w-9 rounded-pill bg-violet-600 text-white border-2 border-white shadow-elevation-3 flex items-center justify-center">
                                <ArrowLeftRight className="h-4 w-4" />
                              </div>
                            </div>

                            {/* Rótulos Flutuantes */}
                            <div className="absolute top-3 left-3 px-3 py-1.5 rounded-surface-xs bg-slate-900/90 text-white border border-slate-700 text-xs font-semibold flex items-center gap-2">
                              <span>Anterior ({prevDateStr})</span>
                              <IconButton
                                icon={Maximize2}
                                size="sm"
                                variant="ghost"
                                aria-label="Ampliar foto anterior"
                                onClick={e => {
                                  e.stopPropagation();
                                  onOpenLightbox(match.previous_photo!);
                                }}
                                className="text-slate-200 hover:text-white"
                              />
                            </div>

                            <div className="absolute top-3 right-3 px-3 py-1.5 rounded-surface-xs bg-violet-950/90 text-violet-100 border border-violet-500/40 text-xs font-semibold flex items-center gap-2">
                              <span>Atual ({currDateStr})</span>
                              <IconButton
                                icon={Maximize2}
                                size="sm"
                                variant="ghost"
                                aria-label="Ampliar foto atual"
                                onClick={e => {
                                  e.stopPropagation();
                                  onOpenLightbox(match.current_photo!);
                                }}
                                className="text-violet-200 hover:text-white"
                              />
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* MODO LADO A LADO INTEGRAL (SEM CORTES) */
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Coluna 1: Foto Anterior */}
                          <div className="bg-slate-50/90 dark:bg-slate-900/50 p-3.5 sm:p-4 rounded-surface-sm border border-slate-200 dark:border-slate-800 flex flex-col gap-3">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex flex-col">
                                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                                  Anterior ({prevDateStr})
                                </span>
                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                  {comparisonManifest.previous_assessment.weight_kg
                                    ? `${comparisonManifest.previous_assessment.weight_kg} kg`
                                    : 'Sem peso'}
                                  {comparisonManifest.previous_assessment.body_fat_percentage
                                    ? ` • ${comparisonManifest.previous_assessment.body_fat_percentage}% BF`
                                    : ''}
                                </span>
                              </div>

                              {match.previous_photo && (
                                <IconButton
                                  icon={Maximize2}
                                  size="sm"
                                  variant="secondary"
                                  aria-label="Ampliar foto anterior"
                                  onClick={() => onOpenLightbox(match.previous_photo!)}
                                />
                              )}
                            </div>

                            {match.previous_photo ? (
                              <div className="relative w-full min-h-[420px] sm:min-h-[520px] max-h-[680px] bg-slate-900/95 dark:bg-slate-950 rounded-surface-sm border border-slate-200 dark:border-slate-800 flex items-center justify-center overflow-hidden p-2 group">
                                <img
                                  src={match.previous_photo.content_url}
                                  alt="Anterior"
                                  loading="lazy"
                                  onClick={() => onOpenLightbox(match.previous_photo!)}
                                  className="w-full h-full max-h-[640px] object-contain rounded-surface-xs cursor-pointer transition-transform duration-200 group-hover:scale-102"
                                />
                              </div>
                            ) : (
                              <div className="w-full min-h-[420px] sm:min-h-[520px] flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 bg-slate-200/50 dark:bg-slate-900/40 rounded-surface-sm border border-dashed border-slate-300 dark:border-slate-800 text-xs">
                                <Camera className="h-8 w-8 mb-2 text-slate-400" />
                                Foto não disponível nesta avaliação
                              </div>
                            )}
                          </div>

                          {/* Coluna 2: Foto Atual */}
                          <div className="bg-violet-500/5 dark:bg-slate-900/70 p-3.5 sm:p-4 rounded-surface-sm border border-violet-500/20 dark:border-slate-800 flex flex-col gap-3">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex flex-col">
                                <span className="text-xs font-semibold text-violet-700 dark:text-violet-300">
                                  Atual ({currDateStr})
                                </span>
                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                  {comparisonManifest.current_assessment.weight_kg
                                    ? `${comparisonManifest.current_assessment.weight_kg} kg`
                                    : 'Sem peso'}
                                  {comparisonManifest.current_assessment.body_fat_percentage
                                    ? ` • ${comparisonManifest.current_assessment.body_fat_percentage}% BF`
                                    : ''}
                                </span>
                              </div>

                              {match.current_photo && (
                                <IconButton
                                  icon={Maximize2}
                                  size="sm"
                                  variant="secondary"
                                  aria-label="Ampliar foto atual"
                                  onClick={() => onOpenLightbox(match.current_photo!)}
                                />
                              )}
                            </div>

                            {match.current_photo ? (
                              <div className="relative w-full min-h-[420px] sm:min-h-[520px] max-h-[680px] bg-slate-900/95 dark:bg-slate-950 rounded-surface-sm border border-slate-200 dark:border-slate-800 flex items-center justify-center overflow-hidden p-2 group">
                                <img
                                  src={match.current_photo.content_url}
                                  alt="Atual"
                                  loading="lazy"
                                  onClick={() => onOpenLightbox(match.current_photo!)}
                                  className="w-full h-full max-h-[640px] object-contain rounded-surface-xs cursor-pointer transition-transform duration-200 group-hover:scale-102"
                                />
                              </div>
                            ) : (
                              <div className="w-full min-h-[420px] sm:min-h-[520px] flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 bg-slate-200/50 dark:bg-slate-900/40 rounded-surface-sm border border-dashed border-slate-300 dark:border-slate-800 text-xs">
                                <Camera className="h-8 w-8 mb-2 text-slate-400" />
                                Foto não disponível nesta avaliação
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
