/**
 * api/client.ts — Axios instance with JWT interceptor
 * Replaces authFetch() from lib/common.ts
 */
import axios from 'axios'
import { showToast } from '@/lib/toast'

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

// ─── Axios instance ────────────────────────────────────────────────────────────
export const apiClient = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

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

// ─── Response interceptor: handle 401 globally ───────────────────────────────
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const savedTheme = localStorage.getItem('theme')
      ;['authToken', 'username', 'userId', 'role', 'animalIcon', 'cabinId'].forEach((k) => {
        localStorage.removeItem(k)
        sessionStorage.removeItem(k)
      })
      localStorage.removeItem('cabinFeatures')
      localStorage.removeItem('cabinWinterized')
      if (savedTheme) localStorage.setItem('theme', savedTheme)

      showToast('Relace vypršela, přihlaste se znovu', 'error')
      window.dispatchEvent(new CustomEvent('auth:expired'))
    }
    return Promise.reject(error)
  },
)

export default apiClient
