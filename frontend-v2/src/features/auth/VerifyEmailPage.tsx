/**
 * features/auth/VerifyEmailPage.tsx
 * Token-based email verification page — standalone route /verify?token=xxx
 * Called when user clicks the verification link in their email.
 */
import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'

type VerifyState = 'loading' | 'success' | 'error' | 'no-token'

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const [state, setState] = useState<VerifyState>(token ? 'loading' : 'no-token')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token) return

    const controller = new AbortController()

    async function verify() {
      try {
        const res = await fetch(`/api/verify-token?token=${encodeURIComponent(token!)}`, {
          signal: controller.signal,
        })
        const data = await res.json()

        if (!res.ok) {
          setState('error')
          setMessage(data.message || 'Ověření selhalo.')
          return
        }

        setState('success')
        setMessage(data.message || 'Účet byl úspěšně ověřen!')
      } catch (err) {
        if ((err as Error).name === 'AbortError') return
        setState('error')
        setMessage('Chyba sítě při ověřování.')
      }
    }

    verify()
    return () => controller.abort()
  }, [token])

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--color-bg, #f5f5f5)',
      padding: '1rem',
    }}>
      <div style={{
        maxWidth: 420,
        width: '100%',
        background: 'white',
        borderRadius: 16,
        padding: '2.5rem 2rem',
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
        textAlign: 'center',
      }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <img src="/logo-icon.svg" alt="Logo" style={{ width: 48, height: 48 }} />
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '0.5rem' }}>
            kdynachatu.cz
          </h1>
        </div>

        {state === 'loading' && (
          <>
            <div className="spinner" style={{ margin: '2rem auto' }} />
            <p style={{ color: 'var(--color-text-light)' }}>Ověřuji váš účet…</p>
          </>
        )}

        {state === 'success' && (
          <>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✓</div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              Ověření úspěšné
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

        {state === 'error' && (
          <>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✕</div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--color-danger, #dc2626)' }}>
              Ověření selhalo
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

        {state === 'no-token' && (
          <>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>?</div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              Chybí ověřovací odkaz
            </h2>
            <p style={{ color: 'var(--color-text-light)', marginBottom: '1.5rem' }}>
              Ověřovací odkaz je neplatný nebo chybí token. Zkontrolujte svůj e-mail a klikněte na správný odkaz.
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
