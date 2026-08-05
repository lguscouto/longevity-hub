import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Dna, Plus, AlertCircle, CheckCircle2, Trash2, Eye, FileText, AlertTriangle } from 'lucide-react';

import { ApiError, requestJson } from '../lib/api';

interface LabResult {
  id?: number;
  collected_at: string;
  metric_key: string;
  metric_name: string;
  value: number;
  unit: string;
  ref_min?: number;
  ref_max?: number;
  optimal_target?: number;
  category?: string;
  record_origin?: string;
}

interface LabResultsTableProps {
  labs: LabResult[];
  onAddBatchLabs: (records: any[]) => void;
  onRefreshData?: () => void;
}

interface MarkerMeta {
  key: string;
  name: string;
  unit: string;
  ref_min?: number;
  ref_max?: number;
  optimal: number;
  category: string;
}

const LAB_KEY_ALIASES: Record<string, string> = {
  glucose_mgdl: 'fasting_glucose',
  fasting_glucose: 'fasting_glucose',
  creatinine_mgdl: 'creatinine',
  creatinine: 'creatinine',
  albumin_gdl: 'albumin',
  albumin: 'albumin',
  hscrp_mgl: 'hscrp',
  hscrp: 'hscrp',
  rdw_pct: 'rdw',
  rdw: 'rdw',
  mcv_fl: 'mcv',
  mcv: 'mcv',
  alk_phos_ul: 'alk_phos',
  alk_phos: 'alk_phos',
  wbc_1000ul: 'wbc',
  wbc: 'wbc',
  hdl: 'hdl_cholesterol',
  hdl_cholesterol: 'hdl_cholesterol',
  ldl: 'ldl_cholesterol',
  ldl_cholesterol: 'ldl_cholesterol',
  total_cholesterol: 'total_cholesterol',
  apob: 'apob',
  apoa1: 'apoa1',
  triglycerides: 'triglycerides',
  lpa: 'lpa',
}

const normalizeLabMetricKey = (key: string) => {
  const normalized = key.toLowerCase().trim().replace(/\s+/g, '_').replace(/-/g, '_')
  return LAB_KEY_ALIASES[normalized] ?? normalized
}

