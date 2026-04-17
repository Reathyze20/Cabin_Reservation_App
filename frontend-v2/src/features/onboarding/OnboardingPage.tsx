/**
 * features/onboarding/OnboardingPage.tsx
 * Standalone page for newly registered users who have no cabin yet.
 * Calls POST /api/cabin/create, receives a fresh JWT with cabinId embedded,
 * then updates AuthContext and redirects to /dashboard.
 *
 * Also handles the case where cabinId was assigned AFTER the user logged in
 * (stale token). On mount we call /api/auth/refresh-token â€” if cabinId is now
 * present, we silently update the token and redirect to dashboard.
 */
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { apiClient } from '@/api/client'
import { showToast } from '@/lib/toast'
import '@/styles/onboarding.css'

interface CreateCabinResponse {
  token: string
  cabinId: string
  cabinName: string
  userId: string
  username: string
  role: string
  animalIcon: string | null
}

interface RefreshTokenResponse {
  token: string
  cabinId: string | null
  userId: string
  username: string
  role: string
  animalIcon: string | null
}

export default function OnboardingPage() {
  const { login, user } = useAuth()
  const navigate = useNavigate()
  const nameRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // On mount: try to refresh the token. If the server now has a cabinId for this
  // user (assigned after their last login), update auth and skip onboarding.
  useEffect(() => {
    let cancelled = false
    async function checkForAssignedCabin() {
      try {
        const res = await apiClient.get<RefreshTokenResponse>('/auth/refresh-token')
        if (cancelled) return
        if (res.data.cabinId) {
          login({
            token: res.data.token,
            username: res.data.username,
            userId: res.data.userId,
            role: res.data.role,
            animalIcon: res.data.animalIcon,
            cabinId: res.data.cabinId,
            remember: !!localStorage.getItem('authToken'),
          })
          navigate('/dashboard', { replace: true })
          return
        }
      } catch {
        // Stale token or network error â€” show the onboarding form normally
      } finally {
        if (!cancelled) setChecking(false)
      }
    }
    checkForAssignedCabin()
    return () => { cancelled = true }
  }, [login, navigate])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const name = nameRef.current?.value.trim() ?? ''
    if (name.length < 2) {
      setError('NĂˇzev chaty musĂ­ mĂ­t alespoĹ 2 znaky.')
      return
    }

    setError(null)
    setLoading(true)

    try {
      const res = await apiClient.post<CreateCabinResponse>('/cabin/create', { name })
      const data = res.data

      // Update auth context with the fresh JWT (now has cabinId)
      login({
        token: data.token,
        username: data.username,
        userId: data.userId,
        role: data.role,
        animalIcon: data.animalIcon,
        cabinId: data.cabinId,
        remember: !!localStorage.getItem('authToken'), // preserve remember-me choice
      })

      showToast(`Chata â€ž${data.cabinName}" byla ĂşspÄ›ĹˇnÄ› vytvoĹ™ena!`, 'success')
      navigate('/dashboard', { replace: true })
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'NepodaĹ™ilo se vytvoĹ™it chatu. Zkuste to znovu.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  if (checking) {
    return (
      <div className="onboarding-page">
        <div className="onboarding-card card" style={{ textAlign: 'center' }}>
          <div className="spinner" />
        </div>
      </div>
    )
  }

  return (
    <div className="onboarding-page">
      <div className="onboarding-card card">
        <div className="auth-brand">
          <img src="/logo-icon.svg" alt="Logo" className="auth-logo-icon" />
          <h1 className="auth-brand-text">kdynachatu.cz</h1>
        </div>

        <h2 className="onboarding-title">VytvoĹ™te svĹŻj prostor</h2>
        <p className="auth-subtitle">
          VĂ­tejte{user?.username ? `, ${user.username}` : ''}! JeĹˇtÄ› neĹľ zaÄŤnete, pojmenujte svou chatu.
        </p>

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="cabin-name">NĂˇzev chaty</label>
            <input
              ref={nameRef}
              id="cabin-name"
              type="text"
              placeholder="napĹ™. Chata U Lesa"
              maxLength={100}
              autoFocus
              autoComplete="off"
              required
            />
          </div>

          {error && <p className="error-message">{error}</p>}

          <button type="submit" className="button-primary" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'VytvĂˇĹ™Ă­ seâ€¦' : 'VytvoĹ™it chatu â†’'}
          </button>
        </form>

        <p className="onboarding-hint">
          NĂˇzev chaty lze kdykoli zmÄ›nit v nastavenĂ­.
        </p>
      </div>
    </div>
  )
}
