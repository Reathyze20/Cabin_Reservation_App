import axios from 'axios'
import { getLastApiCorrelation, getSupportCodeFromSnapshot } from '@/lib/observability'

interface ApiErrorBody {
  message?: string
  errorId?: string
  code?: string
}

export interface SupportErrorDetails {
  message?: string
  status?: number
  requestId?: string
  errorId?: string
  supportCode?: string
  url?: string
  method?: string
}

function readHeaderValue(headers: unknown, headerName: string): string | undefined {
  if (!headers || typeof headers !== 'object') return undefined

  const normalizedHeader = headerName.toLowerCase()
  const record = headers as Record<string, unknown>
  const directValue = record[normalizedHeader] ?? record[headerName]

  if (typeof directValue === 'string') return directValue
  if (Array.isArray(directValue)) {
    return directValue.find((item): item is string => typeof item === 'string')
  }

  return undefined
}

export function extractSupportErrorDetails(error: unknown): SupportErrorDetails {
  const lastApi = getLastApiCorrelation()
  const fallback: SupportErrorDetails = lastApi
    ? {
        status: lastApi.status,
        requestId: lastApi.requestId,
        errorId: lastApi.errorId,
        supportCode: getSupportCodeFromSnapshot(lastApi),
        url: lastApi.url,
        method: lastApi.method,
      }
    : {}

  if (axios.isAxiosError(error)) {
    const responseBody = error.response?.data as ApiErrorBody | undefined
    const requestId = readHeaderValue(error.response?.headers, 'x-request-id') ?? fallback.requestId
    const errorId = responseBody?.errorId ?? fallback.errorId

    return {
      message: responseBody?.message ?? error.message,
      status: error.response?.status ?? fallback.status,
      requestId,
      errorId,
      supportCode: errorId ?? requestId ?? fallback.supportCode,
      url: error.config?.url ?? fallback.url,
      method: error.config?.method?.toUpperCase() ?? fallback.method,
    }
  }

  if (error && typeof error === 'object') {
    const record = error as Record<string, unknown>
    const requestId = typeof record.requestId === 'string' ? record.requestId : fallback.requestId
    const errorId = typeof record.errorId === 'string' ? record.errorId : fallback.errorId
    const supportCode = typeof record.supportCode === 'string'
      ? record.supportCode
      : errorId ?? requestId ?? fallback.supportCode

    return {
      ...fallback,
      message: typeof record.message === 'string' ? record.message : fallback.message,
      requestId,
      errorId,
      supportCode,
    }
  }

  return fallback
}

export function appendSupportCode(message: string, error: unknown): string {
  const supportCode = extractSupportErrorDetails(error).supportCode
  if (!supportCode || message.includes('Kód chyby') || message.includes(supportCode)) {
    return message
  }

  return `${message} Kód chyby: ${supportCode}`
}