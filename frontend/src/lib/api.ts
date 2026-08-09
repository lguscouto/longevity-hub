export class ApiError extends Error {
  readonly status: number
  readonly payload: unknown

  constructor(status: number, message: string, payload: unknown = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.payload = payload
  }
}

function extractMessage(payload: unknown): string | undefined {
  if (typeof payload === 'string') {
    const trimmed = payload.trim()
    return trimmed || undefined
  }

  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>
    const candidate = record.detail ?? record.message
    if (typeof candidate === 'string') {
      const trimmed = candidate.trim()
      return trimmed || undefined
    }
    if (Array.isArray(candidate) && candidate.length > 0) {
      const first = candidate[0]
      if (first && typeof first === 'object' && typeof (first as Record<string, unknown>).msg === 'string') {
        const msg = (first as Record<string, unknown>).msg as string
        return msg.trim() || undefined
      }
    }
  }

  return undefined
}

export async function requestJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init)
  const rawBody = await response.text()

  let payload: unknown = null
  if (rawBody) {
    try {
      payload = JSON.parse(rawBody) as unknown
    } catch {
      if (!response.ok) {
        throw new ApiError(response.status, extractMessage(rawBody) ?? 'Falha na operação.', rawBody)
      }

      throw new ApiError(response.status, 'Resposta inválida do servidor.', rawBody)
    }
  }

  if (!response.ok) {
    throw new ApiError(response.status, extractMessage(payload) ?? 'Falha na operação.', payload)
  }

  return payload as T
}
