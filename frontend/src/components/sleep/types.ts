import React from 'react';
import { TimeRangeOption } from '../ui';

export interface DailyMetric {
  date_ref: string;
  steps?: number | null;
  sleep_minutes?: number | null;
  sleep_deep_min?: number | null;
  sleep_light_min?: number | null;
  sleep_rem_min?: number | null;
  sleep_awake_min?: number | null;
  sleep_start?: string | null;
  sleep_end?: string | null;
  rhr_bpm?: number | null;
  avg_hr_bpm?: number | null;
  hrv_ms?: number | null;
  readiness_score?: number | null;
  respiratory_rate_rpm?: number | null;
  source?: string | null;
  [key: string]: any;
}

export interface MonthlySleepSummary {
  monthKey: string;           // 'YYYY-MM'
  label: string;              // 'Setembro de 2026'
  shortLabel: string;         // 'Set/26'
  count: number;              // Quantidade de noites no mês
  avgTotal: number;           // Média em minutos
  avgDeep: number;
  avgRem: number;
  avgLight: number;
  avgAwake: number;
  avgHrv: number | null;
  avgRhr: number | null;
  avgRespRate: number | null;
  avgBedtime: string | null;  // '22:48'
  avgWakeTime: string | null; // '06:15'
  deepPct: number;
  remPct: number;
  lightPct: number;
  awakePct: number;
  efficiencyPct: number;
}

export const MONTH_NAMES_PT: Record<string, string> = {
  '01': 'Janeiro',
  '02': 'Fevereiro',
  '03': 'Março',
  '04': 'Abril',
  '05': 'Maio',
  '06': 'Junho',
  '07': 'Julho',
  '08': 'Agosto',
  '09': 'Setembro',
  '10': 'Outubro',
  '11': 'Novembro',
  '12': 'Dezembro',
};

export const SHORT_MONTH_NAMES_PT: Record<string, string> = {
  '01': 'Jan',
  '02': 'Fev',
  '03': 'Mar',
  '04': 'Abr',
  '05': 'Mai',
  '06': 'Jun',
  '07': 'Jul',
  '08': 'Ago',
  '09': 'Set',
  '10': 'Out',
  '11': 'Nov',
  '12': 'Dez',
};

export function formatMonthLabel(yearMonth: string): string {
  const parts = yearMonth.split('-');
  if (parts.length < 2) return yearMonth;
  const year = parts[0];
  const month = parts[1];
  const monthName = MONTH_NAMES_PT[month] || month;
  return `${monthName} de ${year}`;
}

export function formatShortMonthLabel(yearMonth: string): string {
  const parts = yearMonth.split('-');
  if (parts.length < 2) return yearMonth;
  const year = parts[0];
  const month = parts[1];
  const monthName = SHORT_MONTH_NAMES_PT[month] || month;
  return `${monthName}/${year.slice(2)}`;
}

