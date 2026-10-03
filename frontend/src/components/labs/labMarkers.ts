/**
 * Domínio de exames laboratoriais (extraído de LabResultsTable — UX_UI_41 §5 / UX_UI_54).
 * Contém apenas dados e funções puras: catálogo de marcadores, aliases de chave,
 * regras explícitas de "Referência Ótima" e proveniência clínica.
 */

export interface LabResult {
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

export type OptimalRule = 'max' | 'min' | 'range' | 'unavailable';

export interface MarkerMeta {
  key: string;
  name: string;
  unit: string;
  ref_min?: number;
  ref_max?: number;
  optimal: number;
  optimal_max?: number;
  optimal_rule?: OptimalRule;
  provenance?: string;
  category: string;
}

export interface LabBatchRecord {
  collected_at: string;
  metric_key: string;
  metric_name: string;
  value: number;
  unit: string;
  ref_min?: number;
  ref_max?: number;
  optimal_target: number;
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
};

export const normalizeLabMetricKey = (key: string) => {
  const normalized = key.toLowerCase().trim().replace(/\s+/g, '_').replace(/-/g, '_');
  return LAB_KEY_ALIASES[normalized] ?? normalized;
};

export const LAB_MARKERS_GROUPS: { groupName: string; icon: string; items: MarkerMeta[] }[] = [
  {
    groupName: 'Glicemia & Metabolismo',
    icon: '⚡',
    items: [
      {
        key: 'fasting_glucose',
        name: 'Glicose de Jejum',
        unit: 'mg/dL',
        ref_min: 70,
        ref_max: 99,
        optimal: 70.0,
        optimal_max: 85.0,
        optimal_rule: 'range',
        provenance: 'Consenso ADA / Longevidade Preventiva (Attia 2024)',
        category: 'Metabolismo',
      },
      {
        key: 'fasting_insulin',
        name: 'Insulina de Jejum',
        unit: 'uIU/mL',
        ref_min: 2.6,
        ref_max: 24.9,
        optimal: 4.0,
        optimal_rule: 'max',
        provenance: 'Consenso Endócrino de Sensibilidade Insulínica',
        category: 'Metabolismo',
      },
      {
        key: 'hba1c',
        name: 'Hemoglobina Glicada (HbA1c)',
        unit: '%',
        ref_min: 4.0,
        ref_max: 5.6,
        optimal: 5.2,
        optimal_rule: 'max',
        provenance: 'Meta Glicêmica Funcional para Longevidade',
        category: 'Metabolismo',
      },
      {
        key: 'homa_ir',
        name: 'Índice HOMA-IR',
        unit: 'score',
        ref_min: 0.5,
        ref_max: 2.1,
        optimal: 1.0,
        optimal_rule: 'max',
        provenance: 'Matthews et al. / Índice HOMA ótimo',
        category: 'Metabolismo',
      },
      {
        key: 'uric_acid',
        name: 'Ácido Úrico',
        unit: 'mg/dL',
        ref_min: 3.5,
        ref_max: 7.2,
        optimal: 5.0,
        optimal_rule: 'max',
        provenance: 'Meta Renal & Inflamatória Funcional',
        category: 'Metabolismo',
      },
    ],
  },
  {
    groupName: 'Hormônios & Sexuais',
    icon: '🧬',
    items: [
      {
        key: 'testosterone_total',
        name: 'Testosterona Total',
        unit: 'ng/dL',
        ref_min: 300,
        ref_max: 1000,
        optimal: 750.0,
        optimal_rule: 'min',
        provenance: 'Faixa Endócrina Otimizada Masculina',
        category: 'Hormônios',
      },
      {
        key: 'testosterone_free',
        name: 'Testosterona Livre',
        unit: 'pg/mL',
        ref_min: 8.7,
        ref_max: 25.0,
        optimal: 18.0,
        optimal_rule: 'min',
        provenance: 'Faixa Endócrina Otimizada',
        category: 'Hormônios',
      },
      {
        key: 'estradiol',
        name: 'Estradiol (E2)',
        unit: 'pg/mL',
        ref_min: 10,
        ref_max: 40,
        optimal: 15.0,
        optimal_max: 30.0,
        optimal_rule: 'range',
        provenance: 'Equilíbrio Hormonal Fisiológico',
        category: 'Hormônios',
      },
      {
        key: 'shbg',
        name: 'SHBG (Globulina Ligadora)',
        unit: 'nmol/L',
        ref_min: 18,
        ref_max: 54,
        optimal: 25.0,
        optimal_max: 45.0,
        optimal_rule: 'range',
        provenance: 'Biodisponibilidade Androgênica',
        category: 'Hormônios',
      },
      {
        key: 'dhea_s',
        name: 'DHEA-S',
        unit: 'ug/dL',
        ref_min: 160,
        ref_max: 450,
        optimal: 350.0,
        optimal_rule: 'min',
        provenance: 'Reserva Adrenocortical Otimizada',
        category: 'Hormônios',
      },
      {
        key: 'cortisol',
        name: 'Cortisol Basal (Manhã)',
        unit: 'ug/dL',
        ref_min: 6.2,
        ref_max: 19.4,
        optimal: 8.0,
        optimal_max: 14.0,
        optimal_rule: 'range',
        provenance: 'Ritmo Circadiano Matinal Fisiológico',
        category: 'Hormônios',
      },
    ],
  },
  {
    groupName: 'Inflamação & Imunidade',
    icon: '🔥',
    items: [
      {
        key: 'hscrp',
        name: 'Proteína C-Reativa (PCR-us)',
        unit: 'mg/L',
        ref_min: 0,
        ref_max: 3.0,
        optimal: 0.5,
        optimal_rule: 'max',
        provenance: 'Ridker et al. / Consenso de Ateroproteção',
        category: 'Inflamação',
      },
      {
        key: 'homocysteine',
        name: 'Homocisteína',
        unit: 'umol/L',
        ref_min: 5.0,
        ref_max: 15.0,
        optimal: 7.5,
        optimal_rule: 'max',
        provenance: 'Prevenção Neurovascular e Metilação',
        category: 'Metilação/Cardio',
      },
      {
        key: 'ferritin',
        name: 'Ferritina Sanguínea',
        unit: 'ng/mL',
        ref_min: 30,
        ref_max: 300,
        optimal: 50.0,
        optimal_max: 120.0,
        optimal_rule: 'range',
        provenance: 'Equilíbrio Férrico sem Sobrecarga Inflamatória',
        category: 'Inflamação/Ferro',
      },
      {
        key: 'wbc',
        name: 'Leucócitos Totais (WBC)',
        unit: '10^3/uL',
        ref_min: 4.5,
        ref_max: 11.0,
        optimal: 4.5,
        optimal_max: 6.5,
        optimal_rule: 'range',
        provenance: 'Baseline Leucocitário Anti-inflamatório',
        category: 'Imunidade',
      },
      {
        key: 'lymphocyte_pct',
        name: 'Linfócitos (%)',
        unit: '%',
        ref_min: 20,
        ref_max: 40,
        optimal: 25.0,
        optimal_max: 35.0,
        optimal_rule: 'range',
        provenance: 'Homeostase Imunológica',
        category: 'Imunidade',
      },
    ],
  },
  {
    groupName: 'Hepático & Enzimático',
    icon: '🧪',
    items: [
      {
        key: 'albumin',
        name: 'Albumina Sanguínea',
        unit: 'g/dL',
        ref_min: 3.5,
        ref_max: 5.2,
        optimal: 4.6,
        optimal_rule: 'min',
        provenance: 'Reserva Hepática e Biomarcador de Longevidade (PhenoAge)',
        category: 'Hepático/Nutricional',
      },
      {
        key: 'alk_phos',
        name: 'Fosfatase Alcalina',
        unit: 'U/L',
        ref_min: 44,
        ref_max: 147,
        optimal: 50.0,
        optimal_max: 80.0,
        optimal_rule: 'range',
        provenance: 'Função Hepatobiliar e Turnover Ósseo',
        category: 'Hepático/Ósseo',
      },
      {
        key: 'ast',
        name: 'TGO / AST',
        unit: 'U/L',
        ref_min: 10,
        ref_max: 40,
        optimal: 20.0,
        optimal_rule: 'max',
        provenance: 'Integridade Hepática sem Citólise',
        category: 'Hepático',
      },
      {
        key: 'alt',
        name: 'TGP / ALT',
        unit: 'U/L',
        ref_min: 7,
        ref_max: 56,
        optimal: 20.0,
        optimal_rule: 'max',
        provenance: 'Atenuação de Esteatose Hepática Subclínica',
        category: 'Hepático',
      },
      {
        key: 'ggt',
        name: 'Gama GT (GGT)',
        unit: 'U/L',
        ref_min: 8,
        ref_max: 61,
        optimal: 18.0,
        optimal_rule: 'max',
        provenance: 'Marcador Redox e Sobrecarga Hepática',
        category: 'Hepático',
      },
    ],
  },
  {
    groupName: 'Renal & Eletrólitos',
    icon: '🩺',
    items: [
      {
        key: 'creatinine',
        name: 'Creatinina Sanguínea',
        unit: 'mg/dL',
        ref_min: 0.7,
        ref_max: 1.2,
        optimal: 0.7,
        optimal_max: 1.0,
        optimal_rule: 'range',
        provenance: 'Filtração Renal Preservada',
        category: 'Renal',
      },
      {
        key: 'cystatin_c',
        name: 'Cistatina C',
        unit: 'mg/L',
        ref_min: 0.6,
        ref_max: 1.0,
        optimal: 0.75,
        optimal_rule: 'max',
        provenance: 'Filtração Glomerular Independente de Massa Muscular',
        category: 'Renal',
      },
      {
        key: 'egfr',
        name: 'Taxa de Filtração Glomerular (eGFR)',
        unit: 'mL/min',
        ref_min: 90,
        ref_max: 120,
        optimal: 105.0,
        optimal_rule: 'min',
        provenance: 'Depuração Renal Otimizada (CKD-EPI)',
        category: 'Renal',
      },
      {
        key: 'urea',
        name: 'Ureia Sanguínea',
        unit: 'mg/dL',
        ref_min: 15,
        ref_max: 45,
        optimal: 20.0,
        optimal_max: 35.0,
        optimal_rule: 'range',
        provenance: 'Metabolismo Nitrogenado e Hidratação',
        category: 'Renal',
      },
    ],
  },
  {
    groupName: 'Cardiovascular & Lípides',
    icon: '🫀',
    items: [
      {
        key: 'apob',
        name: 'Apolipoproteína B (ApoB)',
        unit: 'mg/dL',
        ref_min: 60,
        ref_max: 130,
        optimal: 60.0,
        optimal_rule: 'max',
        provenance: 'ESC / AHA / Peter Attia — Prevenção Aterosclerótica Primária',
        category: 'Cardiovascular',
      },
      {
        key: 'apoa1',
        name: 'Apolipoproteína A1 (ApoA1)',
        unit: 'mg/dL',
        ref_min: 120,
        ref_max: 180,
        optimal: 150.0,
        optimal_rule: 'min',
        provenance: 'Proteção Ateroprotetora Reversa',
        category: 'Cardiovascular',
      },
      {
        key: 'lpa',
        name: 'Lipoproteína (a) [Lp(a)]',
        unit: 'nmol/L',
        ref_min: 0,
        ref_max: 75,
        optimal: 30.0,
        optimal_rule: 'max',
        provenance: 'NLA / EAS — Risco Genético Cardiovascular Menor',
        category: 'Cardiovascular',
      },
      {
        key: 'total_cholesterol',
        name: 'Colesterol Total',
        unit: 'mg/dL',
        ref_min: 125,
        ref_max: 200,
        optimal: 160.0,
        optimal_rule: 'max',
        provenance: 'Alvo Lipídico Ateroprotetor',
        category: 'Cardiovascular',
      },
      {
        key: 'ldl_cholesterol',
        name: 'Colesterol LDL',
        unit: 'mg/dL',
        ref_min: 70,
        ref_max: 130,
        optimal: 70.0,
        optimal_rule: 'max',
        provenance: 'AHA / ACC — Prevenção Cardiovascular Primária Agressiva',
        category: 'Cardiovascular',
      },
      {
        key: 'hdl_cholesterol',
        name: 'Colesterol HDL',
        unit: 'mg/dL',
        ref_min: 40,
        ref_max: 90,
        optimal: 60.0,
        optimal_rule: 'min',
        provenance: 'Capacidade de Efluxo de Colesterol',
        category: 'Cardiovascular',
      },
      {
        key: 'triglycerides',
        name: 'Triglicérides',
        unit: 'mg/dL',
        ref_min: 50,
        ref_max: 150,
        optimal: 80.0,
        optimal_rule: 'max',
        provenance: 'Homeostase de Quilomícrons e Remanescentes',
        category: 'Cardiovascular',
      },
    ],
  },
  {
    groupName: 'Tireoide & Vitaminas',
    icon: '💊',
    items: [
      {
        key: 'tsh',
        name: 'TSH (Tireoestimulante)',
        unit: 'uIU/mL',
        ref_min: 0.4,
        ref_max: 4.0,
        optimal: 1.0,
        optimal_max: 2.0,
        optimal_rule: 'range',
        provenance: 'Consenso Endocrinológico Funcional',
        category: 'Tireoide',
      },
      {
        key: 'free_t3',
        name: 'T3 Livre',
        unit: 'pg/mL',
        ref_min: 2.0,
        ref_max: 4.4,
        optimal: 3.0,
        optimal_max: 4.0,
        optimal_rule: 'range',
        provenance: 'Conversão Periférica Ativa',
        category: 'Tireoide',
      },
      {
        key: 'free_t4',
        name: 'T4 Livre',
        unit: 'ng/dL',
        ref_min: 0.8,
        ref_max: 1.8,
        optimal: 1.1,
        optimal_max: 1.5,
        optimal_rule: 'range',
        provenance: 'Eixo Tireoidiano Estável',
        category: 'Tireoide',
      },
      {
        key: 'vitamin_d',
        name: 'Vitamina D (25-OH-D)',
        unit: 'ng/mL',
        ref_min: 30,
        ref_max: 100,
        optimal: 45.0,
        optimal_max: 65.0,
        optimal_rule: 'range',
        provenance: 'Endocrine Society / Holick — Níveis Imunomoduladores',
        category: 'Vitaminas',
      },
      {
        key: 'vitamin_b12',
        name: 'Vitamina B12',
        unit: 'pg/mL',
        ref_min: 200,
        ref_max: 900,
        optimal: 650.0,
        optimal_rule: 'min',
        provenance: 'B12 Funcional & Proteção Mielínica',
        category: 'Vitaminas',
      },
      {
        key: 'magnesium',
        name: 'Magnésio Sanguíneo',
        unit: 'mg/dL',
        ref_min: 1.7,
        ref_max: 2.6,
        optimal: 2.2,
        optimal_rule: 'min',
        provenance: 'Homeostase Celular e Enzimática',
        category: 'Minerais',
      },
    ],
  },
  {
    groupName: 'Hematologia',
    icon: '🔬',
    items: [
      {
        key: 'mcv',
        name: 'Volume Corpuscular Médio (MCV)',
        unit: 'fL',
        ref_min: 80,
        ref_max: 100,
        optimal: 85.0,
        optimal_max: 92.0,
        optimal_rule: 'range',
        provenance: 'Morfologia Eritrocitária e Status de Metilação',
        category: 'Hematologia',
      },
      {
        key: 'rdw',
        name: 'Amplitude de Distribuição (RDW)',
        unit: '%',
        ref_min: 11.5,
        ref_max: 14.5,
        optimal: 12.2,
        optimal_rule: 'max',
        provenance: 'PhenoAge / Biomarcador Preditivo de Morbimortalidade',
        category: 'Hematologia',
      },
      {
        key: 'hemoglobin',
        name: 'Hemoglobina',
        unit: 'g/dL',
        ref_min: 13.5,
        ref_max: 17.5,
        optimal: 14.0,
        optimal_max: 16.5,
        optimal_rule: 'range',
        provenance: 'Capacidade de Oxigenação Fisiológica',
        category: 'Hematologia',
      },
      {
        key: 'platelets',
        name: 'Plaquetas',
        unit: '10^3/uL',
        ref_min: 150,
        ref_max: 450,
        optimal: 180.0,
        optimal_max: 280.0,
        optimal_rule: 'range',
        provenance: 'Hemostasia sem Trombocitose Inflamatória',
        category: 'Hematologia',
      },
    ],
  },
];

const MARKER_META_BY_KEY = new Map<string, MarkerMeta>(
  LAB_MARKERS_GROUPS.flatMap((group) => group.items.map((item) => [item.key, item] as const)),
);

export const getMarkerMeta = (metricKey: string) =>
  MARKER_META_BY_KEY.get(normalizeLabMetricKey(metricKey));

export const getMetricDisplayName = (lab: LabResult) =>
  getMarkerMeta(lab.metric_key)?.name ?? lab.metric_name;

/**
 * Avalia se o biomarcador atingiu o alvo ótimo preventivo de longevidade (U22-P1-25).
 * Respeita regras explícitas ('max', 'min', 'range', 'unavailable') configuradas no catálogo.
 */
export const isMarkerOptimal = (lab: LabResult): boolean => {
  if (lab.optimal_target === undefined || lab.optimal_target === null) return false;
  const meta = getMarkerMeta(lab.metric_key);
  const rule = meta?.optimal_rule ?? 'max';
  const val = Number(lab.value);
  if (isNaN(val)) return false;

  switch (rule) {
    case 'max':
      return val <= lab.optimal_target;
    case 'min':
      return val >= lab.optimal_target;
    case 'range': {
      const lower = meta?.optimal ?? lab.optimal_target;
      const upper = meta?.optimal_max ?? lab.optimal_target;
      return val >= lower && val <= upper;
    }
    case 'unavailable':
    default:
      return false;
  }
};

/**
 * Avalia se o biomarcador está dentro do intervalo clínico convencional do laboratório.
 */
export const isMarkerWithinClinicalRange = (lab: LabResult): boolean => {
  const meta = getMarkerMeta(lab.metric_key);
  const refMin = lab.ref_min ?? meta?.ref_min;
  const refMax = lab.ref_max ?? meta?.ref_max;
  const val = Number(lab.value);
  if (isNaN(val)) return false;

  const rule = meta?.optimal_rule ?? 'max';
  if (rule === 'max') {
    if (refMax != null && val > refMax) return false;
    return true;
  }
  if (rule === 'min') {
    if (refMin != null && val < refMin) return false;
    return true;
  }

  if (refMin != null && val < refMin) return false;
  if (refMax != null && val > refMax) return false;
  return true;
};

export type LabMarkerStatus = 'optimal' | 'in_clinical_range' | 'out_of_range' | 'not_eligible';

/**
 * Determina o status clínico e funcional discriminado do exame (U22-P1-22):
 * - 'optimal': dentro do alvo de longevidade preventiva.
 * - 'in_clinical_range': normal pelo laboratório de referência, porém fora do alvo ótimo preventivo.
 * - 'out_of_range': fora da referência laboratorial (requer atenção clínica).
 * - 'not_eligible': sem proveniência de laudo clínico verificado.
 */
export const getLabMarkerStatus = (lab: LabResult): LabMarkerStatus => {
  if (!isClinicallyEligibleLab(lab)) {
    return 'not_eligible';
  }
  if (isMarkerOptimal(lab)) {
    return 'optimal';
  }
  if (isMarkerWithinClinicalRange(lab)) {
    return 'in_clinical_range';
  }
  return 'out_of_range';
};

/**
 * Formata a representação textual do alvo ótimo de acordo com a regra.
 */
export const formatOptimalTargetText = (meta?: MarkerMeta, targetVal?: number): string => {
  if (!meta && targetVal == null) return 'N/D';
  const val = targetVal ?? meta?.optimal;
  const rule = meta?.optimal_rule ?? 'max';
  const unit = meta?.unit ? ` ${meta.unit}` : '';

  switch (rule) {
    case 'max':
      return `< ${val}${unit}`;
    case 'min':
      return `> ${val}${unit}`;
    case 'range':
      return `${meta?.optimal ?? val} – ${meta?.optimal_max ?? val}${unit}`;
    case 'unavailable':
    default:
      return `${val}${unit}`;
  }
};

const CLINICALLY_ELIGIBLE_RECORD_ORIGINS = new Set(['patient_lab', 'imported']);

export const isClinicallyEligibleLab = (lab: LabResult) =>
  CLINICALLY_ELIGIBLE_RECORD_ORIGINS.has(lab.record_origin ?? 'unverified');

export const recordOriginLabel = (origin?: string) => {
  switch (origin) {
    case 'patient_lab':
      return 'Resultado informado do laudo';
    case 'imported':
      return 'Resultado importado';
    case 'manual':
      return 'Entrada manual não verificada';
    case 'synthetic':
      return 'Dado sintético';
    case 'fixture':
      return 'Fixture de teste';
    case 'calculated':
      return 'Valor calculado';
    case 'demo':
      return 'Demonstração';
    default:
      return 'Proveniência não verificada';
  }
};

/** Prioridade dos destaques exibidos na linha/card do laudo (máx. 3). */
const HIGHLIGHT_PRIORITIES = ['glucose_mgdl', 'fasting_glucose', 'apob', 'testosterone_total', 'hscrp', 'hba1c'];

export const pickHighlights = (items: LabResult[], max = 3) =>
  [...items]
    .sort((a, b) => {
      const idxA = HIGHLIGHT_PRIORITIES.indexOf(normalizeLabMetricKey(a.metric_key));
      const idxB = HIGHLIGHT_PRIORITIES.indexOf(normalizeLabMetricKey(b.metric_key));
      return (idxA > -1 ? idxA : 99) - (idxB > -1 ? idxB : 99);
    })
    .slice(0, max);
