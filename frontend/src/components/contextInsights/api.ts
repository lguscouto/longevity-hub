import { requestJson } from '../../lib/api'
import type {
  BeforeAfterAnalysisResponse,
  ChangePointsResponse,
  ConfounderBalanceRequest,
  ConfounderReport,
  ContextExplanation,
  InsightFeedbackPayload,
  MetricChangePoint,
  PersonalAssociation,
  PersonalAssociationsResponse,
  SynthesizeResponse,
} from './types'

export async function fetchContextExplanation(
  metric: string,
  date: string,
  baselineDays = 30,
): Promise<ContextExplanation> {
  const params = new URLSearchParams({
    date,
    baseline_days: String(baselineDays),
  })
  return requestJson<ContextExplanation>(`/api/context/explain/${metric}?${params.toString()}`)
}

export async function synthesizeContextExplanation(
  metric: string,
  dateRef: string,
): Promise<SynthesizeResponse> {
  return requestJson<SynthesizeResponse>('/api/context/explain/synthesize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ metric, date_ref: dateRef }),
  })
}

export async function submitInsightFeedback(
  payload: InsightFeedbackPayload,
): Promise<{ status: string; feedback_id: string }> {
  return requestJson<{ status: string; feedback_id: string }>('/api/context/feedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export async function fetchPersonalAssociations(
  metric?: string,
  minConfidence?: string,
  minSamples = 1,
): Promise<PersonalAssociationsResponse> {
  const params = new URLSearchParams()
  if (metric) params.append('metric', metric)
  if (minConfidence) params.append('min_confidence', minConfidence)
  if (minSamples > 1) params.append('min_samples', String(minSamples))

  const qs = params.toString() ? `?${params.toString()}` : ''
  return requestJson<PersonalAssociationsResponse>(`/api/context/associations${qs}`)
}

export async function recomputePersonalAssociations(
  metric?: string,
): Promise<{ status: string; computed_count: number; items: any[] }> {
  const qs = metric ? `?metric=${encodeURIComponent(metric)}` : ''
  return requestJson<{ status: string; computed_count: number; items: any[] }>(
    `/api/context/associations/recompute${qs}`,
    {
      method: 'POST',
    }
  )
}

export async function fetchChangePoints(
  metric?: string,
  limit = 50,
): Promise<ChangePointsResponse> {
  const params = new URLSearchParams()
  if (metric) params.append('metric', metric)
  if (limit) params.append('limit', String(limit))

  const qs = params.toString() ? `?${params.toString()}` : ''
  return requestJson<ChangePointsResponse>(`/api/context/change-points${qs}`)
}

export async function triggerChangePointDetection(
  metric?: string,
): Promise<{ status: string; detected_count: number; projected_to_timeline: number; items: any[] }> {
  const qs = metric ? `?metric=${encodeURIComponent(metric)}` : ''
  return requestJson<{ status: string; detected_count: number; projected_to_timeline: number; items: any[] }>(
    `/api/context/change-points/detect${qs}`,
    {
      method: 'POST',
    }
  )
}

export async function fetchNOf1Confounders(
  experimentId: number,
): Promise<ConfounderReport> {
  return requestJson<ConfounderReport>(`/api/context/n-of-1/${experimentId}/confounders`)
}

export async function fetchBeforeAfterIntervention(
  interventionId: number,
  daysBefore = 30,
  daysAfter = 30,
): Promise<BeforeAfterAnalysisResponse> {
  const params = new URLSearchParams({
    days_before: String(daysBefore),
    days_after: String(daysAfter),
  })
  return requestJson<BeforeAfterAnalysisResponse>(`/api/context/before-after/${interventionId}?${params.toString()}`)
}

export async function calculateCustomConfounders(
  payload: ConfounderBalanceRequest,
): Promise<ConfounderReport> {
  return requestJson<ConfounderReport>('/api/context/confounders/balance', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}



