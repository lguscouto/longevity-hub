export interface FactorAttribution {
  factor_key: string
  factor_name: string
  strength: 'forte' | 'moderada' | 'fraca'
  strength_score: number
  summary: string
  window_hours: number
  event_id?: string | null
  event_title?: string | null
  event_timestamp?: string | null
  personal_evidence?: string | null
  personal_stats?: {
    sample_size: number
    mean_delta_pct: number
    cohens_d?: number | null
    shrinkage_factor: number
    confidence: string
    feedback_balance?: number
  } | null
  details?: Record<string, any>
}

export interface PersonalAssociation {
  id: string
  target_metric: string
  factor: string
  factor_name: string
  window_hours: number
  sample_size: number
  effect_size?: number | null
  mean_delta_pct?: number | null
  correlation?: number | null
  shrinkage_factor: number
  confidence: 'low' | 'moderate' | 'high'
  data_coverage_pct?: number | null
  user_feedback_balance: number
  headline: string
  evidence_text: string
  first_observation_at?: string | null
  last_observation_at?: string | null
  metadata?: Record<string, any>
  created_at?: string | null
  updated_at?: string | null
}

export interface PersonalAssociationsResponse {
  total: number
  items: PersonalAssociation[]
  last_calculated_at?: string | null
}

export interface MetricChangePoint {
  id: string
  metric: string
  metric_name: string
  unit: string
  timestamp: string
  date_ref: string
  baseline_value: number
  observed_value: number
  delta_absolute: number
  delta_percent: number
  robust_z_score?: number | null
  significance: 'notável' | 'significativa'
  detection_method: string
  persisted_days: number
  headline: string
  description: string
  metadata?: Record<string, any>
  created_at?: string | null
}

export interface ChangePointsResponse {
  total: number
  items: MetricChangePoint[]
}

export interface ContextExplanation {
  metric: string
  metric_name: string
  unit: string
  target_date: string
  observed_value: number
  baseline_value: number
  delta_absolute: number
  delta_percent: number
  robust_z_score: number
  significance: 'normal' | 'notável' | 'significativa'
  analysis_confidence: 'baixa' | 'moderada' | 'alta'
  data_coverage_days: number
  total_baseline_days: number
  factors: FactorAttribution[]
  summary_headline: string
  structured_explanation: string
  disclaimer: string
  provenance: Record<string, any>
}

export interface InsightFeedbackPayload {
  metric: string
  date_ref: string
  is_helpful: boolean
  factor_key?: string
  user_rating?: string
  user_notes?: string
  additional_context?: string
  insight_id?: string
}

export interface SynthesizeResponse {
  text: string
  is_ai_generated: boolean
  provider?: string | null
  model?: string | null
  note?: string | null
}

export interface CovariateItem {
  key: string
  name: string
  category: 'substance' | 'exercise' | 'routine' | 'supplement' | 'sleep' | string
  control_mean: number
  treatment_mean: number
  unit: string
  delta_pct: number
  standardized_diff: number
  is_imbalanced: boolean
  control_raw?: Record<string, any> | null
  treatment_raw?: Record<string, any> | null
  detail_text?: string | null
}

export interface ConfounderReport {
  experiment_id?: number | null
  intervention_id?: number | null
  control_period: {
    start: string
    end: string
    days: number
  }
  treatment_period: {
    start: string
    end: string
    days: number
  }
  covariates: CovariateItem[]
  has_severe_confounding: boolean
  imbalanced_factors_count: number
  warning_summary: string
  disclaimer: string
}

export interface ConfounderBalanceRequest {
  control_start: string
  control_end: string
  treatment_start: string
  treatment_end: string
  experiment_id?: number | null
}

export interface BeforeAfterAnalysisResponse {
  intervention_id: number
  intervention_name: string
  category: string
  start_date: string
  end_date?: string | null
  target_metric?: string | null
  target_metric_name?: string | null
  control_period: {
    start: string
    end: string
    days_count: number
    observations_count: number
  }
  treatment_period: {
    start: string
    end: string
    days_count: number
    observations_count: number
  }
  metric_comparison?: {
    control_mean: number
    treatment_mean: number
    diff_mean: number
    diff_pct: number
    cohens_d: number
    p_value: number
    statistically_significant: boolean
    effect_interpretation: string
  } | null
  confounder_report: ConfounderReport
}