const LAB_MARKERS_GROUPS: { groupName: string; icon: string; items: MarkerMeta[] }[] = [
  {
    groupName: "Glicemia & Metabolismo",
    icon: "⚡",
    items: [
      { key: "fasting_glucose", name: "Glicose de Jejum", unit: "mg/dL", ref_min: 70, ref_max: 99, optimal: 85.0, category: "Metabolismo" },
      { key: "fasting_insulin", name: "Insulina de Jejum", unit: "uIU/mL", ref_min: 2.6, ref_max: 24.9, optimal: 4.0, category: "Metabolismo" },
      { key: "hba1c", name: "Hemoglobina Glicada (HbA1c)", unit: "%", ref_min: 4.0, ref_max: 5.6, optimal: 5.2, category: "Metabolismo" },
      { key: "homa_ir", name: "Índice HOMA-IR", unit: "score", ref_min: 0.5, ref_max: 2.1, optimal: 1.0, category: "Metabolismo" },
      { key: "uric_acid", name: "Ácido Úrico", unit: "mg/dL", ref_min: 3.5, ref_max: 7.2, optimal: 5.0, category: "Metabolismo" }
    ]
  },
  {
    groupName: "Hormônios & Sexuais",
    icon: "🧬",
    items: [
      { key: "testosterone_total", name: "Testosterona Total", unit: "ng/dL", ref_min: 300, ref_max: 1000, optimal: 750.0, category: "Hormônios" },
      { key: "testosterone_free", name: "Testosterona Livre", unit: "pg/mL", ref_min: 8.7, ref_max: 25.0, optimal: 18.0, category: "Hormônios" },
      { key: "estradiol", name: "Estradiol (E2)", unit: "pg/mL", ref_min: 10, ref_max: 40, optimal: 25.0, category: "Hormônios" },
      { key: "shbg", name: "SHBG (Globulina Ligadora)", unit: "nmol/L", ref_min: 18, ref_max: 54, optimal: 35.0, category: "Hormônios" },
      { key: "dhea_s", name: "DHEA-S", unit: "ug/dL", ref_min: 160, ref_max: 450, optimal: 350.0, category: "Hormônios" },
      { key: "cortisol", name: "Cortisol Basal (Manhã)", unit: "ug/dL", ref_min: 6.2, ref_max: 19.4, optimal: 12.0, category: "Hormônios" }
    ]
  },
  {
    groupName: "Inflamação & Imunidade",
    icon: "🔥",
    items: [
      { key: "hscrp", name: "Proteína C-Reativa (PCR-us)", unit: "mg/L", ref_min: 0, ref_max: 3.0, optimal: 0.5, category: "Inflamação" },
      { key: "homocysteine", name: "Homocisteína", unit: "umol/L", ref_min: 5.0, ref_max: 15.0, optimal: 7.5, category: "Metilação/Cardio" },
      { key: "ferritin", name: "Ferritina Sanguínea", unit: "ng/mL", ref_min: 30, ref_max: 300, optimal: 100.0, category: "Inflamação/Ferro" },
      { key: "wbc", name: "Leucócitos Totais (WBC)", unit: "10^3/uL", ref_min: 4.5, ref_max: 11.0, optimal: 5.5, category: "Imunidade" },
      { key: "lymphocyte_pct", name: "Linfócitos (%)", unit: "%", ref_min: 20, ref_max: 40, optimal: 30.0, category: "Imunidade" }
    ]
  },
  {
    groupName: "Hepático & Enzimático",
    icon: "🧪",
    items: [
      { key: "albumin", name: "Albumina Sanguínea", unit: "g/dL", ref_min: 3.5, ref_max: 5.2, optimal: 4.6, category: "Hepático/Nutricional" },
      { key: "alk_phos", name: "Fosfatase Alcalina", unit: "U/L", ref_min: 44, ref_max: 147, optimal: 65.0, category: "Hepático/Ósseo" },
      { key: "ast", name: "TGO / AST", unit: "U/L", ref_min: 10, ref_max: 40, optimal: 20.0, category: "Hepático" },
      { key: "alt", name: "TGP / ALT", unit: "U/L", ref_min: 7, ref_max: 56, optimal: 20.0, category: "Hepático" },
      { key: "ggt", name: "Gama GT (GGT)", unit: "U/L", ref_min: 8, ref_max: 61, optimal: 18.0, category: "Hepático" }
    ]
  },
  {
    groupName: "Renal & Eletrólitos",
    icon: "🩺",
    items: [
      { key: "creatinine", name: "Creatinina Sanguínea", unit: "mg/dL", ref_min: 0.7, ref_max: 1.2, optimal: 0.9, category: "Renal" },
      { key: "cystatin_c", name: "Cistatina C", unit: "mg/L", ref_min: 0.6, ref_max: 1.0, optimal: 0.75, category: "Renal" },
      { key: "egfr", name: "Taxa de Filtração Glomerular (eGFR)", unit: "mL/min", ref_min: 90, ref_max: 120, optimal: 105.0, category: "Renal" },
      { key: "urea", name: "Ureia Sanguínea", unit: "mg/dL", ref_min: 15, ref_max: 45, optimal: 25.0, category: "Renal" }
    ]
  },
  {
    groupName: "Cardiovascular & Lípides",
    icon: "🫀",
    items: [
      { key: "apob", name: "Apolipoproteína B (ApoB)", unit: "mg/dL", ref_min: 60, ref_max: 130, optimal: 60.0, category: "Cardiovascular" },
      { key: "apoa1", name: "Apolipoproteína A1 (ApoA1)", unit: "mg/dL", ref_min: 120, ref_max: 180, optimal: 150.0, category: "Cardiovascular" },
      { key: "lpa", name: "Lipoproteína (a) [Lp(a)]", unit: "nmol/L", ref_min: 0, ref_max: 75, optimal: 30.0, category: "Cardiovascular" },
      { key: "total_cholesterol", name: "Colesterol Total", unit: "mg/dL", ref_min: 125, ref_max: 200, optimal: 160.0, category: "Cardiovascular" },
      { key: "ldl_cholesterol", name: "Colesterol LDL", unit: "mg/dL", ref_min: 70, ref_max: 130, optimal: 70.0, category: "Cardiovascular" },
      { key: "hdl_cholesterol", name: "Colesterol HDL", unit: "mg/dL", ref_min: 40, ref_max: 90, optimal: 60.0, category: "Cardiovascular" },
      { key: "triglycerides", name: "Triglicérides", unit: "mg/dL", ref_min: 50, ref_max: 150, optimal: 80.0, category: "Cardiovascular" }
    ]
  },
  {
    groupName: "Tireoide & Vitaminas",
    icon: "💊",
    items: [
      { key: "tsh", name: "TSH (Tireoestimulante)", unit: "uIU/mL", ref_min: 0.4, ref_max: 4.0, optimal: 1.5, category: "Tireoide" },
      { key: "free_t3", name: "T3 Livre", unit: "pg/mL", ref_min: 2.0, ref_max: 4.4, optimal: 3.4, category: "Tireoide" },
      { key: "free_t4", name: "T4 Livre", unit: "ng/dL", ref_min: 0.8, ref_max: 1.8, optimal: 1.3, category: "Tireoide" },
      { key: "vitamin_d", name: "Vitamina D (25-OH-D)", unit: "ng/mL", ref_min: 30, ref_max: 100, optimal: 50.0, category: "Vitaminas" },
      { key: "vitamin_b12", name: "Vitamina B12", unit: "pg/mL", ref_min: 200, ref_max: 900, optimal: 700.0, category: "Vitaminas" },
      { key: "magnesium", name: "Magnésio Sanguíneo", unit: "mg/dL", ref_min: 1.7, ref_max: 2.6, optimal: 2.3, category: "Minerais" }
    ]
  },
  {
    groupName: "Hematologia",
    icon: "🔬",
    items: [
      { key: "mcv", name: "Volume Corpuscular Médio (MCV)", unit: "fL", ref_min: 80, ref_max: 100, optimal: 89.0, category: "Hematologia" },
      { key: "rdw", name: "Amplitude de Distribuição (RDW)", unit: "%", ref_min: 11.5, ref_max: 14.5, optimal: 12.2, category: "Hematologia" },
      { key: "hemoglobin", name: "Hemoglobina", unit: "g/dL", ref_min: 13.5, ref_max: 17.5, optimal: 15.0, category: "Hematologia" },
      { key: "platelets", name: "Plaquetas", unit: "10^3/uL", ref_min: 150, ref_max: 450, optimal: 220.0, category: "Hematologia" }
    ]
  }
];

