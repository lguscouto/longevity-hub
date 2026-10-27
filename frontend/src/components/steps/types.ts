import type { TimeRangeOption } from '../ui';

export interface StepDayRecord {
  date_ref: string;
  steps: number;
  goal: number;
  goal_met: boolean;
  distance_km: number;
  calories: number;
  walking_min: number;
  running_min: number;
  active_minutes: number;
  source: string;
  ma7_steps: number;
  status: 'above_goal' | 'near_goal' | 'below_goal';
  is_today_in_progress?: boolean;
}

export interface StepsSummary {
  total_days: number;
  total_steps: number;
  overall_avg_steps: number;
  max_steps: number;
  max_steps_date: string | null;
  min_steps: number;
  min_steps_date: string | null;
  current_streak_goal_days: number;
  best_streak_goal_days: number;
  days_above_goal: number;
  goal_completion_rate_pct: number;
  default_goal: number;
  total_calories: number;
  total_distance_km: number;
  avg_distance_km: number;
  total_active_minutes?: number;
  avg_active_minutes?: number;
  total_walking_min?: number;
  total_running_min?: number;
}

export interface WeeklyStepSummary {
  week_key: string;
  week_label: string;
  start_date: string;
  end_date: string;
  days_recorded: number;
  total_steps: number;
  avg_steps: number;
  goal_met_days: number;
  goal_hit_pct: number;
  max_steps: number;
  trend_vs_previous_pct: number | null;
}

export interface WeekdayAverage {
  weekday: number;
  day_name: string;
  short_name: string;
  avg_steps: number;
  days_count: number;
  goal_hit_pct: number;
}

export interface HourlyStepDistribution {
  hour: number;
  label: string;
  avg_steps: number;
}

export interface MonthlyStepSummary {
  month: string;
  month_label: string;
  days_recorded: number;
  total_steps: number;
  avg_steps: number;
  max_steps: number;
  max_steps_date: string | null;
  min_steps: number;
  goal_hit_days: number;
  goal_hit_pct: number;
  total_distance_km: number;
  total_calories: number;
  trend_vs_previous_month_pct: number | null;
}

export interface LongevityTier {
  tier: string;
  color: string;
  badge: string;
  message: string;
  target_range: string;
}

export interface StepsTrend {
  direction: 'improving' | 'stable' | 'declining';
  description: string;
  current_7d_avg: number;
  previous_7d_avg: number;
  delta_7d_pct: number;
  current_30d_avg: number;
  previous_30d_avg: number;
  delta_30d_pct: number;
  longevity_tier: LongevityTier;
}

export interface ZeppSyncInfo {
  last_sync: string | null;
  source: string;
  configured_goal: number;
  total_zepp_records: number;
  has_band_data: boolean;
}

export interface StepsAnalyticsResponse {
  summary: StepsSummary;
  weekly_stats: WeeklyStepSummary[];
  weekday_averages: WeekdayAverage[];
  hourly_distribution?: HourlyStepDistribution[];
  monthly_stats: MonthlyStepSummary[];
  trend: StepsTrend;
  zepp_sync_info: ZeppSyncInfo;
  daily_records: StepDayRecord[];
}

export type StepsChartRange = '7d' | '14d' | '30d' | '90d' | '6m' | '1y' | 'all';

export const STEPS_CHART_RANGE_OPTIONS: TimeRangeOption<StepsChartRange>[] = [
  { value: '7d', label: '7D' },
  { value: '14d', label: '14D' },
  { value: '30d', label: '30D' },
  { value: '90d', label: '90D' },
  { value: '6m', label: '6M' },
  { value: '1y', label: '1A' },
  { value: 'all', label: 'Tudo' },
];

export function formatStepNumber(val: number | null | undefined): string {
  if (val == null || Number.isNaN(val)) return '—';
  return new Intl.NumberFormat('pt-BR').format(Math.round(val));
}

export function formatDateBR(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
  } catch {
    // fallback
  }
  return dateStr;
}
