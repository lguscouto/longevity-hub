import React from 'react';
import {
  Activity,
  Cpu,
  Sparkles,
  Stethoscope,
  AlertTriangle,
  ArrowRightCircle,
  LucideIcon,
} from 'lucide-react';

/**
 * dataSemantics.ts
 * Núcleo de governança de semântica de dados, epistemologia clínica e taxonomia de ausência.
 * Implementa as diretrizes do Master UX/UI 2.1.0 (§14, §40-§47, §75-§78, §109-§110, UX_UI_43).
 */

// ---------------------------------------------------------------------------
// 1. Camada Epistemológica (Natureza da Fonte de Dados)
// ---------------------------------------------------------------------------

export type SourceKind =
  | 'observed'    // Medição direta aferida por sensor wearable ou laudo laboratorial
  | 'model'       // Projeção algorítmica matemática validada (ex: Morgan Levine, KDM, VO₂ máx)
  | 'inference'   // Síntese contextual, hipótese ou correlação derivada por Inteligência Artificial
  | 'clinical'    // Faixa ou parâmetro populacional normativo estabelecido por diretrizes médicas
  | 'warning'     // Sinalização de atenção clínica ou desvio relevante
  | 'action';     // Conduta operacional ou recomendação prática orientada

export interface SourceTagConfig {
  kind: SourceKind;
  label: string;
  shortLabel: string;
  description: string;
  tooltip: string;
  ariaLabel: string;
  icon: LucideIcon;
  badgeClass: string;
  iconClass: string;
}

export const SOURCE_CONFIGS: Record<SourceKind, SourceTagConfig> = {
  observed: {
    kind: 'observed',
    label: 'Dado Observado',
    shortLabel: 'Observado',
    description: 'Medição biométrica direta aferida por sensor wearable homologado ou laudo laboratorial comprovado.',
    tooltip: 'Dado medido diretamente por sensor ou laudo físico, sem modelagem estatística',
    ariaLabel: 'Natureza do dado: Dado Observado diretamente',
    icon: Activity,
    badgeClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25',
    iconClass: 'text-emerald-600 dark:text-emerald-400',
  },
  model: {
    kind: 'model',
    label: 'Modelo Matemático',
    shortLabel: 'Modelo',
    description: 'Estimativa algorítmica baseada em modelos matemáticos e biomarcadores biológicos validados na literatura.',
    tooltip: 'Projeção algorítmica matemática validada (ex: Morgan Levine 2018, Klemera-Doubal)',
    ariaLabel: 'Natureza do dado: Estimativa baseada em Modelo Matemático',
    icon: Cpu,
    badgeClass: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/25',
    iconClass: 'text-cyan-600 dark:text-cyan-400',
  },
  inference: {
    kind: 'inference',
    label: 'Inferência de IA',
    shortLabel: 'Inferência',
    description: 'Análise contextual, correlação estatística hipotética ou síntese gerada por Inteligência Artificial.',
    tooltip: 'Correlação contextual ou síntese interpretativa de IA — requer validação clínica',
    ariaLabel: 'Natureza do dado: Inferência interpretativa por Inteligência Artificial',
    icon: Sparkles,
    badgeClass: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/25',
    iconClass: 'text-indigo-600 dark:text-indigo-400',
  },
  clinical: {
    kind: 'clinical',
    label: 'Referência Clínica',
    shortLabel: 'Clínico',
    description: 'Parâmetro de referência clínica ou faixa populacional definida por sociedades médicas especializadas.',
    tooltip: 'Intervalo de referência clínico padronizado por diretrizes de saúde',
    ariaLabel: 'Natureza do dado: Referência Clínica estabelecida',
    icon: Stethoscope,
    badgeClass: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/25',
    iconClass: 'text-sky-600 dark:text-sky-400',
  },
  warning: {
    kind: 'warning',
    label: 'Atenção Clínica',
    shortLabel: 'Atenção',
    description: 'Valor com desvio relevante ou necessidade de atenção e verificação no protocolo preventivo.',
    tooltip: 'Alerta sobre desvio fora do padrão ou limite de segurança funcional',
    ariaLabel: 'Natureza do dado: Alerta de Atenção Clínica',
    icon: AlertTriangle,
    badgeClass: 'bg-amber-500/10 text-amber-800 dark:text-amber-200 border-amber-500/30',
    iconClass: 'text-amber-600 dark:text-amber-400',
  },
  action: {
    kind: 'action',
    label: 'Ação Recomendada',
    shortLabel: 'Ação',
    description: 'Sugestão prática, intervenção comportamental ou conduta operacional recomendada.',
    tooltip: 'Passo prático sugerido para otimização da longevidade',
    ariaLabel: 'Natureza do dado: Ação Prática Recomendada',
    icon: ArrowRightCircle,
    badgeClass: 'bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/25',
    iconClass: 'text-violet-600 dark:text-violet-400',
  },
};

