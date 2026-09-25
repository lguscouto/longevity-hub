export type EventSignificance = 'normal' | 'notável' | 'significativa'

export type EventCategory =
  | 'exercise'
  | 'clinical'
  | 'intervention'
  | 'lifestyle'
  | 'symptom'
  | 'metric'

export interface HealthEvent {
  id: string
  timestamp: string
  date_ref: string
  time_ref?: string | null
  event_type: string
  category: EventCategory | string
  title: string
  description?: string | null
  source: string
  source_type: string
  source_id?: string | null
  source_key?: string | null
  confidence: 'low' | 'moderate' | 'high'
  significance: EventSignificance
  metadata: Record<string, any>
  is_pinned?: boolean
  created_at?: string
  updated_at?: string
}

export interface TimelineDaySummary {
  date_ref: string
  day_of_week: string
  display_date: string
  events: HealthEvent[]
  metrics_summary: {
    steps?: number | null
    sleep_minutes?: number | null
    rhr_bpm?: number | null
    hrv_ms?: number | null
    weight_kg?: number | null
    calories?: number | null
  }
}

export interface TimelineResponse {
  total: number
  items: HealthEvent[]
  days: TimelineDaySummary[]
}

export interface TimelineWeekSummary {
  week_start: string
  week_end: string
  title: string
  avg_sleep_min?: number | null
  avg_sleep_formatted?: string | null
  hrv_delta_pct?: number | null
  rhr_delta_bpm?: number | null
  training_load_delta_pct?: number | null
  workout_count: number
  key_events: HealthEvent[]
}

export interface TimelineMonthSummary {
  month_ref: string
  title: string
  weight_delta_kg?: number | null
  hrv_delta_pct?: number | null
  rhr_delta_bpm?: number | null
  sleep_delta_min?: number | null
  total_workouts: number
  active_interventions: string[]
  key_events_count: number
  key_events: HealthEvent[]
}

export interface HealthEventCreatePayload {
  timestamp?: string
  date_ref?: string
  time_ref?: string
  event_type: string
  category: string
  title: string
  description?: string
  source?: string
  confidence?: string
  significance?: EventSignificance
  metadata?: Record<string, any>
  is_pinned?: boolean
}

export interface BackfillStatusItem {
  source_type: string
  last_processed_id?: string | null
  last_processed_timestamp?: string | null
  total_records_processed: number
  status: string
  last_error?: string | null
  updated_at?: string | null
}