export function formatMinutesToHHMM(mins: number | null | undefined): string {
  if (mins == null || isNaN(mins)) return '00:00';
  const total = Math.max(0, Math.round(mins));
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function formatMinutesToText(mins: number | null | undefined): string {
  if (mins == null || isNaN(mins)) return '—';
  const total = Math.max(0, Math.round(mins));
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

export function formatDatePtBr(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

// Extrai HH:MM e DD/MM/AAAA para exibição limpa e auditável
export function formatDateTimeDetails(isoStr: string | null | undefined): { time: string; date: string } {
  if (!isoStr) return { time: '—', date: '' };
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) {
      const m = isoStr.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
      if (m) {
        return { time: `${m[4]}:${m[5]}`, date: `${m[3]}/${m[2]}/${m[1]}` };
      }
      return { time: '—', date: '' };
    }
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return {
      time: `${hh}:${mm}`,
      date: `${day}/${month}/${year}`,
    };
  } catch {
    return { time: '—', date: '' };
  }
}

// Média circular de horários (suporta transição de meia-noite, ex: 23:30 e 00:30 -> média 00:00)
export function calculateCircularAverageTime(isoList: (string | null | undefined)[]): string | null {
  const valid = isoList.filter((s): s is string => !!s);
  if (valid.length === 0) return null;
  let sumSin = 0;
  let sumCos = 0;
  let count = 0;

  for (const iso of valid) {
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) continue;
      const mins = d.getHours() * 60 + d.getMinutes();
      const angle = (mins / 1440) * 2 * Math.PI;
      sumSin += Math.sin(angle);
      sumCos += Math.cos(angle);
      count++;
    } catch {
      continue;
    }
  }

  if (count === 0) return null;
  let avgAngle = Math.atan2(sumSin / count, sumCos / count);
  if (avgAngle < 0) avgAngle += 2 * Math.PI;
  const avgMins = Math.round((avgAngle / (2 * Math.PI)) * 1440) % 1440;
  const h = Math.floor(avgMins / 60);
  const m = avgMins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// Cálculo do Índice de Regularidade Circadiana do Sono (0-100%)
export function calculateSleepRegularity(records: DailyMetric[]): {
  score: number;
  label: string;
  badgeClass: string;
  stdBedtimeMin: number;
} {
  const validBedtimes = records
    .map(r => r.sleep_start)
    .filter((s): s is string => !!s)
    .map(iso => {
      try {
        const d = new Date(iso);
        if (isNaN(d.getTime())) return null;
        let mins = d.getHours() * 60 + d.getMinutes();
        if (mins < 720) mins += 1440;
        return mins;
      } catch {
        return null;
      }
    })
    .filter((v): v is number => v !== null);

  if (validBedtimes.length < 2) {
    return {
      score: 100,
      label: 'Consistente',
      badgeClass: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      stdBedtimeMin: 0,
    };
  }

  const mean = validBedtimes.reduce((a, b) => a + b, 0) / validBedtimes.length;
  const variance = validBedtimes.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / validBedtimes.length;
  const stdBedtimeMin = Math.round(Math.sqrt(variance));

  const score = Math.max(30, Math.min(100, Math.round(100 - (stdBedtimeMin / 120) * 50)));
  let label = 'Excelente';
  let badgeClass = 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20';

  if (score < 70) {
    label = 'Irregular';
    badgeClass = 'text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20';
  } else if (score < 85) {
    label = 'Moderada';
    badgeClass = 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20';
  }

  return { score, label, badgeClass, stdBedtimeMin };
}

// Eficiência do sono por noite (Tempo dormindo / Tempo total na cama)
export function calculateNightEfficiency(sleepMinutes?: number | null, awakeMinutes?: number | null): number | null {
  if (sleepMinutes == null || sleepMinutes <= 0) return null;
  const awake = awakeMinutes || 0;
  const timeInBed = sleepMinutes + awake;
  return timeInBed > 0 ? Math.round((sleepMinutes / timeInBed) * 100) : null;
}

export interface EfficiencyBadgeResult {
  pct: number;
  badgeClass: string;
  textClass: string;
  tag?: string;
  tagClass?: string;
  tooltip: string;
}

