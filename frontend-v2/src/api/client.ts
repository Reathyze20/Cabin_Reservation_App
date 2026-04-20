/**
 * api/client.ts — Axios instance with JWT interceptor
 * Replaces authFetch() from lib/common.ts
 */
import axios from 'axios'
import { showToast } from '@/lib/toast'
import { rememberApiCorrelation } from '@/lib/observability'

interface AuthErrorPayload {
  code?: string
  message?: string
  errorId?: string
}

const ACCOUNT_BANNED_CODE = 'ACCOUNT_BANNED'

type CorrelatableError = Error & {
  requestId?: string
  errorId?: string
  supportCode?: string
}

// ─── Helper: reads token from sessionStorage first, then localStorage ──────────
function getToken(): string | null {
  return sessionStorage.getItem('authToken') ?? localStorage.getItem('authToken')
}

// ─── Helper: reads active cabin ID (set by AuthContext on login/cabin switch) ──
function getActiveCabinId(): string | null {
  return (
    localStorage.getItem('activeCabinId') ??
    sessionStorage.getItem('activeCabinId') ??
    localStorage.getItem('cabinId') ??
    sessionStorage.getItem('cabinId') ??
    null
  )
}

function shouldIgnoreAuthExpiry(url?: string): boolean {
  if (!url) return false

  return ['/login', '/register', '/verify-token', '/verify-email', '/forgot-password', '/reset-password', '/reset-password-token'].some((path) => url.includes(path))
}

function clearStoredAuthState(): void {
  const savedTheme = localStorage.getItem('theme')

  ;['authToken', 'username', 'userId', 'role', 'animalIcon', 'cabinId', 'activeCabinId', 'isSuperAdmin'].forEach((key) => {
    localStorage.removeItem(key)
    sessionStorage.removeItem(key)
  })

  localStorage.removeItem('cabinFeatures')
  localStorage.removeItem('cabinWinterized')

  if (savedTheme) {
    localStorage.setItem('theme', savedTheme)
  }
}

// ─── Axios instance ────────────────────────────────────────────────────────────
export const apiClient = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

function readHeaderValue(headers: unknown, headerName: string): string | undefined {
  if (!headers || typeof headers !== 'object') return undefined

  const normalizedHeader = headerName.toLowerCase()
  const record = headers as Record<string, unknown>
  const value = record[normalizedHeader] ?? record[headerName]

  if (typeof value === 'string') return value
  if (Array.isArray(value)) {
    return value.find((item): item is string => typeof item === 'string')
  }

  return undefined
}

function decorateErrorWithSupportCode(error: unknown, requestId?: string, errorId?: string): void {
  if (!error || typeof error !== 'object') return

  const supportCode = errorId ?? requestId
  const target = error as CorrelatableError

  if (requestId) target.requestId = requestId
  if (errorId) target.errorId = errorId
  if (supportCode) target.supportCode = supportCode

  if (supportCode && typeof target.message === 'string' && !target.message.includes('Kód chyby')) {
    target.message = `${target.message} (Kód chyby: ${supportCode})`
  }
}

function appendSupportCodeToPayload(payload: AuthErrorPayload | undefined, supportCode?: string): void {
  if (!payload?.message || !supportCode || payload.message.includes('Kód chyby')) return
  payload.message = `${payload.message} Kód chyby: ${supportCode}`
}

// ─── Request interceptor: attach JWT token + active cabin header ──────────────
apiClient.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  const cabinId = getActiveCabinId()
  if (cabinId) {
    config.headers['X-Cabin-Id'] = cabinId
  }
  return config
})

// ─── Response interceptor: handle 401 and network errors globally ────────────
let lastNetworkErrorToast = 0
apiClient.interceptors.response.use(
  (response) => {
    rememberApiCorrelation({
      requestId: readHeaderValue(response.headers, 'x-request-id'),
      status: response.status,
      method: response.config.method?.toUpperCase(),
      url: response.config.url,
    })

    return response
  },
  (error) => {
    // Network/SSL errors — no response at all
    if (!error.response && (error.code === 'ERR_NETWORK' || error.message?.includes('Network Error'))) {
      const now = Date.now()
      // Throttle: show toast max once per 10 seconds to avoid spam
      if (now - lastNetworkErrorToast > 10_000) {
        lastNetworkErrorToast = now
        showToast('Chyba připojení k serveru. Zkontrolujte internet.', 'error')
      }
      return Promise.reject(error)
    }

    const responseData = error.response?.data as AuthErrorPayload | undefined
    const requestId = readHeaderValue(error.response?.headers, 'x-request-id')
    const errorId = responseData?.errorId
    const supportCode = errorId ?? requestId

    rememberApiCorrelation({
      requestId,
      errorId,
      status: error.response?.status,
      method: error.config?.method?.toUpperCase(),
      url: error.config?.url,
    })

    decorateErrorWithSupportCode(error, requestId, errorId)
    appendSupportCodeToPayload(responseData, error.response?.status >= 500 ? supportCode : undefined)

    const shouldIgnoreAuthError = shouldIgnoreAuthExpiry(error.config?.url)
    const authError = responseData

    if (error.response?.status === 403 && authError?.code === ACCOUNT_BANNED_CODE && !shouldIgnoreAuthError) {
      clearStoredAuthState()
      showToast(authError.message || 'Tento účet byl zablokován. Kontaktujte administrátora.', 'error')
      window.dispatchEvent(new CustomEvent('auth:blocked'))
      return Promise.reject(error)
    }

    if (error.response?.status === 401 && !shouldIgnoreAuthError) {
      clearStoredAuthState()
      showToast('Relace vypršela, přihlaste se znovu', 'error')
      window.dispatchEvent(new CustomEvent('auth:expired'))
    }
    return Promise.reject(error)
  },
)

export default apiClient
