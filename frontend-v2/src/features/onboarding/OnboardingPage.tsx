/**
 * features/onboarding/OnboardingPage.tsx
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
  isSuperAdmin?: boolean
}

interface RefreshTokenResponse {
  token: string
  cabinId: string | null
  userId: string
  username: string
  role: string
  animalIcon: string | null
  isSuperAdmin?: boolean
}

export default function OnboardingPage() {
  const { login, logout, user } = useAuth()
  const navigate = useNavigate()
  const nameRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)

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
            isSuperAdmin: res.data.isSuperAdmin,
            remember: !!localStorage.getItem('authToken'),
          })
          showToast('Přesměrování na dashboard...', 'info')
          navigate('/dashboard', { replace: true })
          return
        }
      } catch (error) {
        void error
      } finally {
        if (!cancelled) setChecking(false)
      }
    }
    checkForAssignedCabin()
    return () => { cancelled = true }
  }, [login, navigate, retryCount])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const name = nameRef.current?.value.trim() ?? ''
    if (name.length < 2) {
      setError('Nazev chaty musi mit alespon 2 znaky.')
      return
    }
    setError(null)
    setLoading(true)
    try {
      const res = await apiClient.post<CreateCabinResponse>('/cabin/create', { name })
      const data = res.data
      login({
        token: data.token,
        username: data.username,
        userId: data.userId,
        role: data.role,
        animalIcon: data.animalIcon,
        cabinId: data.cabinId,
        isSuperAdmin: data.isSuperAdmin,
        remember: !!localStorage.getItem('authToken'),
      })
      showToast('Chata byla uspesne vytvorena!', 'success')
      navigate('/dashboard', { replace: true })
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Nepodarilo se vytvorit chatu.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  if (checking) {
    return (
      <div className="onboarding-page" data-testid="onboarding-page" data-onboarding-state="checking">
        <div className="onboarding-card card" style={{ textAlign: 'center' }}>
          <div className="spinner" />
          <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>Kontroluji přiřazení k chatě...</p>
        </div>
      </div>
    )
  }

  function handleRetryCheck() {
    setChecking(true)
    setRetryCount((c) => c + 1)
  }

  function handleLogout() {
    logout()
    navigate('/', { replace: true })
  }

  return (
    <div className="onboarding-page" data-testid="onboarding-page" data-onboarding-state="ready">
      <div className="onboarding-card card">
        <div className="auth-brand">
          <img src="/logo-icon.svg" alt="Logo" className="auth-logo-icon" />
          <h1 className="auth-brand-text">Chatačeskéstředohoří</h1>
        </div>
        <h2 className="onboarding-title">Vytvořte svůj prostor</h2>
        <p className="auth-subtitle">
          Vítejte{user?.username ? `, ${user.username}` : ''}! Pojmenujte svou chatu.
        </p>
        <form onSubmit={handleSubmit} noValidate data-testid="onboarding-form">
          <div className="form-group">
            <label htmlFor="cabin-name">Název chaty</label>
            <input ref={nameRef} id="cabin-name" type="text" placeholder="např. Chata U Lesa" maxLength={100} autoFocus autoComplete="off" required data-testid="onboarding-cabin-name-input" />
          </div>
          {error && <p className="error-message" data-testid="onboarding-error-message">{error}</p>}
          <button type="submit" className="button-primary" style={{ width: '100%' }} disabled={loading} data-testid="onboarding-submit-button">
            {loading ? 'Vytváří se...' : 'Vytvořit chatu'}
          </button>
        </form>
        <p className="onboarding-hint">Název chaty lze kdykoli změnit v nastavení.</p>
        
        <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            Byli jste pozváni do existující chaty? Požádejte správce o novou pozvánku, nebo zkuste znovu načíst stránku.
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button 
              type="button" 
              onClick={handleRetryCheck}
              className="button-secondary"
              style={{ fontSize: '0.875rem', padding: '0.5rem 1rem' }}
              data-testid="onboarding-retry-button"
            >
              Zkusit znovu
            </button>
            <button 
              type="button" 
              onClick={handleLogout}
              className="button-secondary"
              style={{ fontSize: '0.875rem', padding: '0.5rem 1rem' }}
              data-testid="onboarding-logout-button"
            >
              Odhlásit se
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
