import { requestJson } from '../../lib/api'
import type {
  BackfillStatusItem,
  HealthEvent,
  HealthEventCreatePayload,
  TimelineMonthSummary,
  TimelineResponse,
  TimelineWeekSummary,
} from './types'

export interface TimelineFilters {
  startDate?: string
  endDate?: string
  category?: string
  eventType?: string
  source?: string
  significance?: string
  limit?: number
  offset?: number
}

export async function fetchTimelineFeed(filters: TimelineFilters = {}): Promise<TimelineResponse> {
  const params = new URLSearchParams()
  if (filters.startDate) params.set('start_date', filters.startDate)
  if (filters.endDate) params.set('end_date', filters.endDate)
  if (filters.category) params.set('category', filters.category)
  if (filters.eventType) params.set('event_type', filters.eventType)
  if (filters.source) params.set('source', filters.source)
  if (filters.significance) params.set('significance', filters.significance)
  if (filters.limit) params.set('limit', String(filters.limit))
  if (filters.offset) params.set('offset', String(filters.offset))

  const qs = params.toString()
  return requestJson<TimelineResponse>(`/api/timeline${qs ? `?${qs}` : ''}`)
}

export async function fetchWeeklySummaries(startDate?: string, endDate?: string, limitWeeks = 8): Promise<TimelineWeekSummary[]> {
  const params = new URLSearchParams()
  if (startDate) params.set('start_date', startDate)
  if (endDate) params.set('end_date', endDate)
  params.set('limit_weeks', String(limitWeeks))
  return requestJson<TimelineWeekSummary[]>(`/api/timeline/summary/weekly?${params.toString()}`)
}

export async function fetchMonthlySummaries(limitMonths = 6): Promise<TimelineMonthSummary[]> {
  return requestJson<TimelineMonthSummary[]>(`/api/timeline/summary/monthly?limit_months=${limitMonths}`)
}

export async function createHealthEvent(payload: HealthEventCreatePayload): Promise<HealthEvent> {
  return requestJson<HealthEvent>('/api/timeline/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export async function updateHealthEvent(id: string, payload: Partial<HealthEventCreatePayload>): Promise<HealthEvent> {
  return requestJson<HealthEvent>(`/api/timeline/events/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export async function deleteHealthEvent(id: string): Promise<void> {
  await requestJson<{ status: string }>(`/api/timeline/events/${id}`, {
    method: 'DELETE',
  })
}

export async function triggerTimelineReconcile(): Promise<{
  status: string
  workouts_projected: number
  labs_projected: number
  supplements_projected: number
  manual_entries_projected: number
  total_health_events: number
}> {
  return requestJson('/api/timeline/reconcile', {
    method: 'POST',
  })
}

export async function fetchReconcileStatus(): Promise<BackfillStatusItem[]> {
  return requestJson<BackfillStatusItem[]>('/api/timeline/reconcile/status')
}

export async function syncUserTimezone(timezone: string): Promise<void> {
  await requestJson('/api/timeline/timezone', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ timezone }),
  })
}
