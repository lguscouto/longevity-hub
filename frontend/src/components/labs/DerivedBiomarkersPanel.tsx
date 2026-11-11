import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Brain,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronsDown,
  ChevronsUp,
  Flame,
  Heart,
  Info,
  Layers,
  RefreshCw,
  Scale,
  Search,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { ApiError, requestJson } from '../../lib/api';
import { Button, InlineError, Input, Select, StatusBadge } from '../ui';
import {
  evaluateDerivedMetric,
  EvaluationResult,
} from './derivedBiomarkerReferences';

export interface EvaluatedMetricItem {
  metric_id: string;
  display_name: string;
  category: string;
  subcategory?: string;
  definition?: string;
  priority?: string;
  status: 'calculated' | 'missing_inputs' | 'blocked_reference' | 'invalid_inputs' | 'out_of_scope' | string;
  value: number | null;
  unit: string | null;
  evidence_level?: string;
  algorithm_version: string;
  source?: string | null;
  source_citation?: string | null;
  source_url?: string | null;
  reference_range?: string | null;
  optimal_range?: string | null;
  formula_expression?: string | null;
  missing_inputs?: string[];
  missing_input_keys?: string[];
  missing_measurements?: string[];
  limitations?: string[] | string | null;
  clinical_disclaimer?: string | null;
  confidence?: string | null;
  used_inputs?: Record<string, any>;
  category_specific?: Record<string, any>;
}

export interface DerivedBiomarkersResponse {
  collected_at: string | null;
  available_dates: string[];
  metrics_by_category: Record<string, EvaluatedMetricItem[]>;
  direct_biomarkers_series: Record<string, { collected_at: string; value: number; unit?: string }[]>;
  cohort: string;
  cohort_variant?: string;
  context?: {
    chronological_age?: number | null;
    biological_sex?: string | null;
    inputs_count?: number;
    paired_limitations?: string[];
  };
}

const CATEGORY_CONFIG: Record<
  string,
  { title: string; icon: React.FC<{ className?: string }>; description: string }
> = {
  biological_age: {
    title: '1. Idade Biológica e Envelhecimento',
    icon: Brain,
    description: 'Estimativas de idade biológica e indicadores calculados a partir dos seus dados.',
  },
  metabolic_insulin: {
    title: '2. Glicemia, Insulina e Metabolismo',
    icon: Sparkles,
    description: 'Indicadores de açúcar no sangue e da resposta do organismo à insulina.',
  },
  inflammation_immune_nutrition: {
    title: '3. Inflamação, Imunidade e Nutrição',
    icon: Flame,
    description: 'Indicadores relacionados à inflamação, às células de defesa e à nutrição.',
  },
  hepatic: {
    title: '4. Fígado e Esteatose',
    icon: Activity,
    description: 'Estimativas relacionadas à gordura no fígado e à possibilidade de fibrose.',
  },
  cardiovascular_renal: {
    title: '5. Cardiovascular, Lipídico e Renal',
    icon: Heart,
    description: 'Indicadores de colesterol, função dos rins e risco cardiovascular e metabólico.',
  },
  body_composition: {
    title: '6. Adiposidade e Composição Corporal',
    icon: Scale,
    description: 'Indicadores baseados nas medidas corporais e estimativas de gordura.',
  },
  direct_biomarkers: {
    title: '7. Séries Históricas de Marcadores Primários',
    icon: TrendingUp,
    description: 'Acompanhamento longitudinal de biomarcadores diretos de alta relevância.',
  },
};

const formatValue = (val: number | null, unit: string | null): string => {
  if (val === null || val === undefined || isNaN(val)) return '—';
  const formatted = Math.abs(val) >= 100 ? val.toFixed(1) : val.toFixed(2);
  const displayedUnit = unit === 'years' ? 'anos' : unit;
  return displayedUnit ? `${formatted} ${displayedUnit}` : formatted;
};

const normalizeSearchText = (str: string): string => {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
};

