/**
 * features/auth/LoginForm.tsx
 * Překlad: #login-section z index.html + bindLoginForm() z main.ts
 */
import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { showToast } from '@/lib/toast'
import { Eye, EyeOff } from 'lucide-react'

interface LoginFormProps {
  onShowRegister: () => void
  onShowVerify: (username: string, prefillCode?: string) => void
}

export function LoginForm({ onShowRegister, onShowVerify }: LoginFormProps) {
  const { login } = useAuth()
  const [error, setError] = useState<{ text: string; testCode?: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)

  const usernameRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const username = usernameRef.current!.value.trim()
    const password = passwordRef.current!.value
    if (!username || !password) return

    setError(null)
    setLoading(true)

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json()

      if (!res.ok) {
        // Ověření e-mailu potřebné
        if (data.needsVerification) {
          setError({ text: data.message })
          showToast(data.message, 'info')
          return
        }

        // Nouzový testovací kód (verify flow)
        if (data.testCode) {
          setError({
            text: data.message || data.error || '',
            testCode: data.testCode,
          })
          timerRef.current = setTimeout(() => onShowVerify(username, data.testCode), 4000)
          return
        }

        const msg = data.message || data.error || 'Nesprávné přihlašovací údaje'
        setError({ text: msg })
        showToast(msg, 'error')
        return
      }

      login({
        token: data.token,
        username: data.username,
        userId: String(data.userId),
        role: data.role,
        animalIcon: data.animalIcon,
        cabinId: data.cabinId || null,
        remember: rememberMe,
      })
      showToast('Přihlášení úspěšné', 'success')
    } catch {
      const msg = 'Chyba sítě – zkuste to znovu'
      setError({ text: msg })
      showToast(msg, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div id="login-section" className="login-container card">
      <div className="auth-brand">
        <img src="/logo-icon.svg" alt="Logo" className="auth-logo-icon" />
        <h1 className="auth-brand-text">kdynachatu.cz</h1>
      </div>
      <p className="auth-subtitle">Přihlaste se ke svému účtu</p>

      <form id="login-form" noValidate onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="username">Uživatelské jméno:</label>
          <input
            type="text"
            id="username"
            name="username"
            maxLength={50}
            autoComplete="username"
            required
            ref={usernameRef}
          />
        </div>

        <div className="form-group">
          <label htmlFor="login-password">Heslo:</label>
          <div className="input-eye-wrapper">
            <input
              type={showPassword ? 'text' : 'password'}
              id="login-password"
              name="password"
              maxLength={100}
              autoComplete="current-password"
              required
              ref={passwordRef}
            />
            <span
              className="toggle-password"
              id="toggle-password-login"
              style={{ cursor: 'pointer' }}
              onClick={() => setShowPassword((v) => !v)}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </span>
          </div>
        </div>

        <div className="form-group remember-me-group">
          <label className="remember-me-label">
            <input
              type="checkbox"
              id="remember-me"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            <span>Zapamatovat si mě</span>
          </label>
        </div>

        <button type="submit" className="button-primary" style={{ width: '100%' }} disabled={loading}>
          {loading ? 'Přihlašuji…' : 'Přihlásit se'}
        </button>

        {error && (
          <p
            id="login-error"
            className="error-message"
            style={{ display: 'block' }}
          >
            {error.text}
            {error.testCode && (
              <>
                <br /><br />
                <strong>Nouzový kód (login) pro testování:{' '}
                  <span style={{ fontSize: '1.2em', letterSpacing: '2px', color: 'var(--color-primary)' }}>{error.testCode}</span>
                </strong>
              </>
            )}
          </p>
        )}
      </form>

      <p className="toggle-form-text">
        Ještě nemáte účet?{' '}
        <a
          href="#"
          id="show-register-link"
          onClick={(e) => { e.preventDefault(); onShowRegister() }}
        >
          Zaregistrujte se
        </a>
      </p>
    </div>
  )
}