const MARKER_META_BY_KEY = new Map<string, MarkerMeta>(
  LAB_MARKERS_GROUPS.flatMap((group) => group.items.map((item) => [item.key, item] as const)),
)

const getMarkerMeta = (metricKey: string) => MARKER_META_BY_KEY.get(normalizeLabMetricKey(metricKey))

const getMetricDisplayName = (lab: LabResult) => getMarkerMeta(lab.metric_key)?.name ?? lab.metric_name

// Helper para saber se resultado é ótimo
const isMarkerOptimal = (lab: LabResult) => {
  if (lab.optimal_target === undefined || lab.optimal_target === null) return false;
  const k = normalizeLabMetricKey(lab.metric_key || '');
  if (k.includes('hscrp') || k.includes('pcr') || k.includes('apob') || k.includes('lpa') || k.includes('hba1c') || k.includes('insulin') || k.includes('homocysteine') || k.includes('homa') || k.includes('ldl') || k.includes('triglycerides')) {
    return lab.value <= lab.optimal_target;
  }
  return lab.value >= lab.optimal_target;
};

const CLINICALLY_ELIGIBLE_RECORD_ORIGINS = new Set(['patient_lab', 'imported']);

const isClinicallyEligibleLab = (lab: LabResult) =>
  CLINICALLY_ELIGIBLE_RECORD_ORIGINS.has(lab.record_origin ?? 'unverified');

