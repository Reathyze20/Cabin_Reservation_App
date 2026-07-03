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
  timestamp?: string
}

// Some interceptors append a "(Kód chyby: X)" / "Kód chyby: X" suffix directly onto
// the raw message for consumers that render it as a plain string. The structured
// toast path renders the support code separately, so strip it here to avoid showing it twice.
function stripEmbeddedSupportCode(message: string | undefined): string | undefined {
  if (!message) return message
  return message.replace(/\s*\(?Kód chyby:\s*[^)]+\)?\s*$/, '').trim()
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
      message: stripEmbeddedSupportCode(responseBody?.message ?? error.message),
      status: error.response?.status ?? fallback.status,
      requestId,
      errorId,
      supportCode: errorId ?? requestId ?? fallback.supportCode,
      url: error.config?.url ?? fallback.url,
      method: error.config?.method?.toUpperCase() ?? fallback.method,
      timestamp: new Date().toISOString(),
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
      message: stripEmbeddedSupportCode(typeof record.message === 'string' ? record.message : fallback.message),
      requestId,
      errorId,
      supportCode,
      timestamp: new Date().toISOString(),
    }
  }

  return { ...fallback, timestamp: new Date().toISOString() }
}

export function appendSupportCode(message: string, error: unknown): string {
  const supportCode = extractSupportErrorDetails(error).supportCode
  if (!supportCode || message.includes('Kód chyby') || message.includes(supportCode)) {
    return message
  }

  return `${message} Kód chyby: ${supportCode}`
}

// ─── HTTP status → user-friendly Czech message ─────────────────────────────────

const STATUS_MESSAGES: Record<number, string> = {
  400: 'Neplatný požadavek — zkontrolujte zadaná data.',
  401: 'Přihlášení vypršelo — přihlaste se znovu.',
  403: 'Na tuto akci nemáte oprávnění.',
  404: 'Požadovaná data nebyla nalezena.',
  409: 'Konflikt — někdo jiný právě upravil stejná data.',
  413: 'Odesílaný soubor je příliš velký.',
  422: 'Neplatná data — zkontrolujte formulář.',
  429: 'Příliš mnoho požadavků — chvilku počkejte.',
  500: 'Chyba na serveru — zkuste to za chvíli.',
  502: 'Server je dočasně nedostupný.',
  503: 'Server je dočasně nedostupný.',
  504: 'Server neodpověděl včas — zkuste to znovu.',
}

/**
 * Vrátí srozumitelnou českou zprávu pro daný HTTP status kód.
 * Pokud status nemá mapování, vrátí fallback.
 */
export function getUserFriendlyMessage(
  status: number | undefined,
  fallback = 'Něco se pokazilo. Zkuste to prosím znovu.',
): string {
  if (!status) return fallback
  return STATUS_MESSAGES[status] ?? fallback
}

// ─── Clipboard-friendly support block ──────────────────────────────────────────

/**
 * Formátuje support details do textového bloku pro clipboard.
 * Zákazník to zkopíruje a pošle adminovi/vývojáři.
 */
export function formatSupportBlock(details: SupportErrorDetails): string {
  const lines: string[] = []

  if (details.supportCode) {
    lines.push(`Kód chyby: ${details.supportCode}`)
  }
  if (details.method && details.url) {
    lines.push(`Endpoint: ${details.method} ${details.url}`)
  }
  if (details.status) {
    lines.push(`Status: ${details.status}`)
  }

  const time = details.timestamp ?? new Date().toISOString()
  const formatted = new Date(time).toLocaleString('cs-CZ', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
  lines.push(`Čas: ${formatted}`)

  if (details.message) {
    lines.push(`Zpráva: ${details.message}`)
  }

  return lines.join('\n')
}