const matchesSearch = (metric: EvaluatedMetricItem, evaluation: EvaluationResult | undefined, query: string): boolean => {
  if (!query) return true;
  return [metric.display_name, metric.metric_id, metric.subcategory || '', metric.definition || '', evaluation?.clinicalNote || '', evaluation?.badgeLabel || '']
    .some(value => normalizeSearchText(value).includes(query));
};

const kpiStatus = (metric: EvaluatedMetricItem, evaluation: EvaluationResult | undefined) => {
  if (metric.status !== 'calculated' || !evaluation || evaluation.status === 'neutral') return 'pending';
  return evaluation.status;
};

const getMissingList = (metric: EvaluatedMetricItem): string[] => {
  const raw = metric.missing_inputs || metric.missing_input_keys;
  return Array.isArray(raw) ? raw : [];
};

const getLimitationsText = (metric: EvaluatedMetricItem): string => {
  if (Array.isArray(metric.limitations)) {
    return metric.limitations.join('; ');
  }
  return metric.limitations || '';
};

type StatusFilterType =
  | 'all'
  | 'calculated'
  | 'optimal'
  | 'normal'
  | 'attention'
  | 'alert'
  | 'attention_alert'
  | 'pending';

export const DerivedBiomarkersPanel: React.FC<{
  currentSelectedDate?: string | null;
  onRefreshData?: () => void;
}> = ({ currentSelectedDate, onRefreshData }) => {
  const [data, setData] = useState<DerivedBiomarkersResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [recalculateMessage, setRecalculateMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(currentSelectedDate || '');
  const [selectedCohort, setSelectedCohort] = useState<string>('nhanes');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<StatusFilterType>('all');
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  const fetchDerivedMetrics = async (date?: string, cohort?: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (date) params.set('date', date);
      if (cohort) {
        params.set('cohort_variant', cohort);
        params.set('cohort', cohort);
      }
      const queryString = params.toString() ? `?${params.toString()}` : '';

      const resp = await requestJson<DerivedBiomarkersResponse>(`/api/biomarkers/derived${queryString}`);
      setData({
        collected_at: resp?.collected_at ?? null,
        available_dates: Array.isArray(resp?.available_dates) ? resp.available_dates : [],
        metrics_by_category: resp?.metrics_by_category ?? {},
        direct_biomarkers_series: resp?.direct_biomarkers_series ?? {},
        cohort: resp?.cohort ?? 'nhanes',
        context: resp?.context,
      });
      if (resp?.collected_at && !selectedDate) {
        setSelectedDate(resp.collected_at);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao carregar biomarcadores derivados.');
    } finally {
      setLoading(false);
    }
  };

  const handleRecalculate = async () => {
    setRecalculating(true);
    setError(null);
    setRecalculateMessage(null);
    try {
      const params = new URLSearchParams();
      const targetDate = selectedDate || currentSelectedDate;
      if (targetDate) params.set('date', targetDate);
      if (selectedCohort) {
        params.set('cohort_variant', selectedCohort);
        params.set('cohort', selectedCohort);
      }
      const queryString = params.toString() ? `?${params.toString()}` : '';

      const resp = await requestJson<DerivedBiomarkersResponse>(
        `/api/biomarkers/derived/recalculate${queryString}`,
        { method: 'POST' }
      );
      setData({
        collected_at: resp?.collected_at ?? null,
        available_dates: Array.isArray(resp?.available_dates) ? resp.available_dates : [],
        metrics_by_category: resp?.metrics_by_category ?? {},
        direct_biomarkers_series: resp?.direct_biomarkers_series ?? {},
        cohort: resp?.cohort ?? 'nhanes',
        context: resp?.context,
      });
      setRecalculateMessage('Biomarcadores recalculados e persistidos com sucesso!');
      setTimeout(() => setRecalculateMessage(null), 4000);
      onRefreshData?.();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao recalcular biomarcadores derivados.');
    } finally {
      setRecalculating(false);
    }
  };

  useEffect(() => {
    fetchDerivedMetrics(currentSelectedDate || undefined, selectedCohort);
  }, [currentSelectedDate, selectedCohort]);

  const handleDateChange = (newDate: string) => {
    setSelectedDate(newDate);
    fetchDerivedMetrics(newDate || undefined, selectedCohort);
  };

  const handleCohortChange = (newCohort: string) => {
    setSelectedCohort(newCohort);
    fetchDerivedMetrics(selectedDate || undefined, newCohort);
  };

  const toggleCategory = (catKey: string) => {
    setCollapsedCategories((prev) => ({ ...prev, [catKey]: !prev[catKey] }));
  };

  const expandAllCategories = () => {
    const next: Record<string, boolean> = {};
    Object.keys(data?.metrics_by_category || {}).forEach((k) => {
      next[k] = false;
    });
    setCollapsedCategories(next);
  };

  const collapseAllCategories = () => {
    const next: Record<string, boolean> = {};
    Object.keys(data?.metrics_by_category || {}).forEach((k) => {
      next[k] = true;
    });
    setCollapsedCategories(next);
  };

  // Avaliação de cada métrica com contexto biológico
  const evaluatedMap = useMemo(() => {
    const map = new Map<string, EvaluationResult>();
    if (!data?.metrics_by_category) return map;

    const sex = data.context?.biological_sex;
    const age = data.context?.chronological_age ?? undefined;

    Object.values(data.metrics_by_category).forEach((list) => {
      list.forEach((metric) => {
        const res = evaluateDerivedMetric(metric.metric_id, metric.value, {
          sex,
          age,
          backendReference: metric.reference_range,
          backendOptimal: metric.optimal_range,
        });
        map.set(metric.metric_id, res);
      });
    });
    return map;
  }, [data]);

  // Contadores globais para a Hero Bar (KPI Snapshot)
  const kpiSnapshot = useMemo(() => {
    let optimal = 0;
    let normal = 0;
    let attention = 0;
    let alert = 0;
    let pending = 0;

    if (data?.metrics_by_category) {
      Object.values(data.metrics_by_category).forEach((list) => {
        list.forEach((metric) => {
          const evaluation = evaluatedMap.get(metric.metric_id);
          if (!matchesSearch(metric, evaluation, normalizeSearchText(searchQuery))) return;
          const status = kpiStatus(metric, evaluation);
          if (status === 'optimal') optimal += 1;
          else if (status === 'normal') normal += 1;
          else if (status === 'attention') attention += 1;
          else if (status === 'alert') alert += 1;
          else pending += 1;
        });
      });
    }

    return { optimal, normal, attention, alert, pending };
  }, [data, evaluatedMap, searchQuery]);

  // Filtragem e busca de métricas por categoria
  const filteredMetricsByCategory = useMemo(() => {
    const result: Record<string, EvaluatedMetricItem[]> = {};
    if (!data?.metrics_by_category) return result;

    const q = normalizeSearchText(searchQuery);

    Object.entries(data.metrics_by_category).forEach(([catKey, list]) => {
      result[catKey] = list.filter((m) => {
        const ev = evaluatedMap.get(m.metric_id);
        const isCalc = m.status === 'calculated';
        const status = kpiStatus(m, ev);

        // 1. Filtro de Status
        if (statusFilter === 'calculated' && !isCalc) return false;
        if (statusFilter === 'pending' && status !== 'pending') return false;
        if (statusFilter === 'optimal' && status !== 'optimal') return false;
        if (statusFilter === 'normal' && status !== 'normal') return false;
        if (statusFilter === 'attention' && status !== 'attention') return false;
        if (statusFilter === 'alert' && status !== 'alert') return false;
        if (
          statusFilter === 'attention_alert' &&
          (!isCalc || (ev?.status !== 'attention' && ev?.status !== 'alert'))
        ) {
          return false;
        }

        // 2. Busca por texto insensível a acentuação
        return matchesSearch(m, ev, q);
      });
    });

    return result;
  }, [data, evaluatedMap, statusFilter, searchQuery]);

  const categories = [...new Set([...Object.keys(CATEGORY_CONFIG), ...Object.keys(data?.metrics_by_category || {})])];
  const isFilteringActive = searchQuery.trim().length > 0 || statusFilter !== 'all';

  const hasAnyVisibleMetrics = useMemo(() => {
    if (!data) return false;
    return categories.some((catKey) => (filteredMetricsByCategory[catKey] || []).length > 0);
  }, [data, categories, filteredMetricsByCategory]);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-radius-xl p-4 sm:p-6 border border-slate-200 dark:border-slate-800 space-y-6 shadow-xs">
      {/* Cabeçalho Funcional */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Painel de Biomarcadores Derivados & Modelos Clínicos
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Resultados calculados a partir dos seus exames e medidas. As referências e limitações aparecem em cada cartão.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Botão de Recálculo Atômico */}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            loading={recalculating}
            loadingText="Recalculando..."
            leftIcon={RefreshCw}
            onClick={handleRecalculate}
            title="Recalcula e persiste todos os indicadores derivados para a data selecionada"
          >
            Recalcular
          </Button>

          {/* Seletor de Data */}
          {data?.available_dates && data.available_dates.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs">
              <label htmlFor="derived-date-select" className="font-semibold text-slate-600 dark:text-slate-400 shrink-0">
                Data do laudo:
              </label>
              <Select
                id="derived-date-select"
                value={selectedDate || data.collected_at || ''}
                onChange={(e) => handleDateChange(e.target.value)}
                className="w-auto min-h-0 py-1 px-2 pr-7 text-xs font-mono"
              >
                {data.available_dates.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </Select>
            </div>
          )}

          {/* Seletor de Coorte para BioAge */}
          <div className="flex items-center gap-1.5 text-xs">
            <label htmlFor="derived-cohort-select" className="font-semibold text-slate-600 dark:text-slate-400 shrink-0">
              Coorte BioAge:
            </label>
            <Select
              id="derived-cohort-select"
              value={selectedCohort}
              onChange={(e) => handleCohortChange(e.target.value)}
              className="w-auto min-h-0 py-1 px-2 pr-7 text-xs font-semibold"
            >
              <option value="nhanes">NHANES (EUA / Padrão)</option>
              <option value="ukb">UK Biobank (Reino Unido)</option>
              <option value="charls">CHARLS (China / Ásia)</option>
            </Select>
          </div>
        </div>
      </div>

      {recalculateMessage && (
        <div className="flex items-center gap-2 p-3 rounded-radius-lg bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>{recalculateMessage}</span>
        </div>
      )}

      {error && <InlineError message={error} />}

      {/* Hero Bar de Resumo Clínico (KPI Snapshot) */}
      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
          {/* Ótima */}
          <div
            role="button"
            tabIndex={0}
            aria-pressed={statusFilter === 'optimal'}
            onClick={() => setStatusFilter((prev) => (prev === 'optimal' ? 'all' : 'optimal'))}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setStatusFilter((prev) => (prev === 'optimal' ? 'all' : 'optimal'));
              }
            }}
            className={`p-3 rounded-radius-lg border border-l-4 transition-all text-left cursor-pointer focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none ${
              statusFilter === 'optimal'
                ? 'bg-emerald-500/15 border-emerald-500/40 border-l-emerald-600 shadow-xs'
                : 'bg-emerald-500/5 hover:bg-emerald-500/10 border-emerald-500/20 border-l-emerald-500'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                Faixa Ótima
              </span>
              <span className="text-xs px-1.5 py-0.5 rounded-radius-sm bg-emerald-500/20 text-emerald-900 dark:text-emerald-200 font-bold">
                {kpiSnapshot.optimal}
              </span>
            </div>
            <p className="text-xs text-emerald-700/80 dark:text-emerald-400 mt-1 truncate">
              Na faixa definida para o indicador
            </p>
          </div>

          {/* Normal */}
          <div
            role="button"
            tabIndex={0}
            aria-pressed={statusFilter === 'normal'}
            onClick={() => setStatusFilter((prev) => (prev === 'normal' ? 'all' : 'normal'))}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setStatusFilter((prev) => (prev === 'normal' ? 'all' : 'normal'));
              }
            }}
            className={`p-3 rounded-radius-lg border border-l-4 transition-all text-left cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none ${
              statusFilter === 'normal'
                ? 'bg-blue-500/15 border-blue-500/40 border-l-blue-600 shadow-xs'
                : 'bg-blue-500/5 hover:bg-blue-500/10 border-blue-500/20 border-l-blue-500'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-800 dark:text-blue-300 uppercase tracking-wider">
                Faixa Normal
              </span>
              <span className="text-xs px-1.5 py-0.5 rounded-radius-sm bg-blue-500/20 text-blue-900 dark:text-blue-200 font-bold">
                {kpiSnapshot.normal}
              </span>
            </div>
            <p className="text-xs text-blue-700/80 dark:text-blue-400 mt-1 truncate">
              Dentro dos limites basais
            </p>
          </div>

          {/* Atenção */}
          <div
            role="button"
            tabIndex={0}
            aria-pressed={statusFilter === 'attention'}
            onClick={() => setStatusFilter((prev) => (prev === 'attention' ? 'all' : 'attention'))}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setStatusFilter((prev) => (prev === 'attention' ? 'all' : 'attention'));
              }
            }}
            className={`p-3 rounded-radius-lg border border-l-4 transition-all text-left cursor-pointer focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none ${
              statusFilter === 'attention' || statusFilter === 'attention_alert'
                ? 'bg-amber-500/15 border-amber-500/40 border-l-amber-600 shadow-xs'
                : 'bg-amber-500/5 hover:bg-amber-500/10 border-amber-500/20 border-l-amber-500'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider">
                Atenção
              </span>
              <span className="text-xs px-1.5 py-0.5 rounded-radius-sm bg-amber-500/20 text-amber-900 dark:text-amber-200 font-bold">
                {kpiSnapshot.attention}
              </span>
            </div>
            <p className="text-xs text-amber-700/80 dark:text-amber-400 mt-1 truncate">
              Limítrofe ou risco moderado
            </p>
          </div>

          {/* Alerta */}
          <div
            role="button"
            tabIndex={0}
            aria-pressed={statusFilter === 'alert'}
            onClick={() => setStatusFilter((prev) => (prev === 'alert' ? 'all' : 'alert'))}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setStatusFilter((prev) => (prev === 'alert' ? 'all' : 'alert'));
              }
            }}
            className={`p-3 rounded-radius-lg border border-l-4 transition-all text-left cursor-pointer focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:outline-none ${
              statusFilter === 'alert' || statusFilter === 'attention_alert'
                ? 'bg-rose-500/15 border-rose-500/40 border-l-rose-600 shadow-xs'
                : 'bg-rose-500/5 hover:bg-rose-500/10 border-rose-500/20 border-l-rose-500'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-800 dark:text-rose-300 uppercase tracking-wider">
                Alerta
              </span>
              <span className="text-xs px-1.5 py-0.5 rounded-radius-sm bg-rose-500/20 text-rose-900 dark:text-rose-200 font-bold">
                {kpiSnapshot.alert}
              </span>
            </div>
            <p className="text-xs text-rose-700/80 dark:text-rose-400 mt-1 truncate">
              Merece avaliação profissional
            </p>
          </div>

          {/* Pendentes */}
          <div
            role="button"
            tabIndex={0}
            aria-pressed={statusFilter === 'pending'}
            onClick={() => setStatusFilter((prev) => (prev === 'pending' ? 'all' : 'pending'))}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setStatusFilter((prev) => (prev === 'pending' ? 'all' : 'pending'));
              }
            }}
            className={`p-3 rounded-radius-lg border border-l-4 transition-all text-left col-span-2 sm:col-span-1 cursor-pointer focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:outline-none ${
              statusFilter === 'pending'
                ? 'bg-slate-500/15 border-slate-500/40 border-l-slate-600 shadow-xs'
                : 'bg-slate-100/70 dark:bg-slate-800/40 hover:bg-slate-200/50 dark:hover:bg-slate-800/60 border-slate-200 dark:border-slate-700 border-l-slate-400'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Pendentes
              </span>
              <span className="text-xs px-1.5 py-0.5 rounded-radius-sm bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold">
                {kpiSnapshot.pending}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">
              Dados ou interpretação pendentes
            </p>
          </div>
        </div>
      )}

      {/* Barra de Busca e Filtros Rápidos */}
      {data && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
          <div className="w-full sm:w-80">
            <Input
              id="derived-search-input"
              type="search"
              placeholder="Buscar por nome, sigla ou conceito..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search className="h-4 w-4" />}
              className="text-xs py-1.5 min-h-[38px]"
            />
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <Button
              type="button"
              variant={statusFilter === 'all' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('all')}
            >
              Todos
            </Button>
            <Button
              type="button"
              variant={statusFilter === 'calculated' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('calculated')}
            >
              Calculados
            </Button>
            <Button
              type="button"
              variant={statusFilter === 'attention_alert' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('attention_alert')}
            >
              Atenção & Alerta
            </Button>
            <Button
              type="button"
              variant={statusFilter === 'pending' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('pending')}
            >
              Pendentes
            </Button>

            <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-1 hidden sm:block" />

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={expandAllCategories}
              leftIcon={ChevronsDown}
              title="Expandir todas as categorias"
            >
              Expandir
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={collapseAllCategories}
              leftIcon={ChevronsUp}
              title="Recolher todas as categorias"
            >
              Recolher
            </Button>
          </div>
        </div>
      )}

      {loading && !data && (
        <div className="py-8 text-center text-xs text-slate-500 dark:text-slate-400">
          Carregando biomarcadores calculados...
        </div>
      )}

      {/* Módulos de Biomarcadores por Categoria */}
      {data && (
        <div className="space-y-4">
          {categories.map((catKey) => {
            const config = CATEGORY_CONFIG[catKey] || { title: catKey.replace(/_/g, ' '), icon: Layers, description: 'Indicadores disponíveis nesta categoria.' };
            const metrics = filteredMetricsByCategory[catKey] || [];

            // Se busca/filtro está ativo e não há métricas correspondentes, oculta categoria
            if (isFilteringActive && metrics.length === 0) {
              return null;
            }

            // Se filtro estiver ativo, auto-expande categorias com resultados
            const isCollapsed = isFilteringActive
              ? false
              : !!collapsedCategories[catKey];

            const Icon = config.icon;

            return (
              <div
                key={catKey}
                className="border border-slate-200 dark:border-slate-800 rounded-radius-lg overflow-hidden bg-slate-50/50 dark:bg-slate-950/40"
              >
                {/* Header de Categoria com Collapse */}
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => toggleCategory(catKey)}
                  className="w-full flex items-center justify-between p-3.5 bg-slate-100/70 dark:bg-slate-900/80 hover:bg-slate-200/60 dark:hover:bg-slate-800/60 transition-colors text-left rounded-none min-h-0 h-auto font-normal text-slate-800 dark:text-slate-200 border-0"
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider block">
                        {config.title}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {config.description}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 rounded-radius-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold">
                      {metrics.length} métricas
                    </span>
                    {isCollapsed ? (
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-slate-400" />
                    )}
                  </div>
                </Button>

                {/* Conteúdo da Categoria */}
                {!isCollapsed && (
                  <div className="p-4 space-y-3">
                    {/* Disclaimers contextuais específicos */}
                    {catKey === 'direct_biomarkers' && (
                      <div className="flex items-start gap-2 p-2.5 rounded-radius-md bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-900 dark:text-indigo-300">
                        <Info className="h-4 w-4 shrink-0 mt-0.5 text-indigo-600 dark:text-indigo-400" />
                        <span>
                          <strong>Biomarcadores Primários Chave:</strong> Marcadores medidos diretamente em laudo clínico com relevância de primeira ordem para longevidade, metabolismo e resposta sistêmica.
                        </span>
                      </div>
                    )}
                    {catKey === 'inflammation_immune_nutrition' && (
                      <div className="flex items-start gap-2 p-2.5 rounded-radius-md bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300">
                        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                        <span>
                          <strong>Nota Clínica Metodológica:</strong> Índices celulares hematológicos (NLR, PLR, SII, SIRI, PIV) refletem padrões inflamatórios sistêmicos e são ferramentas de pesquisa translacional. Devem ser sempre avaliados em conjunto com a clínica do paciente e histórico infeccioso recente.
                        </span>
                      </div>
                    )}

                    {catKey === 'hepatic' && (
                      <div className="flex items-start gap-2 p-2.5 rounded-radius-md bg-blue-500/10 border border-blue-500/20 text-xs text-blue-800 dark:text-blue-300">
                        <Info className="h-4 w-4 shrink-0 mt-0.5" />
                        <span>
                          <strong>Interpretação por Faixa Etária:</strong> O FIB-4 possui alta sensibilidade na exclusão de fibrose avançada, porém pode apresentar maior taxa de falsos positivos em indivíduos &lt; 35 anos ou &gt; 65 anos.
                        </span>
                      </div>
                    )}

                    {/* Grid de Cartões de Métricas */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {metrics.map((metric) => {
                        const isCalc = metric.status === 'calculated';
                        const evaluation =
                          evaluatedMap.get(metric.metric_id) ||
                          evaluateDerivedMetric(metric.metric_id, metric.value, {
                            sex: data.context?.biological_sex,
                            age: data.context?.chronological_age,
                            backendReference: metric.reference_range,
                            backendOptimal: metric.optimal_range,
                          });
                        const missing = getMissingList(metric);
                        const limText = getLimitationsText(metric);

                        return (
                          <div
                            key={metric.metric_id}
                            className={`p-3.5 rounded-radius-lg border transition-all ${
                              isCalc
                                ? `bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs border-l-4 ${evaluation.borderAccentClass}`
                                : 'bg-slate-50/70 dark:bg-slate-950/40 border-dashed border-slate-300 dark:border-slate-800 border-l-4 border-l-slate-300 dark:border-l-slate-700 opacity-90'
                            } flex flex-col justify-between space-y-2.5`}
                          >
                            <div className="space-y-1.5">
                              {/* Linha superior: Nome e StatusBadge */}
                              <div className="flex items-start justify-between gap-1.5">
                                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight">
                                  {metric.display_name}
                                </span>
                                {isCalc ? (
                                  <StatusBadge variant={evaluation.badgeVariant} size="sm">
                                    {evaluation.badgeLabel}
                                  </StatusBadge>
                                ) : metric.status === 'missing_inputs' ? (
                                  <StatusBadge
                                    variant="warning"
                                    size="sm"
                                    title={missing.length > 0 ? `Faltam dados: ${missing.join(', ')}` : 'Faltam insumos'}
                                  >
                                    Faltam insumos ({missing.length})
                                  </StatusBadge>
                                ) : metric.status === 'blocked_reference' ? (
                                  <StatusBadge
                                    variant="neutral"
                                    size="sm"
                                    title="Equação pendente de validação de coorte externa"
                                  >
                                    Pendente ref.
                                  </StatusBadge>
                                ) : metric.status === 'invalid_inputs' ? (
                                  <StatusBadge variant="error" size="sm">
                                    Insumos inválidos
                                  </StatusBadge>
                                ) : (
                                  <StatusBadge variant="neutral" size="sm">
                                    {metric.status === 'out_of_scope' ? 'Fora do escopo' : 'Indisponível'}
                                  </StatusBadge>
                                )}
                              </div>

                              {/* Valor em destaque e Versão */}
                              <div className="flex items-baseline justify-between pt-0.5">
                                <span
                                  className={`text-xl font-extrabold ${
                                    isCalc
                                      ? 'text-slate-900 dark:text-white'
                                      : 'text-slate-400 dark:text-slate-500 font-mono text-base'
                                  }`}
                                >
                                  {formatValue(metric.value, metric.unit)}
                                </span>
                                <span className="text-xs text-slate-400 font-mono">
                                  v{metric.algorithm_version}
                                </span>
                              </div>
                            </div>

                            {/* Mini-Gauge Linear e Faixas de Referência / Alvo */}
                            {isCalc && evaluation.status !== 'neutral' && (
                              <div className="space-y-1">
                                <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-radius-full overflow-hidden">
                                  <div
                                    className={`h-full transition-all duration-300 rounded-radius-full ${
                                      evaluation.status === 'optimal'
                                        ? 'bg-emerald-500'
                                        : evaluation.status === 'normal'
                                        ? 'bg-blue-500'
                                        : evaluation.status === 'attention'
                                        ? 'bg-amber-500'
                                        : evaluation.status === 'alert'
                                        ? 'bg-rose-500'
                                        : 'bg-slate-400'
                                    }`}
                                    style={{ width: `${evaluation.gaugePercent}%` }}
                                  />
                                </div>
                                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
                                  <span className="truncate" title={`Ref: ${evaluation.referenceText}`}>
                                    Ref: {evaluation.referenceText}
                                  </span>
                                  {evaluation.optimalText && (
                                    <span
                                      className="text-emerald-700 dark:text-emerald-400 font-semibold truncate ml-1 shrink-0"
                                      title={`Alvo: ${evaluation.optimalText}`}
                                    >
                                      Alvo: {evaluation.optimalText}
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Nota Clínica Interpretativa */}
                            {isCalc && evaluation.clinicalNote && (
                              <div
                                className={`p-2 rounded-radius-md text-xs leading-relaxed ${
                                  evaluation.status === 'optimal'
                                    ? 'bg-emerald-500/5 text-emerald-800 dark:text-emerald-300 border border-emerald-500/10'
                                    : evaluation.status === 'normal'
                                    ? 'bg-blue-500/5 text-blue-800 dark:text-blue-300 border border-blue-500/10'
                                    : evaluation.status === 'attention'
                                    ? 'bg-amber-500/5 text-amber-900 dark:text-amber-300 border border-amber-500/15'
                                    : evaluation.status === 'alert'
                                    ? 'bg-rose-500/5 text-rose-900 dark:text-rose-300 border border-rose-500/15'
                                    : 'bg-slate-100/70 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400'
                                }`}
                              >
                                {evaluation.clinicalNote}
                              </div>
                            )}

                            {/* Detalhes de Insumos Faltantes ou Limitações */}
                            <div className="text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800/60 pt-2 space-y-1.5">
                              {data.direct_biomarkers_series?.[metric.metric_id]?.length > 0 && (
                                <div className="flex items-center justify-between text-xs text-indigo-700 dark:text-indigo-300 bg-indigo-50/70 dark:bg-indigo-950/40 px-2 py-1 rounded-radius-md border border-indigo-200/50 dark:border-indigo-800/40">
                                  <span className="flex items-center gap-1 font-medium">
                                    <TrendingUp className="h-3 w-3 shrink-0 text-indigo-500" />
                                    Série histórica ({data.direct_biomarkers_series[metric.metric_id].length} medições)
                                  </span>
                                  <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400">
                                    Última: {data.direct_biomarkers_series[metric.metric_id].slice(-1)[0]?.collected_at}
                                  </span>
                                </div>
                              )}
                              {missing.length > 0 && (
                                <p
                                  className="text-xs text-amber-700 dark:text-amber-400 truncate font-medium"
                                  title={`Requer: ${missing.join(', ')}`}
                                >
                                  Requer: {missing.join(', ')}
                                </p>
                              )}
                              {limText && (
                                <p
                                  className="text-xs text-slate-400 dark:text-slate-500 line-clamp-2"
                                  title={limText}
                                >
                                  {limText}
                                </p>
                              )}
                              {(metric.source || metric.source_citation || metric.source_url) && (
                                <div className="flex items-center justify-between text-xs text-slate-400 pt-0.5">
                                  <span
                                    className="truncate"
                                    title={metric.source || metric.source_citation || undefined}
                                  >
                                    {metric.source || metric.source_citation}
                                  </span>
                                  {metric.source_url && (
                                    <a
                                      href={metric.source_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-indigo-600 dark:text-indigo-400 hover:underline shrink-0 font-medium ml-1"
                                    >
                                      ref ↗
                                    </a>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {!hasAnyVisibleMetrics && (
            <div className="py-12 text-center text-xs text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-950/40 rounded-radius-lg border border-dashed border-slate-200 dark:border-slate-800 p-6 space-y-2">
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                Nenhum biomarcador encontrado
              </p>
              <p>
                Nenhum indicador corresponde aos termos de busca ou filtro de status selecionado.
              </p>
              <div className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('all');
                  }}
                >
                  Limpar filtros
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
