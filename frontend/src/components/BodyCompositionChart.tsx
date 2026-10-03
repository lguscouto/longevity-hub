import React, { useState, useEffect, useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import {
  Activity,
  TrendingDown,
  TrendingUp,
  Scale,
  Camera,
  Layers,
  Ruler,
  Calendar,
  Sparkles,
  Target,
  RefreshCw,
} from 'lucide-react';
import { TimeRangeControl, TimeRangeOption, LoadingIndicator, ErrorState } from './ui';
import { formatMetricValueString } from '../lib/formatters';

export interface TimelinePoint {
  date: string;
  weight_kg: number | null;
  body_fat_pct: number | null;
  lean_mass_kg: number | null;
  fat_mass_kg: number | null;
  source: string;
  is_physical_assessment: boolean;
  assessment_id: string | null;
  assessment_title: string | null;
  photo_count: number;
  waist_cm: number | null;
  abdomen_cm: number | null;
  hip_cm: number | null;
}

export interface TimelineSummary {
  latest_weight_kg: number | null;
  weight_delta: number | null;
  latest_body_fat_pct: number | null;
  body_fat_delta: number | null;
  latest_lean_mass_kg: number | null;
  lean_mass_delta: number | null;
  total_points: number;
  assessment_count: number;
}

export interface TimelineData {
  target_weight_kg: number | null;
  points: TimelinePoint[];
  summary: TimelineSummary;
}

export interface BodyCompositionChartProps {
  onSelectAssessment?: (assessmentId: string) => void;
  refreshKey?: number;
}

type TimeRange = '1M' | '3M' | '6M' | '1A' | 'ALL';
type ViewMode = 'weight_fat' | 'body_comp' | 'measurements';

const BODY_COMPOSITION_TIME_RANGES: TimeRangeOption<TimeRange>[] = [
  { value: '1M', label: '30 dias', shortLabel: '1M', ariaLabel: 'Últimos 30 dias (1M)' },
  { value: '3M', label: '90 dias', shortLabel: '3M', ariaLabel: 'Últimos 90 dias (3M)' },
  { value: '6M', label: '6 meses', shortLabel: '6M', ariaLabel: 'Últimos 6 meses (6M)' },
  { value: '1A', label: '1 ano', shortLabel: '1A', ariaLabel: 'Último 1 ano (1A)' },
  { value: 'ALL', label: 'Tudo', shortLabel: 'Tudo', ariaLabel: 'Todo o histórico' },
];

export const BodyCompositionChart: React.FC<BodyCompositionChartProps> = ({
  onSelectAssessment,
  refreshKey = 0,
}) => {
  const [data, setData] = useState<TimelineData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>('6M');
  const [viewMode, setViewMode] = useState<ViewMode>('weight_fat');

  const fetchTimeline = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/physical-assessments/timeline');
      if (!res.ok) throw new Error('Falha ao carregar linha do tempo de composição corporal');
      const json: TimelineData = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimeline();
  }, [refreshKey]);

  // Filter points based on selected time range
  const filteredPoints = useMemo(() => {
    if (!data?.points) return [];
    if (timeRange === 'ALL') return data.points;

    const daysMap: Record<Exclude<TimeRange, 'ALL'>, number> = {
      '1M': 30,
      '3M': 90,
      '6M': 180,
      '1A': 365,
    };
    const days = daysMap[timeRange];
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString().split('T')[0];

    const subset = data.points.filter((p) => p.date >= cutoffStr);
    return subset.length > 0 ? subset : data.points;
  }, [data, timeRange]);

  // Re-calculate summary for the selected period if filtered
  const activeSummary = useMemo(() => {
    if (!data?.summary) return null;
    if (timeRange === 'ALL' || filteredPoints.length === data.points.length) {
      return data.summary;
    }

    const weights = filteredPoints.map((p) => p.weight_kg).filter((w): w is number => w !== null);
    const fats = filteredPoints.map((p) => p.body_fat_pct).filter((f): f is number => f !== null);
    const leans = filteredPoints.map((p) => p.lean_mass_kg).filter((l): l is number => l !== null);

    return {
      latest_weight_kg: weights.length ? weights[weights.length - 1] : null,
      weight_delta: weights.length >= 2 ? Number((weights[weights.length - 1] - weights[0]).toFixed(2)) : null,
      latest_body_fat_pct: fats.length ? fats[fats.length - 1] : null,
      body_fat_delta: fats.length >= 2 ? Number((fats[fats.length - 1] - fats[0]).toFixed(2)) : null,
      latest_lean_mass_kg: leans.length ? leans[leans.length - 1] : null,
      lean_mass_delta: leans.length >= 2 ? Number((leans[leans.length - 1] - leans[0]).toFixed(2)) : null,
      total_points: filteredPoints.length,
      assessment_count: filteredPoints.filter((p) => p.is_physical_assessment).length,
    };
  }, [data, filteredPoints, timeRange]);

  const formatDateLabel = (isoDate: string) => {
    if (!isoDate) return '';
    const parts = isoDate.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}`;
    }
    return isoDate;
  };

  const formatDateFull = (isoDate: string) => {
    if (!isoDate) return '';
    const parts = isoDate.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return isoDate;
  };

  // Custom Dot for Weight Line
  const renderWeightDot = (props: any): React.ReactElement<SVGElement> => {
    const { cx, cy, payload } = props;
    if (cx == null || cy == null || isNaN(cx) || isNaN(cy)) return <g key="empty-w-invalid" />;

    if (payload.is_physical_assessment) {
      return (
        <g
          key={`dot-w-${payload.date}`}
          className="cursor-pointer transition-opacity hover:opacity-80"
          onClick={(e) => {
            e.stopPropagation();
            if (payload.assessment_id && onSelectAssessment) {
              onSelectAssessment(payload.assessment_id);
            }
          }}
        >
          <circle cx={cx} cy={cy} r={7} fill="#0B0F17" stroke="#06B6D4" strokeWidth={2.5} />
          <circle cx={cx} cy={cy} r={3.5} fill="#10B981" />
        </g>
      );
    }

    return <circle key={`dot-w-${payload.date}`} cx={cx} cy={cy} r={3} fill="#10B981" fillOpacity={0.7} />;
  };

  // Custom Dot for Fat Line
  const renderFatDot = (props: any): React.ReactElement<SVGElement> => {
    const { cx, cy, payload } = props;
    if (cx == null || cy == null || isNaN(cx) || isNaN(cy)) return <g key="empty-f-invalid" />;

    if (payload.is_physical_assessment) {
      return (
        <g
          key={`dot-f-${payload.date}`}
          className="cursor-pointer transition-opacity hover:opacity-80"
          onClick={(e) => {
            e.stopPropagation();
            if (payload.assessment_id && onSelectAssessment) {
              onSelectAssessment(payload.assessment_id);
            }
          }}
        >
          <circle cx={cx} cy={cy} r={7} fill="#0B0F17" stroke="#F59E0B" strokeWidth={2.5} />
          <circle cx={cx} cy={cy} r={3.5} fill="#F59E0B" />
        </g>
      );
    }

    // Only render visible circle if fat was explicitly measured
    if (payload.body_fat_pct !== null) {
      return <circle key={`dot-f-${payload.date}`} cx={cx} cy={cy} r={3} fill="#F59E0B" fillOpacity={0.7} />;
    }
    return <g key={`empty-f-${payload.date}`} />;
  };

  // Custom Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const pt: TimelinePoint = payload[0].payload;

    return (
      <div className="bg-slate-900 p-4 rounded-radius-lg border border-slate-700 shadow-dialog text-xs space-y-2 max-w-xs z-50">
        <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-2">
          <div className="flex items-center gap-1.5 font-bold text-slate-200">
            <Calendar className="h-3.5 w-3.5 text-cyan-400" aria-hidden="true" />
            <span>{formatDateFull(pt.date)}</span>
          </div>
          {pt.is_physical_assessment ? (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-radius-full bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/30 text-xs">
              <Camera className="h-3 w-3" aria-hidden="true" /> Avaliação Oficial
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-radius-full bg-slate-800 text-slate-400 font-medium text-xs">
              {pt.source || 'Wearable'}
            </span>
          )}
        </div>

        <div className="space-y-1.5 pt-0.5">
          {pt.weight_kg !== null && (
            <div className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-slate-400">
                <span className="h-2 w-2 rounded-radius-full bg-emerald-400" /> Peso:
              </span>
              <strong className="text-emerald-400 font-bold">{pt.weight_kg} kg</strong>
            </div>
          )}

          {pt.body_fat_pct !== null && (
            <div className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-slate-400">
                <span className="h-2 w-2 rounded-radius-full bg-amber-400" /> Gordura Corporal:
              </span>
              <strong className="text-amber-400 font-bold">{pt.body_fat_pct}%</strong>
            </div>
          )}

          {pt.lean_mass_kg !== null && (
            <div className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-slate-400">
                <span className="h-2 w-2 rounded-radius-full bg-cyan-400" /> Massa Magra:
              </span>
              <strong className="text-cyan-400 font-bold">{pt.lean_mass_kg} kg</strong>
            </div>
          )}

          {pt.fat_mass_kg !== null && (
            <div className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-slate-400">
                <span className="h-2 w-2 rounded-radius-full bg-orange-400" /> Massa Gorda:
              </span>
              <strong className="text-orange-400 font-bold">{pt.fat_mass_kg} kg</strong>
            </div>
          )}

          {pt.waist_cm !== null && (
            <div className="flex items-center justify-between gap-4 border-t border-slate-800/80 pt-1.5">
              <span className="text-slate-400">Cintura:</span>
              <strong className="text-purple-400 font-semibold">{pt.waist_cm} cm</strong>
            </div>
          )}
          {pt.abdomen_cm !== null && (
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-400">Abdômen:</span>
              <strong className="text-pink-400 font-semibold">{pt.abdomen_cm} cm</strong>
            </div>
          )}
          {pt.hip_cm !== null && (
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-400">Quadril:</span>
              <strong className="text-blue-400 font-semibold">{pt.hip_cm} cm</strong>
            </div>
          )}
        </div>

        {pt.is_physical_assessment && (
          <div className="border-t border-slate-800 pt-1.5 text-xs text-cyan-400/90 italic flex items-center gap-1">
            <Sparkles className="h-3 w-3" /> Clique no ponto para abrir fotos e detalhes
          </div>
        )}
      </div>
    );
  };

  if (loading && !data) {
    return (
      <div className="surface-panel p-8 rounded-radius-xl border border-slate-200 dark:border-slate-800 flex items-center justify-center">
        <LoadingIndicator label="Carregando evolução da composição corporal..." />
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        title="Falha ao carregar composição corporal"
        message={error}
        onRetry={fetchTimeline}
      />
    );
  }

  const hasEnoughData = (data?.points?.length || 0) >= 1;

  if (!hasEnoughData) {
    return null; // Oculta elegantemente se ainda não houver nenhuma pesagem
  }

  return (
    <div className="surface-panel p-5 sm:p-6 rounded-radius-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
      {/* Top Bar: Title & KPI Badges */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-radius-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <Activity className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                Evolução da Composição Corporal
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Histórico integrado de balança, wearables (Zepp/Google Health) e avaliações físicas.
              </p>
            </div>
          </div>
        </div>

        {/* KPI Chips */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          {/* Peso Atual */}
          <div className="px-3 py-1.5 rounded-radius-md bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2">
            <span className="text-xs text-emerald-600 dark:text-emerald-400/90 font-medium">Peso:</span>
            <strong className="text-xs sm:text-sm font-bold text-emerald-600 dark:text-emerald-400">
              {formatMetricValueString(activeSummary?.latest_weight_kg, 'kg')}
            </strong>
            {activeSummary?.weight_delta !== null && activeSummary?.weight_delta !== undefined && (
              <span
                className={`text-xs font-bold px-1.5 py-0.5 rounded-radius-sm flex items-center gap-0.5 ${
                  activeSummary.weight_delta <= 0
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-amber-500/20 text-amber-400'
                }`}
              >
                {activeSummary.weight_delta <= 0 ? (
                  <TrendingDown className="h-3 w-3" aria-hidden="true" />
                ) : (
                  <TrendingUp className="h-3 w-3" aria-hidden="true" />
                )}
                {activeSummary.weight_delta > 0 ? `+${activeSummary.weight_delta}` : activeSummary.weight_delta} kg
              </span>
            )}
          </div>

          {/* Gordura Corporal */}
          <div className="px-3 py-1.5 rounded-radius-md bg-amber-500/10 border border-amber-500/20 flex items-center gap-2">
            <span className="text-xs text-amber-600 dark:text-amber-400/90 font-medium">Gordura:</span>
            <strong className="text-xs sm:text-sm font-bold text-amber-600 dark:text-amber-400">
              {formatMetricValueString(activeSummary?.latest_body_fat_pct, '%')}
            </strong>
            {activeSummary?.body_fat_delta !== null && activeSummary?.body_fat_delta !== undefined && (
              <span
                className={`text-xs font-bold px-1.5 py-0.5 rounded-radius-sm flex items-center gap-0.5 ${
                  activeSummary.body_fat_delta <= 0
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-amber-500/20 text-amber-400'
                }`}
              >
                {activeSummary.body_fat_delta <= 0 ? (
                  <TrendingDown className="h-3 w-3" aria-hidden="true" />
                ) : (
                  <TrendingUp className="h-3 w-3" aria-hidden="true" />
                )}
                {activeSummary.body_fat_delta > 0 ? `+${activeSummary.body_fat_delta}` : activeSummary.body_fat_delta}%
              </span>
            )}
          </div>

          {/* Massa Magra */}
          <div className="px-3 py-1.5 rounded-radius-md bg-cyan-500/10 border border-cyan-500/20 flex items-center gap-2">
            <span className="text-xs text-cyan-600 dark:text-cyan-400/90 font-medium">Massa Magra:</span>
            <strong className="text-xs sm:text-sm font-bold text-cyan-600 dark:text-cyan-400">
              {formatMetricValueString(activeSummary?.latest_lean_mass_kg, 'kg')}
            </strong>
            {activeSummary?.lean_mass_delta !== null && activeSummary?.lean_mass_delta !== undefined && (
              <span
                className={`text-xs font-bold px-1.5 py-0.5 rounded-radius-sm flex items-center gap-0.5 ${
                  activeSummary.lean_mass_delta >= 0
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-amber-500/20 text-amber-400'
                }`}
              >
                {activeSummary.lean_mass_delta >= 0 ? (
                  <TrendingUp className="h-3 w-3" aria-hidden="true" />
                ) : (
                  <TrendingDown className="h-3 w-3" aria-hidden="true" />
                )}
                {activeSummary.lean_mass_delta > 0
                  ? `+${activeSummary.lean_mass_delta}`
                  : activeSummary.lean_mass_delta}{' '}
                kg
              </span>
            )}
          </div>

          {/* Meta de Peso (se configurada) */}
          {data?.target_weight_kg && (
            <div className="px-3 py-1.5 rounded-radius-md bg-violet-500/10 border border-violet-500/20 flex items-center gap-1.5 text-violet-600 dark:text-violet-300">
              <Target className="h-3.5 w-3.5 text-violet-400" aria-hidden="true" />
              <span className="text-xs font-medium">Meta:</span>
              <strong className="text-xs sm:text-sm font-bold">{data.target_weight_kg} kg</strong>
            </div>
          )}
        </div>
      </div>

      {/* Controls Bar: View Mode Tabs + Time Range Pills */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1 border-t border-slate-200/70 dark:border-slate-800/70">
        {/* View Mode Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900/80 p-1 rounded-radius-lg border border-slate-200 dark:border-slate-800 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setViewMode('weight_fat')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-radius-md text-xs font-semibold transition-all shrink-0 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none ${
              viewMode === 'weight_fat'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Scale className="h-3.5 w-3.5" aria-hidden="true" /> Peso & % Gordura
          </button>
          <button
            onClick={() => setViewMode('body_comp')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-radius-md text-xs font-semibold transition-all shrink-0 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none ${
              viewMode === 'body_comp'
                ? 'bg-cyan-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Layers className="h-3.5 w-3.5" aria-hidden="true" /> Massa Magra vs. Gorda
          </button>
          <button
            onClick={() => setViewMode('measurements')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-radius-md text-xs font-semibold transition-all shrink-0 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none ${
              viewMode === 'measurements'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Ruler className="h-3.5 w-3.5" aria-hidden="true" /> Medidas (cm)
          </button>
        </div>

        {/* Time Range Selector */}
        <TimeRangeControl<TimeRange>
          value={timeRange}
          onChange={setTimeRange}
          options={BODY_COMPOSITION_TIME_RANGES}
          activeColor="slate"
          size="sm"
          className="self-end sm:self-auto"
        />
      </div>

      {/* Main Chart Section */}
      <div className="h-80 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          {viewMode === 'weight_fat' ? (
            <LineChart data={filteredPoints} margin={{ top: 15, right: 15, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.25} />
              <XAxis
                dataKey="date"
                tickFormatter={formatDateLabel}
                stroke="#64748b"
                tick={{ fontSize: 11 }}
                tickMargin={8}
              />
              <YAxis
                yAxisId="left"
                domain={['auto', 'auto']}
                stroke="#10b981"
                unit=" kg"
                tick={{ fontSize: 11 }}
                width={50}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                domain={['auto', 'auto']}
                stroke="#f59e0b"
                unit="%"
                tick={{ fontSize: 11 }}
                width={45}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="top"
                align="right"
                wrapperStyle={{ paddingBottom: '10px', fontSize: '12px' }}
              />

              {data?.target_weight_kg && (
                <ReferenceLine
                  yAxisId="left"
                  y={data.target_weight_kg}
                  stroke="#8b5cf6"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  label={{
                    value: `Meta: ${data.target_weight_kg} kg`,
                    position: 'insideBottomRight',
                    fill: '#a78bfa',
                    fontSize: 11,
                  }}
                />
              )}

              <Line
                yAxisId="left"
                type="monotone"
                dataKey="weight_kg"
                name="Peso (kg)"
                stroke="#10b981"
                strokeWidth={2.5}
                connectNulls
                dot={renderWeightDot}
                activeDot={{ r: 6, stroke: '#10b981', strokeWidth: 2, fill: '#0B0F17' }}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="body_fat_pct"
                name="Gordura (%)"
                stroke="#f59e0b"
                strokeWidth={2.5}
                connectNulls
                dot={renderFatDot}
                activeDot={{ r: 6, stroke: '#f59e0b', strokeWidth: 2, fill: '#0B0F17' }}
              />
            </LineChart>
          ) : viewMode === 'body_comp' ? (
            <AreaChart data={filteredPoints} margin={{ top: 15, right: 15, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="leanMassGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="fatMassGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.25} />
              <XAxis
                dataKey="date"
                tickFormatter={formatDateLabel}
                stroke="#64748b"
                tick={{ fontSize: 11 }}
                tickMargin={8}
              />
              <YAxis
                domain={['auto', 'auto']}
                stroke="#94a3b8"
                unit=" kg"
                tick={{ fontSize: 11 }}
                width={50}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="top"
                align="right"
                wrapperStyle={{ paddingBottom: '10px', fontSize: '12px' }}
              />
              <Area
                type="monotone"
                dataKey="lean_mass_kg"
                name="Massa Magra (kg)"
                stroke="#06b6d4"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#leanMassGrad)"
                connectNulls
              />
              <Area
                type="monotone"
                dataKey="fat_mass_kg"
                name="Massa Gorda (kg)"
                stroke="#f59e0b"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#fatMassGrad)"
                connectNulls
              />
            </AreaChart>
          ) : (
            <LineChart data={filteredPoints} margin={{ top: 15, right: 15, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.25} />
              <XAxis
                dataKey="date"
                tickFormatter={formatDateLabel}
                stroke="#64748b"
                tick={{ fontSize: 11 }}
                tickMargin={8}
              />
              <YAxis
                domain={['auto', 'auto']}
                stroke="#94a3b8"
                unit=" cm"
                tick={{ fontSize: 11 }}
                width={50}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="top"
                align="right"
                wrapperStyle={{ paddingBottom: '10px', fontSize: '12px' }}
              />
              <Line
                type="monotone"
                dataKey="waist_cm"
                name="Cintura (cm)"
                stroke="#8b5cf6"
                strokeWidth={2.2}
                connectNulls
                dot={{ r: 3.5, fill: '#8b5cf6' }}
              />
              <Line
                type="monotone"
                dataKey="abdomen_cm"
                name="Abdômen (cm)"
                stroke="#ec4899"
                strokeWidth={2.2}
                connectNulls
                dot={{ r: 3.5, fill: '#ec4899' }}
              />
              <Line
                type="monotone"
                dataKey="hip_cm"
                name="Quadril (cm)"
                stroke="#3b82f6"
                strokeWidth={2.2}
                connectNulls
                dot={{ r: 3.5, fill: '#3b82f6' }}
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Footnote Guide */}
      <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-200/60 dark:border-slate-800/60 gap-2">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-radius-full border-2 border-cyan-400 bg-emerald-500" aria-hidden="true" />
            Marcador com anel = Avaliação Física com fotos (clicável)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-radius-full bg-emerald-500" aria-hidden="true" />
            Ponto simples = Medição Wearable / Balança
          </span>
        </div>
        <span>Fórmula: Massa Magra = Peso × (1 - (% Gordura / 100))</span>
      </div>
    </div>
  );
};