export function getSourceConfig(kind: SourceKind): SourceTagConfig {
  return SOURCE_CONFIGS[kind] ?? SOURCE_CONFIGS.observed;
}

// ---------------------------------------------------------------------------
// 2. Taxonomia dos 6 Estados de Ausência de Dados
// ---------------------------------------------------------------------------

export type AbsenceKind =
  | 'no_data'        // Sem dados (nenhuma medição no intervalo de tempo selecionado)
  | 'unmonitored'    // Não monitorado (parâmetro não rastreado por sensor ativo ou configuração)
  | 'uncomputable'   // Não calculável (insumos mínimos incompletos para o algoritmo)
  | 'unsynced'       // Não sincronizado (sensor pareado sem upload recente de pacotes)
  | 'stale'          // Desatualizado (medição expirada ou além do horizonte de validade clínica)
  | 'error';         // Erro de leitura (falha técnica na captura, validação ou transmissão)

export interface AbsenceDescription {
  kind: AbsenceKind;
  label: string;
  shortLabel: string;
  description: string;
  actionSuggestion: string;
  badgeClass: string;
}

export const ABSENCE_DESCRIPTIONS: Record<AbsenceKind, AbsenceDescription> = {
  no_data: {
    kind: 'no_data',
    label: 'Sem dados',
    shortLabel: 'Sem dados',
    description: 'Nenhum registro biométrico encontrado para a data ou período selecionado.',
    actionSuggestion: 'Cadastre um registro manual ou sincronize seu dispositivo vestível.',
    badgeClass: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20',
  },
  unmonitored: {
    kind: 'unmonitored',
    label: 'Não monitorado',
    shortLabel: 'Inativo',
    description: 'Este biomarcador não está configurado para monitoramento contínuo nas preferências.',
    actionSuggestion: 'Conecte um dispositivo compatível ou ative o monitoramento no seu perfil.',
    badgeClass: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20',
  },
  uncomputable: {
    kind: 'uncomputable',
    label: 'Não calculável',
    shortLabel: 'Incompleto',
    description: 'Insumos necessários insuficientes para processar o modelo matemático com rigor.',
    actionSuggestion: 'Adicione os biomarcadores laboratoriais faltantes para viabilizar o cálculo.',
    badgeClass: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25',
  },
  unsynced: {
    kind: 'unsynced',
    label: 'Não sincronizado',
    shortLabel: 'Pendente',
    description: 'Dispositivo vestível pareado, mas sem transmissão recente de pacotes de dados.',
    actionSuggestion: 'Abra o aplicativo Zepp ou Health Connect para disparar a sincronização.',
    badgeClass: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/25',
  },
  stale: {
    kind: 'stale',
    label: 'Desatualizado',
    shortLabel: 'Antigo',
    description: 'A última medição registrada ultrapassou a janela temporal recomendada para esta análise.',
    actionSuggestion: 'Realize uma nova aferição ou anexe seu exame laboratorial mais recente.',
    badgeClass: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/25',
  },
  error: {
    kind: 'error',
    label: 'Erro de leitura',
    shortLabel: 'Falha',
    description: 'Houve uma falha técnica na captura, validação ou integridade do pacote de dados.',
    actionSuggestion: 'Tente recarregar ou verifique os logs de sincronização do conector.',
    badgeClass: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/25',
  },
};

export function describeAbsence(kind: AbsenceKind): AbsenceDescription {
  return ABSENCE_DESCRIPTIONS[kind] ?? ABSENCE_DESCRIPTIONS.no_data;
}

// ---------------------------------------------------------------------------
// 3. Semântica Temporal e Frescor do Dado (Master §75)
// ---------------------------------------------------------------------------

export interface DataFreshness {
  text: string;
  isStale: boolean;
  daysDifference: number | null;
  statusTone: 'fresh' | 'moderate' | 'stale';
}

export interface DataFreshnessOptions {
  isHistorical?: boolean;
  staleThresholdHours?: number;
}

