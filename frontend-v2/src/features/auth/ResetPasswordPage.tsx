import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { apiClient } from '@/api/client'
import { showToast } from '@/lib/toast'

type ResetViewState = 'loading' | 'ready' | 'success' | 'error' | 'no-token'

interface ResetPasswordResponse {
  message?: string
}

const cardStyle = {
  maxWidth: 440,
  width: '100%',
  background: 'white',
  borderRadius: 16,
  padding: '2.5rem 2rem',
  boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
  textAlign: 'center' as const,
}

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const [viewState, setViewState] = useState<ResetViewState>(token ? 'loading' : 'no-token')
  const [message, setMessage] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const passwordMismatch = confirmPassword.length > 0 && password !== confirmPassword

  useEffect(() => {
    if (!token) return

    const controller = new AbortController()

    async function validateToken() {
      try {
        await apiClient.get<ResetPasswordResponse>('/reset-password-token', {
          params: { token },
          signal: controller.signal,
        })
        setViewState('ready')
        setMessage('')
      } catch (err) {
        if ((err as Error).name === 'AbortError') return
        const data = (err as { response?: { data?: ResetPasswordResponse } }).response?.data
        setViewState('error')
        setMessage(data?.message || 'Resetovací odkaz se nepodařilo ověřit.')
      }
    }

    validateToken()
    return () => controller.abort()
  }, [token])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!token) {
      setViewState('no-token')
      return
    }

    if (password.length < 8) {
      setMessage('Heslo musí mít alespoň 8 znaků.')
      return
    }

    if (password !== confirmPassword) {
      setMessage('Hesla se neshodují.')
      return
    }

    setSubmitting(true)
    setMessage('')

    try {
      const { data } = await apiClient.post<ResetPasswordResponse>('/reset-password', {
        token,
        password,
      })
      setViewState('success')
      setMessage(data.message || 'Heslo bylo změněno.')
      showToast('Heslo bylo úspěšně změněno.', 'success')
    } catch (err: unknown) {
      const data = (err as { response?: { data?: ResetPasswordResponse } }).response?.data
      const text = data?.message || 'Nepodařilo se nastavit nové heslo.'
      setViewState('error')
      setMessage(text)
      showToast(text, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--color-bg, #f5f5f5)',
      padding: '1rem',
    }}>
      <div style={cardStyle}>
        <div style={{ marginBottom: '1.5rem' }}>
          <img src="/logo-icon.svg" alt="Logo" style={{ width: 48, height: 48 }} />
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '0.5rem' }}>
            kdynachatu.cz
          </h1>
        </div>

        {viewState === 'loading' && (
          <>
            <div className="spinner" style={{ margin: '2rem auto' }} />
            <p style={{ color: 'var(--color-text-light)' }}>Ověřuji resetovací odkaz…</p>
          </>
        )}

        {viewState === 'ready' && (
          <>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              Nastavení nového hesla
            </h2>
            <p style={{ color: 'var(--color-text-light)', marginBottom: '1.5rem' }}>
              Zvolte nové heslo pro svůj účet. Odkaz lze použít pouze jednou.
            </p>

            <form onSubmit={handleSubmit} style={{ textAlign: 'left' }}>
              <div className="form-group">
                <label htmlFor="reset-password">Nové heslo</label>
                <div className="input-eye-wrapper">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="reset-password"
                    name="password"
                    maxLength={100}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={submitting}
                  />
                  <button
                    type="button"
                    className="toggle-password"
                    aria-label={showPassword ? 'Skrýt heslo' : 'Zobrazit heslo'}
                    aria-pressed={showPassword}
                    onClick={() => setShowPassword((value) => !value)}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="reset-password-confirm">Potvrzení nového hesla</label>
                <div className="input-eye-wrapper">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    id="reset-password-confirm"
                    name="confirmPassword"
                    maxLength={100}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={submitting}
                  />
                  <button
                    type="button"
                    className="toggle-password"
                    aria-label={showConfirmPassword ? 'Skrýt potvrzení hesla' : 'Zobrazit potvrzení hesla'}
                    aria-pressed={showConfirmPassword}
                    onClick={() => setShowConfirmPassword((value) => !value)}
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <p style={{ color: 'var(--color-text-light)', fontSize: '0.95rem', marginBottom: '1rem' }}>
                Heslo musí mít alespoň 8 znaků.
              </p>

              {(message || passwordMismatch) && (
                <p style={{ color: 'var(--color-danger)', marginBottom: '1rem' }}>
                  {passwordMismatch ? 'Hesla se neshodují.' : message}
                </p>
              )}

              <button type="submit" className="button-primary" style={{ width: '100%' }} disabled={submitting || passwordMismatch}>
                {submitting ? 'Ukládám nové heslo…' : 'Uložit nové heslo'}
              </button>
            </form>
          </>
        )}

        {viewState === 'success' && (
          <>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✓</div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              Heslo změněno
            </h2>
            <p style={{ color: 'var(--color-text-light)', marginBottom: '1.5rem' }}>
              {message}
            </p>
            <Link
              to="/login"
              style={{
                display: 'inline-block',
                padding: '0.75rem 2rem',
                background: 'var(--color-primary, #2563eb)',
                color: 'white',
                borderRadius: 8,
                textDecoration: 'none',
                fontWeight: 600,
              }}
            >
              Přihlásit se
            </Link>
          </>
        )}

        {viewState === 'error' && (
          <>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✕</div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--color-danger, #dc2626)' }}>
              Reset hesla selhal
            </h2>
            <p style={{ color: 'var(--color-text-light)', marginBottom: '1.5rem' }}>
              {message}
            </p>
            <Link
              to="/login"
              style={{
                display: 'inline-block',
                padding: '0.75rem 2rem',
                background: 'var(--color-primary, #2563eb)',
                color: 'white',
                borderRadius: 8,
                textDecoration: 'none',
                fontWeight: 600,
              }}
            >
              Zpět na přihlášení
            </Link>
          </>
        )}

        {viewState === 'no-token' && (
          <>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>?</div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              Chybí resetovací odkaz
            </h2>
            <p style={{ color: 'var(--color-text-light)', marginBottom: '1.5rem' }}>
              Otevřeli jste stránku bez platného tokenu. Vraťte se na přihlášení a požádejte o nový odkaz pro obnovu hesla.
            </p>
            <Link
              to="/login"
              style={{
                display: 'inline-block',
                padding: '0.75rem 2rem',
                background: 'var(--color-primary, #2563eb)',
                color: 'white',
                borderRadius: 8,
                textDecoration: 'none',
                fontWeight: 600,
              }}
            >
              Zpět na přihlášení
            </Link>
          </>
        )}
      </div>
    </div>
  )
}