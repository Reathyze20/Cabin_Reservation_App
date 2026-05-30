/**
 * features/auth/VerifyForm.tsx
 * Překlad: #verify-section z index.html + bindVerifyForm() z main.ts
 */
import { useEffect, useRef, useState } from 'react'
import { apiClient } from '@/api/client'

interface VerifyEmailResponse {
  message?: string
}

interface VerifyFormProps {
  username: string
  prefillCode?: string
  onShowLogin: () => void
}

export function VerifyForm({ username, prefillCode = '', onShowLogin }: VerifyFormProps) {
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
  const [loading, setLoading] = useState(false)
  const codeRef = useRef<HTMLInputElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const code = codeRef.current!.value.trim()
    if (!code) return

    setLoading(true)
    setMessage(null)

    try {
      const { data } = await apiClient.post<VerifyEmailResponse>('/verify-email', { username, code })

      setMessage({ text: data.message || 'Ověření úspěšné, můžete se přihlásit.', type: 'success' })
      timerRef.current = setTimeout(onShowLogin, 1500)
    } catch (err: unknown) {
      const data = (err as { response?: { data?: VerifyEmailResponse } }).response?.data
      setMessage({ text: data?.message || 'Chyba sítě', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div id="verify-section" className="login-container card" data-testid="verify-form-view">
      <div className="auth-brand">
        <img src="/logo-icon.svg" alt="Logo" className="auth-logo-icon" />
        <h1 className="auth-brand-text">Chatačeskéstředohoří</h1>
      </div>
      <h2 className="auth-subtitle" style={{ fontSize: '1.1rem', fontWeight: 600 }}>
        Ověření e-mailu
      </h2>
      <p style={{ textAlign: 'center', color: 'var(--color-text-light)', marginBottom: '1rem' }}>
        Zadejte 6místný PIN kód, který vám byl zaslán na e-mail (nebo zobrazen v serverové konzoli pro testování).
      </p>

      <form id="verify-form" noValidate onSubmit={handleSubmit} data-testid="verify-form">
        <input type="hidden" id="verify-username" value={username} readOnly />

        <div className="form-group">
          <label htmlFor="verify-code">6místný PIN kód:</label>
          <input
            type="text"
            id="verify-code"
            name="code"
            autoComplete="off"
            maxLength={6}
            style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '5px' }}
            required
            defaultValue={prefillCode}
            ref={codeRef}
            data-testid="verify-code-input"
          />
        </div>

        <button type="submit" className="button-primary" style={{ width: '100%' }} disabled={loading} data-testid="verify-submit-button">
          {loading ? 'Ověřuji…' : 'Ověřit e-mail'}
        </button>

        {message && (
          <p
            id="verify-message"
            className="message"
            style={{
              marginTop: '.5rem',
              color: message.type === 'error' ? 'var(--color-danger)' : 'var(--color-success)',
            }}
            data-testid="verify-message"
          >
            {message.text}
          </p>
        )}
      </form>

      <p className="toggle-form-text">
        <a
          href="#"
          id="show-login-link-from-verify"
          onClick={(e) => { e.preventDefault(); onShowLogin() }}
          data-testid="verify-back-to-login-link"
        >
          Vrátit se na přihlášení
        </a>
      </p>
    </div>
  )
}