/**
 * Retorna a chave de data no fuso horário local no padrão ISO (AAAA-MM-DD).
 * Previne inconsistências de virada de dia causadas por `new Date().toISOString().slice(0, 10)`
 * em fusos com offset negativo (ex: Brasil UTC-3 entre 21h e 23h59).
 */
export function formatLocalDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Formata o nível de confiança técnica em linguagem canônica em português.
 * Evita exibir termos crus como "high", "medium", "low" (U22-P1-15).
 */
export function formatConfidenceLabel(confidence: string | null | undefined, detailed = false): string {
  switch ((confidence || '').toLowerCase()) {
    case 'high':
      return detailed ? 'Alta confiança' : 'Alta';
    case 'medium':
      return detailed ? 'Média confiança' : 'Média';
    case 'low':
      return detailed ? 'Baixa confiança' : 'Baixa';
    case 'unavailable':
    default:
      return detailed ? 'Dados insuficientes' : 'Indisponível';
  }
}

/**
 * Limiares canônicos de estagnação de dados (U22-P1-56).
 */
export const STALE_THRESHOLDS = {
  WEARABLE_HOURS: 24, // Sincronização contínua de wearables (>24h sem dados é stale)
  CLINICAL_DAYS: 7,   // Check-in e métricas clínicas longitudinais (>=7 dias é stale)
} as const;

/**
 * Avalia se uma sincronização está desatualizada com base no limiar especificado.
 */
export function evaluateSyncStale(
  lastSyncDate: string | Date | null | undefined,
  thresholdHours: number = STALE_THRESHOLDS.WEARABLE_HOURS
): boolean {
  if (!lastSyncDate) return false;
  const syncTime = typeof lastSyncDate === 'string' ? new Date(lastSyncDate).getTime() : lastSyncDate.getTime();
  if (isNaN(syncTime)) return false;
  const diffHours = (Date.now() - syncTime) / (1000 * 60 * 60);
  return diffHours > thresholdHours;
}

/**
 * Avalia o frescor de uma data de registro e retorna rótulo padronizado.
 * - Hoje: "Atualizado hoje" (fresh)
 * - Ontem: "Atualizado ontem" (fresh)
 * - 2 a 6 dias: "Atualizado há X dias" (moderate)
 * - >= 7 dias: "Dados desatualizados (há X dias)" (stale)
 * - Histórico: se explicitamente marcado como histórico, não rotula como desatualizado.
 */
export function formatDataFreshness(
  dateInput: string | Date | null | undefined,
  options?: DataFreshnessOptions
): DataFreshness {
  if (!dateInput) {
    return {
      text: 'Sem registro de atualização',
      isStale: false,
      daysDifference: null,
      statusTone: 'fresh',
    };
  }

  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    let eventDay: Date;
    if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
      const [year, month, day] = dateInput.split('-').map(Number);
      eventDay = new Date(year, month - 1, day);
    } else {
      const targetDate = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
      if (isNaN(targetDate.getTime())) {
        return {
          text: 'Data inválida',
          isStale: false,
          daysDifference: null,
          statusTone: 'fresh',
        };
      }
      eventDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
    }

    const diffMs = today.getTime() - eventDay.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (options?.isHistorical && diffDays > 0) {
      return {
        text: 'Registro histórico',
        isStale: false,
        daysDifference: diffDays,
        statusTone: 'fresh',
      };
    }

    if (diffDays <= 0) {
      return {
        text: 'Atualizado hoje',
        isStale: false,
        daysDifference: 0,
        statusTone: 'fresh',
      };
    }

    if (diffDays === 1) {
      return {
        text: 'Atualizado ontem',
        isStale: false,
        daysDifference: 1,
        statusTone: 'fresh',
      };
    }

    const isStaleByHours =
      options?.staleThresholdHours !== undefined &&
      diffMs / (1000 * 60 * 60) >= options.staleThresholdHours;

    if (isStaleByHours || diffDays >= 7) {
      return {
        text: `Dados desatualizados (há ${diffDays} dias)`,
        isStale: true,
        daysDifference: diffDays,
        statusTone: 'stale',
      };
    }

    if (diffDays < 7) {
      return {
        text: `Atualizado há ${diffDays} dias`,
        isStale: false,
        daysDifference: diffDays,
        statusTone: 'moderate',
      };
    }

    return {
      text: `Dados desatualizados (há ${diffDays} dias)`,
      isStale: true,
      daysDifference: diffDays,
      statusTone: 'stale',
    };
  } catch {
    return {
      text: 'Sem registro de atualização',
      isStale: false,
      daysDifference: null,
      statusTone: 'fresh',
    };
  }
}
