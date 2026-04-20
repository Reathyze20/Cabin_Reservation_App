import { useRef, useState } from 'react'
import { apiClient } from '@/api/client'
import { showToast } from '@/lib/toast'

interface ForgotPasswordFormProps {
  onShowLogin: () => void
}

interface ForgotPasswordResponse {
  message?: string
}

export function ForgotPasswordForm({ onShowLogin }: ForgotPasswordFormProps) {
  const identifierRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
  const [requestSent, setRequestSent] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const identifier = identifierRef.current?.value.trim() ?? ''

    if (identifier.length < 2) {
      setMessage({ text: 'Zadejte e-mail nebo uživatelské jméno.', type: 'error' })
      return
    }

    setLoading(true)
    setMessage(null)

    try {
      const { data } = await apiClient.post<ForgotPasswordResponse>('/forgot-password', { identifier })
      const text = data.message || 'Pokud účet existuje, poslali jsme vám e-mail s odkazem pro obnovu hesla.'
      setRequestSent(true)
      setMessage({ text, type: 'success' })
      showToast('Pokud účet existuje, poslali jsme e-mail pro obnovu hesla.', 'success')
    } catch (err: unknown) {
      const data = (err as { response?: { data?: ForgotPasswordResponse } }).response?.data
      const text = data?.message || 'Nepodařilo se odeslat žádost. Zkuste to znovu.'
      setMessage({ text, type: 'error' })
      showToast(text, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div id="forgot-password-section" className="login-container card">
      <div className="auth-brand">
        <img src="/logo-icon.svg" alt="Logo" className="auth-logo-icon" />
        <h1 className="auth-brand-text">Chatačeskéstředohoří</h1>
      </div>
      <p className="auth-subtitle">Obnova hesla</p>

      <form noValidate onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="forgot-password-identifier">E-mail nebo uživatelské jméno</label>
          <input
            type="text"
            id="forgot-password-identifier"
            name="identifier"
            maxLength={255}
            autoComplete="username email"
            placeholder="např. jan@domena.cz nebo Honza"
            ref={identifierRef}
            disabled={loading || requestSent}
          />
        </div>

        <p style={{ color: 'var(--color-text-light)', fontSize: '0.95rem', lineHeight: 1.5, marginTop: 0 }}>
          Obnova funguje jen pro účty, které mají nastavený e-mail. Pokud e-mail u účtu není, požádejte správce chaty o změnu hesla.
        </p>

        <button type="submit" className="button-primary" style={{ width: '100%' }} disabled={loading || requestSent}>
          {loading ? 'Odesílám odkaz…' : requestSent ? 'Odkaz byl odeslán' : 'Poslat odkaz pro obnovu'}
        </button>

        {message && (
          <p
            className={message.type === 'error' ? 'error-message' : 'message'}
            style={{
              display: 'block',
              marginTop: '.75rem',
              color: message.type === 'error' ? 'var(--color-danger)' : 'var(--color-success)',
            }}
          >
            {message.text}
          </p>
        )}
      </form>

      <p className="toggle-form-text">
        <a href="#" onClick={(e) => { e.preventDefault(); onShowLogin() }}>
          ← Zpět na přihlášení
        </a>
      </p>
    </div>
  )
}