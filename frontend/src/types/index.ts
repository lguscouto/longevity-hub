export interface WorkoutSet {
  id: string
  exercise_id: string
  workout_id: string
  set_index: number
  set_type: 'warmup' | 'normal' | 'drop_set' | 'failure' | string
  weight_kg: number
  reps: number
  distance_meters?: number | null
  duration_seconds?: number | null
  rpe?: number | null
}

export interface ExerciseMedia {
  catalog_id: string
  name: string
  category?: string
  body_part?: string
  body_part_pt?: string
  target?: string
  target_pt?: string
  equipment?: string
  equipment_pt?: string
  secondary_muscles?: string[]
  instructions?: Record<string, string[] | string>
  image_url?: string
  image_fallback?: string
  gif_url?: string
  gif_fallback?: string
  media_id?: string
}

export interface WorkoutExercise {
  id: string
  workout_id: string
  exercise_index: number
  title: string
  exercise_template_id?: string | null
  notes?: string | null
  sets?: WorkoutSet[]
  media?: ExerciseMedia | null
}

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
  title?: string | null
  volume_kg?: number | null
  sets_count?: number | null
  reps_count?: number | null
  exercises?: WorkoutExercise[]
}

export interface WorkoutsSummary {
  total_workouts: number
  hevy_workouts: number
  zepp_workouts: number
  total_volume_kg: number
  total_duration_min: number
  total_calories: number
  total_sets: number
  total_reps: number
  avg_hr: number
}

export interface HevyUser {
  id: string
  name: string
  url?: string
}

export interface HevyStatus {
  connected: boolean
  has_api_key: boolean
  masked_api_key?: string | null
  user?: HevyUser | null
  error?: string | null
}
