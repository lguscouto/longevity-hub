import React, { useState, useEffect, useMemo } from 'react';
import {
  FlaskConical,
  Calendar,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Activity,
  Heart,
  ShieldCheck,
  Sparkles,
  Info,
  Clock,
} from 'lucide-react';
import { requestJson } from '../../lib/api';
import { Button, Input, LoadingIndicator, EmptyState } from '../ui';
import { formatDateBr } from './types';
import {
  LabResult,
  getMarkerMeta,
  getLabMarkerStatus,
  normalizeLabMetricKey,
} from '../labs/labMarkers';

export type TrainerLabCategory =
  | 'all'
  | 'hormones'
  | 'metabolism'
  | 'lipids'
  | 'hepatic_renal'
  | 'hemogram'
  | 'inflammation_vitamins';

export const TRAINER_CATEGORY_LABELS: Record<TrainerLabCategory, string> = {
  all: 'Todos os Marcadores',
  hormones: 'Hormônios & Tireoide',
  metabolism: 'Metabolismo & Glicemia',
  lipids: 'Perfil Lipídico',
  hepatic_renal: 'Fígado & Rins',
  hemogram: 'Hemograma & Imunidade',
  inflammation_vitamins: 'Inflamação & Vitaminas',
};

// Mapeamento semântico de categorias laboratoriais para contexto de treinamento físico
export function categorizeMarkerForTrainer(metricKey: string, rawName?: string): TrainerLabCategory {
  const k = normalizeLabMetricKey(metricKey).toLowerCase();
  const n = (rawName || '').toLowerCase();

  // Hormônios e Tireoide
  if (
    k.includes('testo') ||
    k.includes('dhea') ||
    k.includes('cortisol') ||
    k.includes('estradiol') ||
    k.includes('prolact') ||
    k.includes('tsh') ||
    k.includes('t3') ||
    k.includes('t4') ||
    k.includes('igf') ||
    k.includes('shbg') ||
    n.includes('testosterona') ||
    n.includes('cortisol') ||
    n.includes('tireo') ||
    n.includes('estradiol')
  ) {
    return 'hormones';
  }

  // Metabolismo e Glicemia
  if (
    k.includes('glucose') ||
    k.includes('glicose') ||
    k.includes('insulin') ||
    k.includes('hba1c') ||
    k.includes('homa') ||
    n.includes('glicemia') ||
    n.includes('insulina') ||
    n.includes('glicada')
  ) {
    return 'metabolism';
  }

  // Perfil Lipídico
  if (
    k.includes('cholesterol') ||
    k.includes('colesterol') ||
    k.includes('hdl') ||
    k.includes('ldl') ||
    k.includes('vldl') ||
    k.includes('triglycer') ||
    k.includes('triglic') ||
    k.includes('apob') ||
    k.includes('apoa') ||
    k.includes('lpa') ||
    n.includes('colesterol') ||
    n.includes('triglicer')
  ) {
    return 'lipids';
  }

  // Fígado e Rins
  if (
    k.includes('alt') ||
    k.includes('ast') ||
    k.includes('tgp') ||
    k.includes('tgo') ||
    k.includes('ggt') ||
    k.includes('gama_gt') ||
    k.includes('creatinine') ||
    k.includes('creatinina') ||
    k.includes('urea') ||
    k.includes('ureia') ||
    k.includes('bun') ||
    k.includes('egfr') ||
    k.includes('uric_acid') ||
    k.includes('acido_urico') ||
    k.includes('bilirubin') ||
    k.includes('alk_phos') ||
    n.includes('creatinina') ||
    n.includes('ureia') ||
    n.includes('tgo') ||
    n.includes('tgp')
  ) {
    return 'hepatic_renal';
  }

  // Hemograma e Imunidade
  if (
    k.includes('hemoglobin') ||
    k.includes('hematocrit') ||
    k.includes('wbc') ||
    k.includes('leucocit') ||
    k.includes('lymphocyte') ||
    k.includes('linfocit') ||
    k.includes('neutrophil') ||
    k.includes('neutrofil') ||
    k.includes('platelet') ||
    k.includes('plaquet') ||
    k.includes('mcv') ||
    k.includes('rdw') ||
    n.includes('hemoglobina') ||
    n.includes('hematócrito') ||
    n.includes('plaquetas') ||
    n.includes('leucócitos')
  ) {
    return 'hemogram';
  }

  // Inflamação, Minerais e Vitaminas
  if (
    k.includes('crp') ||
    k.includes('pcr') ||
    k.includes('hscrp') ||
    k.includes('ferritin') ||
    k.includes('ferritina') ||
    k.includes('iron') ||
    k.includes('ferro') ||
    k.includes('vitamin_d') ||
    k.includes('vitamina_d') ||
    k.includes('b12') ||
    k.includes('albumin') ||
    k.includes('albumina') ||
    k.includes('zinc') ||
    k.includes('zinco') ||
    k.includes('magnesium') ||
    k.includes('magnesio') ||
    n.includes('pcr') ||
    n.includes('ferritina') ||
    n.includes('vitamina')
  ) {
    return 'inflammation_vitamins';
  }

  return 'hormones'; // fallback semântico
}

