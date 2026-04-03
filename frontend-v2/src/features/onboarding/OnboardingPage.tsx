/**
 * features/onboarding/OnboardingPage.tsx
 * Standalone page for newly registered users who have no cabin yet.
 * Calls POST /api/cabin/create, receives a fresh JWT with cabinId embedded,
 * then updates AuthContext and redirects to /dashboard.
 */
import { useRef, useState } from 'react'
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

export default function OnboardingPage() {
  const { login, user } = useAuth()
  const navigate = useNavigate()
  const nameRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const name = nameRef.current?.value.trim() ?? ''
    if (name.length < 2) {
      setError('Název chaty musí mít alespoň 2 znaky.')
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

      showToast(`Chata „${data.cabinName}" byla úspěšně vytvořena! 🏡`, 'success')
      navigate('/dashboard', { replace: true })
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Nepodařilo se vytvořit chatu. Zkuste to znovu.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="onboarding-page">
      <div className="onboarding-card card">
        <div className="auth-brand">
          <img src="/logo-icon.svg" alt="Logo" className="auth-logo-icon" />
          <h1 className="auth-brand-text">kdynachatu.cz</h1>
        </div>

        <h2 className="onboarding-title">Vytvořte svůj prostor</h2>
        <p className="auth-subtitle">
          Vítejte{user?.username ? `, ${user.username}` : ''}! Ještě než začnete, pojmenujte svou chatu.
        </p>

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="cabin-name">Název chaty</label>
            <input
              ref={nameRef}
              id="cabin-name"
              type="text"
              placeholder="např. Chata U Lesa"
              maxLength={100}
              autoFocus
              autoComplete="off"
              required
            />
          </div>

          {error && <p className="error-message">{error}</p>}

          <button type="submit" className="button-primary" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Vytváří se…' : 'Vytvořit chatu →'}
          </button>
        </form>

        <p className="onboarding-hint">
          Název chaty lze kdykoli změnit v nastavení.
        </p>
      </div>
    </div>
  )
}