const recordOriginLabel = (origin?: string) => {
  switch (origin) {
    case 'patient_lab': return 'Resultado informado do laudo';
    case 'imported': return 'Resultado importado';
    case 'manual': return 'Entrada manual não verificada';
    case 'synthetic': return 'Dado sintético';
    case 'fixture': return 'Fixture de teste';
    case 'calculated': return 'Valor calculado';
    case 'demo': return 'Demonstração';
    default: return 'Proveniência não verificada';
  }
};

export const LabResultsTable: React.FC<LabResultsTableProps> = ({ labs = [], onAddBatchLabs, onRefreshData }) => {
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [selectedPanelDate, setSelectedPanelDate] = useState<string | null>(null);
  const [deleteConfirmDate, setDeleteConfirmDate] = useState<string | null>(null);

  const [collectedAt, setCollectedAt] = useState(new Date().toISOString().slice(0, 10));
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const safeLabs = Array.isArray(labs) ? labs : [];
  const clinicalLabs = safeLabs.filter(isClinicallyEligibleLab);
  const excludedLabsCount = safeLabs.length - clinicalLabs.length;

  // Agrupamento dos exames por data da coleta (collected_at)
  const groupedLabs: Record<string, LabResult[]> = {};
  safeLabs.forEach(lab => {
    const dt = lab?.collected_at || 'Desconhecido';
    if (!groupedLabs[dt]) groupedLabs[dt] = [];
    groupedLabs[dt].push(lab);
  });

  // Ordenação cronológica: do mais recente para o mais antigo (DESC)
  const sortedDates = Object.keys(groupedLabs).sort((a, b) => b.localeCompare(a));

  const handleInputChange = (key: string, val: string) => {
    setFormValues(prev => ({ ...prev, [key]: val }));
  };

  const handleClearForm = () => {
    setFormValues({});
  };


  const handleBatchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const recordsToSave: any[] = [];

    LAB_MARKERS_GROUPS.forEach(group => {
      group.items.forEach(item => {
        const rawVal = formValues[item.key];
        if (rawVal !== undefined && rawVal !== '' && !isNaN(Number(rawVal))) {
          recordsToSave.push({
            collected_at: collectedAt,
            metric_key: item.key,
            metric_name: item.name,
            value: Number(rawVal),
            unit: item.unit,
            ref_min: item.ref_min,
            ref_max: item.ref_max,
            optimal_target: item.optimal,
            category: item.category
          });
        }
      });
    });

    if (recordsToSave.length > 0) {
      onAddBatchLabs(recordsToSave);
      setShowBatchModal(false);
      setFormValues({});
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmDate) return;
    setIsDeleting(true);
    try {
      await requestJson('/api/labs/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collected_at: deleteConfirmDate })
      });
      setDeleteConfirmDate(null);
      setDeleteError(null);
      if (selectedPanelDate === deleteConfirmDate) setSelectedPanelDate(null);
      if (onRefreshData) onRefreshData();
    } catch (caught) {
      setDeleteError(caught instanceof ApiError ? caught.message : 'Falha ao excluir o laudo.');
    } finally {
      setIsDeleting(false);
    }
  };

  const filledCount = Object.values(formValues).filter(v => v !== '' && !isNaN(Number(v))).length;

  return (
    <div className="glass-panel rounded-3xl p-6 border border-slate-200 dark:border-slate-800 space-y-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Dna className="h-5 w-5 text-cyan-600 dark:text-cyan-400" /> Exames Laboratoriais & Alvos de Longevidade
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400">Histórico de laudos em ordem cronológica (mais recente ao mais antigo)</p>
        </div>

        <button
          onClick={() => setShowBatchModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition glow-cyan"
        >
          <Plus className="h-4 w-4" /> Novo Painel de Exames
        </button>
      </div>

      {deleteError && (
        <div role="alert" className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-800 dark:text-rose-300">
          {deleteError}
        </div>
      )}

      {excludedLabsCount > 0 && (
        <div role="status" className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-800 dark:text-amber-200">
          {excludedLabsCount} registro(s) sem provenance clínica verificável estão visíveis para auditoria, mas foram excluídos de cálculos, razões e relatórios clínicos.
        </div>
      )}

      {/* Cartões de Razões Cardiovasculares Avançadas (Fase 3) */}
      {(() => {
        const getV = (k: string) => clinicalLabs.find(l => normalizeLabMetricKey(l.metric_key) === k)?.value;
        const apob = getV('apob');
        const apoa1 = getV('apoa1');
        const tg = getV('triglycerides');
        const hdl = getV('hdl_cholesterol');
        const totalChol = getV('total_cholesterol');
        const ldl = getV('ldl_cholesterol');

        const hasNumber = (value: number | undefined): value is number => typeof value === 'number' && Number.isFinite(value);

        const ratioApobApoa1 = (hasNumber(apob) && hasNumber(apoa1) && apoa1 > 0) ? (apob / apoa1).toFixed(2) : null;
        const ratioTgHdl = (hasNumber(tg) && hasNumber(hdl) && hdl > 0) ? (tg / hdl).toFixed(2) : null;
        const remnantChol = (hasNumber(totalChol) && hasNumber(hdl) && hasNumber(ldl)) ? (totalChol - hdl - ldl).toFixed(1) : null;

        return (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-50 dark:bg-slate-950/70 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">Razão ApoB / ApoA1</span>
              <div className="flex items-baseline justify-between">
                <span className="text-xl font-extrabold text-slate-900 dark:text-white">{ratioApobApoa1 ? ratioApobApoa1 : '(Sem ApoB/A1)'}</span>
                <span className="text-[10px] font-bold text-cyan-600 dark:text-cyan-400">Alvo: &lt; 0.60</span>
              </div>
              <p className="text-[10px] text-slate-500">Índice primário de risco aterogênico celular (Attia / Blueprint)</p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-950/70 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">Razão Triglicerídeos / HDL</span>
              <div className="flex items-baseline justify-between">
                <span className="text-xl font-extrabold text-slate-900 dark:text-white">{ratioTgHdl ? ratioTgHdl : '(Sem TG/HDL)'}</span>
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">Alvo: &lt; 1.5</span>
              </div>
              <p className="text-[10px] text-slate-500">Indicador direto de sensibilidade à insulina e LDL denso</p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-950/70 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">Colesterol Remanescente</span>
              <div className="flex items-baseline justify-between">
                <span className="text-xl font-extrabold text-slate-900 dark:text-white">{remnantChol ? `${remnantChol} mg/dL` : '(Sem dados)'}</span>
                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">Alvo: &lt; 15 mg/dL</span>
              </div>
              <p className="text-[10px] text-slate-500">Lipoproteínas altamente inflamatórias (Total - HDL - LDL)</p>
            </div>
          </div>
        );
      })()}

      {/* Tabela Consolidada (1 Linha por Laudo/Data) */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
              <th className="pb-3">Data do Laudo</th>
              <th className="pb-3">Exame / Descrição</th>
              <th className="pb-3">Destaques Principais</th>
              <th className="pb-3">Status dos Biomarcadores</th>
              <th className="pb-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
            {sortedDates.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-slate-500">
                  Nenhum laudo cadastrado. Clique em "Novo Painel de Exames" para registrar.
                </td>
              </tr>
            ) : (
              sortedDates.map((dt) => {
                const groupItems = groupedLabs[dt] || [];
                const totalCount = groupItems.length;
                const clinicalCount = groupItems.filter(isClinicallyEligibleLab).length;
                const nonClinicalCount = totalCount - clinicalCount;

                const optimalCount = groupItems.filter(isClinicallyEligibleLab).filter(isMarkerOptimal).length;
                const attentionCount = clinicalCount - optimalCount;

                // Seleciona no máximo 3 mini-badges para manter a linha enxuta
                const keyPriorities = ['glucose_mgdl', 'fasting_glucose', 'apob', 'testosterone_total', 'hscrp', 'hba1c'];
                const highlightItems = [...groupItems]
                  .sort((a, b) => {
                    const idxA = keyPriorities.indexOf(normalizeLabMetricKey(a.metric_key));
                    const idxB = keyPriorities.indexOf(normalizeLabMetricKey(b.metric_key));
                    return (idxA > -1 ? idxA : 99) - (idxB > -1 ? idxB : 99);
                  })
                  .slice(0, 3);

                return (
                  <tr key={dt} className="hover:bg-slate-100/50 dark:hover:bg-slate-900/50 transition cursor-pointer" onClick={() => setSelectedPanelDate(dt)}>
                    {/* Data */}
                    <td className="py-4 text-slate-900 dark:text-white font-mono font-bold">{dt}</td>

                    {/* Descrição */}
                    <td className="py-4">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                        <span className="font-bold text-slate-800 dark:text-slate-200">Painel Completo de Sangue</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 font-semibold">
                          {totalCount} exames
                        </span>
                        {nonClinicalCount > 0 && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-500/10 text-amber-800 dark:text-amber-200 border border-amber-500/30 font-semibold">
                            {nonClinicalCount} sem provenance clínica
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Destaques (Máximo 3 mini-badges) */}
                    <td className="py-4">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {highlightItems.map((item, i) => (
                          <span key={i} className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800">
                            <strong className="text-cyan-600 dark:text-cyan-400">{getMetricDisplayName(item).split(' ')[0]}:</strong> {item.value} {item.unit}
                          </span>
                        ))}
                      </div>
                    </td>

                    {/* Status Consolidado */}
                    <td className="py-4">
                      <div className="flex items-center gap-2">
                        {clinicalCount > 0 ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="h-3 w-3" /> {optimalCount} Ótimos
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            Sem dados clínicos elegíveis
                          </span>
                        )}
                        {attentionCount > 0 && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                            <AlertCircle className="h-3 w-3" /> {attentionCount} Atenção
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Ações */}
                    <td className="py-4 text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setSelectedPanelDate(dt)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition"
                        >
                          <Eye className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" /> Ver Laudo Completo
                        </button>

                        <button
                          onClick={() => setDeleteConfirmDate(dt)}
                          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition"
                          title="Excluir este laudo"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de Detalhes do Laudo */}
      {selectedPanelDate && groupedLabs[selectedPanelDate] && createPortal(
        <div className="fixed inset-0 z-50 bg-slate-950/70 dark:bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl space-y-4 overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FileText className="h-6 w-6 text-cyan-600 dark:text-cyan-400" /> Laudo Médico — {selectedPanelDate}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400">Total de {groupedLabs[selectedPanelDate].length} biomarcadores registrados nesta data</p>
              </div>
              <button onClick={() => setSelectedPanelDate(null)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white text-lg">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-6 pr-2">
              {LAB_MARKERS_GROUPS.map((group, idx) => {
                const groupKeys = group.items.map(i => i.key);
                const matchingResults = groupedLabs[selectedPanelDate].filter(r => groupKeys.includes(normalizeLabMetricKey(r.metric_key)));

                if (matchingResults.length === 0) return null;

                return (
                  <div key={idx} className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2 border-b border-slate-200 dark:border-slate-800/80 pb-2">
                      <span>{group.icon}</span> {group.groupName} ({matchingResults.length})
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {matchingResults.map((item, i) => {
                        const isEligible = isClinicallyEligibleLab(item);
                        const isOpt = isEligible && isMarkerOptimal(item);
                        return (
                          <div key={i} className="bg-slate-50 dark:bg-slate-950/80 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between shadow-sm">
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-bold text-slate-900 dark:text-white truncate" title={getMetricDisplayName(item)}>
                                  {getMetricDisplayName(item)}
                                </span>
                                {isOpt ? (
                                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5">
                                    <CheckCircle2 className="h-3 w-3" /> Ótimo
                                  </span>
                                ) : !isEligible ? (
                                  <span className="text-[10px] text-amber-700 dark:text-amber-300 font-bold">Não clínico</span>
                                ) : (
                                  <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold flex items-center gap-0.5">
                                    <AlertCircle className="h-3 w-3" /> Atenção
                                  </span>
                                )}
                              </div>

                              <div className="text-xl font-extrabold text-cyan-700 dark:text-cyan-300">
                                {item.value} <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{item.unit}</span>
                              </div>
                            </div>

                            <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-800/60 text-[10px] text-slate-500 flex justify-between">
                              <span>{recordOriginLabel(item.record_origin)}</span>
                              <span className="font-semibold text-emerald-600 dark:text-emerald-400">Alvo: {item.optimal_target} {item.unit}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedPanelDate(null)}
                className="px-5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs border border-slate-200 dark:border-slate-700 transition"
              >
                Fechar Laudo
              </button>
            </div>
          </div>
        </div>
      , document.body)}

      {/* Modal de Confirmação de Exclusão */}
      {deleteConfirmDate && createPortal(
        <div className="fixed inset-0 z-50 bg-slate-950/70 dark:bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Confirmar Exclusão de Laudo</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400">Ação irreversível de banco de dados</p>
              </div>
            </div>

            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-950/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
              Tem certeza que deseja excluir todos os <strong className="text-slate-900 dark:text-white">{groupedLabs[deleteConfirmDate]?.length || 0} exames</strong> registrados no laudo do dia <strong className="text-cyan-600 dark:text-cyan-400">{deleteConfirmDate}</strong>?
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmDate(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs border border-slate-200 dark:border-slate-700 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs glow-rose transition"
              >
                <Trash2 className="h-4 w-4" />
                {isDeleting ? 'Excluindo...' : 'Confirmar Exclusão'}
              </button>
            </div>
          </div>
        </div>
      , document.body)}

      {/* Modal de Inclusão em Lote */}
      {showBatchModal && createPortal(
        <div className="fixed inset-0 z-50 bg-slate-950/70 dark:bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl space-y-4 overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Dna className="h-6 w-6 text-cyan-600 dark:text-cyan-400" /> Registrar Painel Completo de Exames de Sangue
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400">Preencha apenas os marcadores realizados no seu laudo médico</p>
              </div>
              <button onClick={() => setShowBatchModal(false)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white text-lg">✕</button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-950/60 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs">
              <div className="flex items-center gap-2">
                <label htmlFor="lab-collected-at" className="text-slate-600 dark:text-slate-400 font-semibold">Data da Coleta:</label>
                <input
                  id="lab-collected-at"
                  type="date"
                  value={collectedAt}
                  onChange={e => setCollectedAt(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-900 dark:text-white font-medium focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleClearForm}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold transition border border-slate-200 dark:border-slate-700"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Limpar Tudo
                </button>
              </div>
            </div>

            <form onSubmit={handleBatchSubmit} className="flex-1 overflow-y-auto space-y-6 pr-2">
              {LAB_MARKERS_GROUPS.map((group, idx) => (
                <div key={idx} className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2 border-b border-slate-200 dark:border-slate-800/80 pb-2">
                    <span>{group.icon}</span> {group.groupName}
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {group.items.map((item) => (
                      <div key={item.key} className="bg-slate-50 dark:bg-slate-950/80 p-3 rounded-xl border border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 transition shadow-sm">
                        <label htmlFor={`lab-marker-${item.key}`} className="block text-xs font-bold text-slate-900 dark:text-white mb-1 truncate" title={item.name}>
                          {item.name}
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            id={`lab-marker-${item.key}`}
                            type="number"
                            step="0.01"
                            placeholder="Vazio"
                            value={formValues[item.key] || ''}
                            onChange={e => handleInputChange(item.key, e.target.value)}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-900 dark:text-white font-semibold text-xs focus:border-cyan-500 focus:outline-none"
                          />
                          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">{item.unit}</span>
                        </div>
                        <span className="text-[9px] text-slate-500 mt-1 block">
                          Alvo: {item.optimal} {item.unit}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <div className="sticky bottom-0 bg-white dark:bg-slate-900 pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400">
                  {filledCount} marcador(es) pronto(s) para salvar
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowBatchModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs border border-slate-200 dark:border-slate-700 transition"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    disabled={filledCount === 0}
                    className="flex items-center gap-2 px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-slate-950 font-bold text-xs glow-cyan transition"
                  >
                    Salvar Painel Completo ({filledCount})
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      , document.body)}
    </div>
  );
};
