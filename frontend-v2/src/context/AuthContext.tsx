/**
 * context/AuthContext.tsx
 * Replaces lib/common.ts auth utilities + main.ts auth state management.
 * Provides: user state, login, logout, isAdmin, helpers.
 */
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react'
import { useNavigate } from 'react-router-dom'

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface AuthUser {
  userId: string
  username: string
  role: 'admin' | 'user' | 'guest'
  animalIcon: string | null
  cabinId: string | null
  isSuperAdmin: boolean
}

export interface SetAuthPayload {
  token: string
  username: string
  userId: string
  role: string
  animalIcon?: string | null
  cabinId?: string | null
  isSuperAdmin?: boolean
  remember?: boolean
}

interface AuthContextValue {
  user: AuthUser | null
  token: string | null
  isLoggedIn: boolean
  isAdmin: boolean
  isGuest: boolean
  isSuperAdmin: boolean
  /** Currently active cabin ID (derived from JWT cabinId, persisted in localStorage). */
  activeCabinId: string | null
  /** Switch active cabin — flushes React Query cache. For future multi-cabin support. */
  updateActiveCabin: (id: string) => void
  login: (payload: SetAuthPayload) => void
  logout: () => void
  updateAnimalIcon: (icon: string | null) => void
}

// ─── Storage helpers ───────────────────────────────────────────────────────────

function getAuthItem(key: string): string | null {
  return sessionStorage.getItem(key) ?? localStorage.getItem(key)
}

function readStoredUser(): { user: AuthUser | null; token: string | null } {
  const token = getAuthItem('authToken')
  const userId = getAuthItem('userId')
  const username = getAuthItem('username')
  const role = getAuthItem('role')
  const animalIcon = getAuthItem('animalIcon')
  const cabinId = getAuthItem('cabinId')
  const isSuperAdmin = getAuthItem('isSuperAdmin') === 'true'

  if (!token || !userId || !username || !role) return { user: null, token: null }

  return {
    token,
    user: {
      userId,
      username,
      role: role as AuthUser['role'],
      animalIcon,
      cabinId,
      isSuperAdmin,
    },
  }
}

// ─── Context ───────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => readStoredUser().token)
  const [user, setUser] = useState<AuthUser | null>(() => readStoredUser().user)
  const [activeCabinId, setActiveCabinId] = useState<string | null>(
    () =>
      localStorage.getItem('activeCabinId') ??
      sessionStorage.getItem('activeCabinId') ??
      readStoredUser().user?.cabinId ??
      null,
  )
  const navigate = useNavigate()

  // Handle session expiry fired by axios interceptor
  useEffect(() => {
    const resetAuthState = () => {
      setUser(null)
      setToken(null)
      setActiveCabinId(null)
      navigate('/', { replace: true })
    }

    window.addEventListener('auth:expired', resetAuthState)
    window.addEventListener('auth:blocked', resetAuthState)

    return () => {
      window.removeEventListener('auth:expired', resetAuthState)
      window.removeEventListener('auth:blocked', resetAuthState)
    }
  }, [navigate])

  const login = useCallback((payload: SetAuthPayload) => {
    const store = payload.remember ? localStorage : sessionStorage
    const otherStore = payload.remember ? sessionStorage : localStorage
    ;['authToken', 'username', 'userId', 'role', 'animalIcon', 'cabinId', 'isSuperAdmin'].forEach((k) =>
      otherStore.removeItem(k),
    )

    store.setItem('authToken', payload.token)
    store.setItem('username', payload.username)
    store.setItem('userId', payload.userId)
    store.setItem('role', payload.role)
    store.setItem('isSuperAdmin', payload.isSuperAdmin ? 'true' : 'false')
    if (payload.animalIcon) store.setItem('animalIcon', payload.animalIcon)
    if (payload.cabinId) store.setItem('cabinId', payload.cabinId)

    // Persist and update active cabin
    const cabinId = payload.cabinId ?? null
    if (cabinId) {
      store.setItem('activeCabinId', cabinId)
    } else {
      localStorage.removeItem('activeCabinId')
      sessionStorage.removeItem('activeCabinId')
    }
    setActiveCabinId(cabinId)

    setToken(payload.token)
    setUser({
      userId: payload.userId,
      username: payload.username,
      role: payload.role as AuthUser['role'],
      animalIcon: payload.animalIcon ?? null,
      cabinId: payload.cabinId ?? null,
      isSuperAdmin: payload.isSuperAdmin === true,
    })
  }, [])

  const logout = useCallback(() => {
    const savedTheme = localStorage.getItem('theme')
    ;['authToken', 'username', 'userId', 'role', 'animalIcon', 'cabinId', 'activeCabinId', 'isSuperAdmin'].forEach(
      (k) => {
        localStorage.removeItem(k)
        sessionStorage.removeItem(k)
      },
    )
    localStorage.removeItem('cabinFeatures')
    localStorage.removeItem('cabinWinterized')
    if (savedTheme) localStorage.setItem('theme', savedTheme)
    setUser(null)
    setToken(null)
    setActiveCabinId(null)
    navigate('/', { replace: true })
  }, [navigate])

  const updateActiveCabin = useCallback((id: string) => {
    localStorage.setItem('activeCabinId', id)
    sessionStorage.removeItem('activeCabinId')
    setActiveCabinId(id)
    // Emit event so React Query cache can be cleared by consumers if needed
    window.dispatchEvent(new CustomEvent('cabin:changed', { detail: { cabinId: id } }))
  }, [])

  const updateAnimalIcon = useCallback((icon: string | null) => {
    const store = localStorage.getItem('username') ? localStorage : sessionStorage
    if (icon) {
      store.setItem('animalIcon', icon)
    } else {
      store.removeItem('animalIcon')
    }
    setUser((prev) => (prev ? { ...prev, animalIcon: icon } : prev))
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoggedIn: !!user,
        isAdmin: user?.role === 'admin',
        isGuest: user?.role === 'guest',
        isSuperAdmin: user?.isSuperAdmin === true,
        activeCabinId,
        updateActiveCabin,
        login,
        logout,
        updateAnimalIcon,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