export function getEfficiencyBadge(
  eff: number | null | undefined,
  durationMinutes: number | null | undefined
): EfficiencyBadgeResult | null {
  if (eff == null || isNaN(eff)) return null;
  const duration = durationMinutes || 0;

  // Caso 1: Sono Curto (< 6h = 360 min) -> Risco de privação de sono
  if (duration < 360) {
    if (eff >= 85) {
      return {
        pct: eff,
        badgeClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30',
        textClass: 'text-amber-500 dark:text-amber-400',
        tag: 'Sono Curto',
        tagClass: 'bg-amber-500/25 text-amber-800 dark:text-amber-300 border border-amber-500/30',
        tooltip: `Eficiência mecânica de ${eff}%, porém com sono curto (< 6h: ${formatMinutesToText(duration)}). Alerta de privação de sono.`,
      };
    } else if (eff >= 75) {
      return {
        pct: eff,
        badgeClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30',
        textClass: 'text-amber-500 dark:text-amber-400',
        tag: 'Sono Curto',
        tagClass: 'bg-amber-500/25 text-amber-800 dark:text-amber-300 border border-amber-500/30',
        tooltip: `Eficiência moderada (${eff}%) e duração insuficiente (< 6h: ${formatMinutesToText(duration)}).`,
      };
    } else {
      return {
        pct: eff,
        badgeClass: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30',
        textClass: 'text-rose-500 dark:text-rose-400',
        tag: 'Crítico',
        tagClass: 'bg-rose-500/25 text-rose-700 dark:text-rose-300 border border-rose-500/30',
        tooltip: `Baixa eficiência (${eff}%) combinada com sono curto (< 6h: ${formatMinutesToText(duration)}). Fragmentação e privação de sono.`,
      };
    }
  }

  // Caso 2: Duração limítrofe (6h00 a 6h29 = 360 a 389 min)
  if (duration < 390) {
    if (eff >= 85) {
      return {
        pct: eff,
        badgeClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30',
        textClass: 'text-amber-500 dark:text-amber-400',
        tag: 'Parcial',
        tagClass: 'bg-amber-500/25 text-amber-800 dark:text-amber-300 border border-amber-500/30',
        tooltip: `Eficiência alta (${eff}%), porém duração abaixo da meta de 6h30 (${formatMinutesToText(duration)}).`,
      };
    } else if (eff >= 75) {
      return {
        pct: eff,
        badgeClass: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
        textClass: 'text-amber-500 dark:text-amber-400',
        tooltip: `Eficiência moderada (${eff}%) e duração parcial (${formatMinutesToText(duration)}).`,
      };
    } else {
      return {
        pct: eff,
        badgeClass: 'bg-rose-500/15 text-rose-600 dark:text-rose-400',
        textClass: 'text-rose-500 dark:text-rose-400',
        tooltip: `Baixa eficiência (${eff}%). Tempo excessivo acordado na cama.`,
      };
    }
  }

  // Caso 3: Duração adequada (>= 6h30 = 390 min)
  if (eff >= 85) {
    return {
      pct: eff,
      badgeClass: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
      textClass: 'text-emerald-500 dark:text-emerald-400',
      tooltip: `Excelente: Eficiência alta (${eff}%) e duração restauradora (>= 6h30: ${formatMinutesToText(duration)}).`,
    };
  } else if (eff >= 75) {
    return {
      pct: eff,
      badgeClass: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
      textClass: 'text-amber-500 dark:text-amber-400',
      tooltip: `Eficiência moderada (${eff}%) com duração adequada (${formatMinutesToText(duration)}).`,
    };
  } else {
    return {
      pct: eff,
      badgeClass: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30',
      textClass: 'text-rose-500 dark:text-rose-400',
      tag: 'Fragmentado',
      tagClass: 'bg-rose-500/25 text-rose-700 dark:text-rose-300 border border-rose-500/30',
      tooltip: `Baixa eficiência (${eff}%): sono fragmentado com frequentes interrupções na cama.`,
    };
  }
}

export type SleepChartRange = 'last20' | '30d' | '60d' | 'all';

export const SLEEP_CHART_RANGE_OPTIONS: TimeRangeOption<SleepChartRange>[] = [
  { value: 'last20', label: '20 registros', shortLabel: '20 reg', ariaLabel: 'Últimos 20 registros' },
  { value: '30d', label: '30 dias', shortLabel: '30d', ariaLabel: 'Últimos 30 dias (30d)' },
  { value: '60d', label: '60 dias', shortLabel: '60d', ariaLabel: 'Últimos 60 dias (60d)' },
  { value: 'all', label: 'Tudo', shortLabel: 'Tudo', ariaLabel: 'Todo o histórico' },
];