export const PersonalTrainerLabs: React.FC = () => {
  const [labs, setLabs] = useState<LabResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [selectedDate, setSelectedDate] = useState<string>('latest');
  const [selectedCategory, setSelectedCategory] = useState<TrainerLabCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Carrega exames de sangue
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    requestJson<LabResult[]>('/api/labs')
      .then(data => {
        if (!isMounted) return;
        const validList = Array.isArray(data) ? data : [];
        setLabs(validList);
        setLoading(false);
      })
      .catch(err => {
        if (!isMounted) return;
        setError(err?.message || 'Falha ao carregar exames de sangue');
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Datas únicas de coleta ordenadas da mais recente para a mais antiga
  const availableDates = useMemo(() => {
    const dateSet = new Set<string>();
    labs.forEach(item => {
      if (item.collected_at) {
        dateSet.add(item.collected_at.slice(0, 10));
      }
    });
    return Array.from(dateSet).sort((a, b) => b.localeCompare(a));
  }, [labs]);

  const latestDate = availableDates[0] || null;

  // Data efetiva para exibição
  const activeDate = selectedDate === 'latest' ? latestDate : selectedDate;

  // Exames filtrados pela data ativa
  const labsOnActiveDate = useMemo(() => {
    if (!activeDate) return [];
    return labs.filter(item => (item.collected_at || '').slice(0, 10) === activeDate);
  }, [labs, activeDate]);

  // Contadores para o resumo KPI
  const stats = useMemo(() => {
    let normalCount = 0;
    let alertCount = 0;

    labsOnActiveDate.forEach(item => {
      const status = getLabMarkerStatus(item);
      if (status === 'in_clinical_range') normalCount++;
      else if (status === 'out_of_range') alertCount++;
    });

    return {
      total: labsOnActiveDate.length,
      normal: normalCount,
      alert: alertCount,
    };
  }, [labsOnActiveDate]);

  // Contagem de marcadores por categoria na data ativa
  const categoryCounts = useMemo(() => {
    const counts: Record<TrainerLabCategory, number> = {
      all: labsOnActiveDate.length,
      hormones: 0,
      metabolism: 0,
      lipids: 0,
      hepatic_renal: 0,
      hemogram: 0,
      inflammation_vitamins: 0,
    };

    labsOnActiveDate.forEach(item => {
      const cat = categorizeMarkerForTrainer(item.metric_key, item.metric_name);
      counts[cat] = (counts[cat] || 0) + 1;
    });

    return counts;
  }, [labsOnActiveDate]);

  // Marcadores finais filtrados por categoria e busca
  const filteredLabs = useMemo(() => {
    return labsOnActiveDate.filter(item => {
      // Filtro de categoria
      if (selectedCategory !== 'all') {
        const cat = categorizeMarkerForTrainer(item.metric_key, item.metric_name);
        if (cat !== selectedCategory) return false;
      }

      // Filtro de busca textual
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const meta = getMarkerMeta(item.metric_key);
        const nameMatch = (item.metric_name || '').toLowerCase().includes(q);
        const keyMatch = item.metric_key.toLowerCase().includes(q);
        const metaNameMatch = meta?.name.toLowerCase().includes(q);
        if (!nameMatch && !keyMatch && !metaNameMatch) return false;
      }

      return true;
    });
  }, [labsOnActiveDate, selectedCategory, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Top Context Panel for Personal Trainer */}
      <div className="glass-panel p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
                <FlaskConical className="h-5 w-5" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Últimos Exames de Sangue
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Biomarcadores laboratoriais para suporte à prescrição de treino, recuperação muscular e monitoramento de saúde.
            </p>
          </div>

          {/* Date Selector Dropdown if multiple dates exist */}
          {availableDates.length > 0 && (
            <div className="flex items-center gap-2 self-start md:self-auto bg-slate-50 dark:bg-slate-900/80 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800">
              <Calendar className="h-4 w-4 text-slate-500 ml-2" />
              <label htmlFor="trainer-lab-date" className="sr-only">
                Data do Exame
              </label>
              <select
                id="trainer-lab-date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-800 dark:text-slate-200 py-1 px-2 rounded-lg border-0 focus:ring-2 focus:ring-cyan-500 focus:outline-none cursor-pointer"
              >
                <option value="latest">
                  Coleta Mais Recente {latestDate ? `(${formatDateBr(latestDate)})` : ''}
                </option>
                {availableDates.map(d => (
                  <option key={d} value={d}>
                    Coleta de {formatDateBr(d)}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Quick KPI Summary Bar */}
        {activeDate && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-slate-200 dark:border-slate-800/80">
            {/* Card 1: Data */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-1">
                <Clock className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
                <span>Data da Coleta</span>
              </div>
              <div className="text-base font-bold text-slate-900 dark:text-white">
                {formatDateBr(activeDate)}
              </div>
            </div>

            {/* Card 2: Total de Biomarcadores */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-1">
                <Activity className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400" />
                <span>Marcadores Analisados</span>
              </div>
              <div className="text-base font-bold text-slate-900 dark:text-white">
                {stats.total}
              </div>
            </div>

            {/* Card 3: Faixa Ótima / Normal */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Na referência registrada</span>
              </div>
              <div className="text-base font-bold text-emerald-700 dark:text-emerald-400">
                {stats.normal}
              </div>
            </div>

            {/* Card 4: Fora da Faixa */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-1">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                <span>Atenção / Fora de Faixa</span>
              </div>
              <div
                className={`text-base font-bold ${
                  stats.alert > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-700 dark:text-slate-300'
                }`}
              >
                {stats.alert}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="glass-panel p-12 text-center text-slate-400 rounded-2xl flex flex-col items-center gap-3">
          <LoadingIndicator label="Carregando exames de sangue para o treinador..." size="md" />
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="glass-panel p-6 rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-300 flex items-center gap-3">
          <AlertTriangle className="h-6 w-6 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && labs.length === 0 && (
        <EmptyState
          title="Nenhum exame de sangue registrado"
          description="Assim que o aluno cadastrar ou importar laudos laboratoriais, o painel do personal apresentará os biomarcadores hormonais, metabólicos e sanguíneos."
        />
      )}

      {/* Controls & Filter Bar */}
      {!loading && !error && labs.length > 0 && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <Input
                type="text"
                placeholder="Buscar biomarcador (ex: testosterona, glicemia, pcr)..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 text-xs sm:text-sm"
              />
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="w-full overflow-x-auto no-scrollbar py-0.5">
            <div className="flex items-center gap-1.5 sm:gap-2 w-max">
              {(Object.keys(TRAINER_CATEGORY_LABELS) as TrainerLabCategory[]).map(catKey => {
                const count = categoryCounts[catKey] || 0;
                const isActive = selectedCategory === catKey;
                return (
                  <button
                    key={catKey}
                    type="button"
                    onClick={() => setSelectedCategory(catKey)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                      isActive
                        ? 'bg-cyan-600 text-white shadow-xs'
                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span>{TRAINER_CATEGORY_LABELS[catKey]}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Biomarkers Table */}
          {filteredLabs.length === 0 ? (
            <div className="glass-panel p-8 text-center text-slate-400 rounded-2xl">
              <p className="text-sm">Nenhum biomarcador encontrado com os filtros selecionados.</p>
            </div>
          ) : (
            <div className="glass-panel rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-900/70 text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-4">Biomarcador</th>
                      <th className="py-3 px-4">Categoria</th>
                      <th className="py-3 px-4">Resultado</th>
                      <th className="py-3 px-4">Faixa de Referência</th>
                      <th className="py-3 px-4">Meta histórica não validada</th>
                      <th className="py-3 px-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {filteredLabs.map((lab, idx) => {
                      const meta = getMarkerMeta(lab.metric_key);
                      const status = getLabMarkerStatus(lab);
                      const category = categorizeMarkerForTrainer(lab.metric_key, lab.metric_name);
                      const displayName = lab.metric_name || meta?.name || lab.metric_key;

                      const refMin = lab.ref_min;
                      const refMax = lab.ref_max;
                      const refText =
                        refMin != null && refMax != null
                          ? `${refMin} - ${refMax} ${lab.unit}`
                          : refMax != null
                          ? `Até ${refMax} ${lab.unit}`
                          : refMin != null
                          ? `A partir de ${refMin} ${lab.unit}`
                          : '—';

                      const optimalText = lab.optimal_target != null && status !== 'noncanonical_unit' ? `${lab.optimal_target} ${lab.unit}` : '—';

                      return (
                        <tr
                          key={`${lab.metric_key}-${idx}`}
                          className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40 transition-colors"
                        >
                          <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                            <div>{displayName}</div>
                            <div className="text-[11px] font-mono text-slate-400 font-normal">
                              {lab.metric_key}
                            </div>
                          </td>

                          <td className="py-3 px-4 text-slate-500 dark:text-slate-400 text-xs">
                            {TRAINER_CATEGORY_LABELS[category]}
                          </td>

                          <td className="py-3 px-4">
                            <span className="font-bold text-slate-900 dark:text-white text-sm">
                              {lab.value}
                            </span>{' '}
                            <span className="text-xs text-slate-500 dark:text-slate-400">{lab.unit}</span>
                          </td>

                          <td className="py-3 px-4 text-slate-500 dark:text-slate-400 text-xs">
                            {refText}
                          </td>

                          <td className="py-3 px-4 text-xs font-medium text-cyan-700 dark:text-cyan-400">
                            {optimalText || '—'}
                          </td>

                          <td className="py-3 px-4 text-center">
                            {status === 'in_clinical_range' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                Normal
                              </span>
                            ) : status === 'out_of_range' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20">
                                <AlertTriangle className="h-3 w-3" /> Fora da Faixa
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-500">
                                {status === 'noncanonical_unit' ? 'Unidade não normalizada' : status === 'no_reference' ? 'Sem classificação' : 'Origem não verificada'}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
