/**
 * formatters.ts
 * Utilitários centralizados de formatação para semântica temporal unificada,
 * distinção universal entre valor zero medido (0) e dado ausente (—),
 * e formatação de datas baseada no timezone do usuário.
 */

import { AbsenceKind, describeAbsence, formatLocalDateKey, formatConfidenceLabel } from './dataSemantics';

export { formatLocalDateKey, formatConfidenceLabel };

export interface FormatMetricOptions {
  decimals?: number;
  emptyFallback?: string;
  showUnitWhenEmpty?: boolean;
  absenceKind?: AbsenceKind;
  useAbsenceLabelAsDisplay?: boolean;
}

export interface MetricValueResult {
  displayValue: string;
  displayUnit: string | undefined;
  isNull: boolean;
  accessibleText: string;
  formattedString: string;
}

/**
 * Formata um valor numérico ou textual de métrica clínica/física.
 * Garante que valores nulos, vazios, undefined ou NaN recebam o fallback canônico '—'
 * (ou rótulo descritivo de ausência), enquanto zero real (0) é devidamente preservado e exibido como número medido.
 */
export function formatMetricValue(
  value: number | string | null | undefined,
  unit?: string,
  options: FormatMetricOptions = {}
): MetricValueResult {
  const {
    decimals,
    emptyFallback = '—',
    showUnitWhenEmpty = false,
    absenceKind,
    useAbsenceLabelAsDisplay = false,
  } = options;

  const absence = absenceKind ? describeAbsence(absenceKind) : null;
  const resolvedEmptyFallback = absence && useAbsenceLabelAsDisplay ? absence.label : emptyFallback;
  const accessibleFallback = absence ? absence.label : 'Não informado';

  // Verifica explicitamente ausência de dados vs medição zero
  if (value === null || value === undefined || value === '') {
    return {
      displayValue: resolvedEmptyFallback,
      displayUnit: showUnitWhenEmpty ? unit : undefined,
      isNull: true,
      accessibleText: accessibleFallback,
      formattedString: showUnitWhenEmpty && unit ? `${resolvedEmptyFallback} ${unit}` : resolvedEmptyFallback,
    };
  }

  const num = typeof value === 'number' ? value : Number(value);

  // Se string não puder ser convertida em número e não for vazia
  if (isNaN(num)) {
    if (typeof value === 'string' && value.trim().length > 0) {
      return {
        displayValue: value,
        displayUnit: unit,
        isNull: false,
        accessibleText: unit ? `${value} ${unit}` : value,
        formattedString: unit ? `${value} ${unit}` : value,
      };
    }
    return {
      displayValue: resolvedEmptyFallback,
      displayUnit: showUnitWhenEmpty ? unit : undefined,
      isNull: true,
      accessibleText: accessibleFallback,
      formattedString: showUnitWhenEmpty && unit ? `${resolvedEmptyFallback} ${unit}` : resolvedEmptyFallback,
    };
  }

  // Valor numérico válido (incluindo 0)
  const formattedNumber = decimals !== undefined ? num.toFixed(decimals) : num.toString();
  const separator = unit === '%' ? '' : ' ';
  const textWithUnit = unit ? `${formattedNumber}${separator}${unit}` : formattedNumber;

  return {
    displayValue: formattedNumber,
    displayUnit: unit,
    isNull: false,
    accessibleText: textWithUnit,
    formattedString: textWithUnit,
  };
}

/**
 * Atalho conveniente que retorna apenas a string final formatada.
 */
export function formatMetricValueString(
  value: number | string | null | undefined,
  unit?: string,
  options: FormatMetricOptions = {}
): string {
  return formatMetricValue(value, unit, options).formattedString;
}

/**
 * Formata uma data respeitando o timezone do navegador local do usuário (padrão pt-BR).
 */
export function formatDateUserTz(
  dateInput: string | Date | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!dateInput) return '—';

  try {
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) return '—';

    const defaultOptions: Intl.DateTimeFormatOptions = {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      ...options,
    };

    return new Intl.DateTimeFormat('pt-BR', defaultOptions).format(d);
  } catch {
    return '—';
  }
}

/**
 * Formata data e hora respeitando o timezone local do usuário.
 */
export function formatDateTimeUserTz(
  dateInput: string | Date | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!dateInput) return '—';

  try {
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) return '—';

    const defaultOptions: Intl.DateTimeFormatOptions = {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      ...options,
    };

    return new Intl.DateTimeFormat('pt-BR', defaultOptions).format(d);
  } catch {
    return '—';
  }
}

/**
 * Converte minutos para representação legível (ex: 75 -> '1h 15m', 0 -> '0m', null -> '—').
 */
export function formatMinutesToHoursAndMinutes(
  minutes: number | null | undefined
): string {
  if (minutes === null || minutes === undefined || isNaN(minutes)) {
    return '—';
  }

  const rounded = Math.round(minutes);
  if (rounded === 0) return '0m';

  const h = Math.floor(rounded / 60);
  const m = rounded % 60;

  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/**
 * Formata a data/hora da última sincronização para exibição amigável em tooltips e botões.
 * Ex: "hoje às 09:20", "ontem às 18:30" ou "05/10 às 14:20".
 */
export function formatLastSyncDisplay(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '';
  try {
    let d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (typeof dateInput === 'string' && dateInput.includes(' ') && !dateInput.includes('T')) {
      d = new Date(dateInput.replace(' ', 'T'));
    }
    if (isNaN(d.getTime())) return String(dateInput);

    const now = new Date();
    const isToday =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();

    const timeStr = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    if (isToday) {
      return `hoje às ${timeStr}`;
    }

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday =
      d.getDate() === yesterday.getDate() &&
      d.getMonth() === yesterday.getMonth() &&
      d.getFullYear() === yesterday.getFullYear();

    if (isYesterday) {
      return `ontem às ${timeStr}`;
    }

    const dateStr = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    return `${dateStr} às ${timeStr}`;
  } catch {
    return String(dateInput);
  }
}
