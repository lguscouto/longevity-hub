export interface WorkoutSession {
  id: string
  workout_date: string
  workout_time: string
  category: string
  activity_type: string
  duration_min: number
  calories: number
  distance_km: number
  avg_hr?: number | null
  max_hr?: number | null
  training_effect?: number | null
  steps?: number | null
  city?: string | null
  device?: string | null
  raw_json?: string | null
  source?: string | null
}
