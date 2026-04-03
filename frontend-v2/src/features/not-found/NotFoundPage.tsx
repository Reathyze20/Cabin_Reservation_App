import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'

export function NotFoundPage() {
  const navigate = useNavigate()
  const { isLoggedIn } = useAuth()

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      background: 'var(--color-bg, #f8fafc)',
    }}>
      <div style={{
        textAlign: 'center',
        maxWidth: '420px',
      }}>
        <div style={{ fontSize: '5rem', marginBottom: '1rem', lineHeight: 1 }}>🏚️</div>
        <h1 style={{
          fontSize: '2rem',
          fontWeight: 700,
          marginBottom: '0.5rem',
          color: 'var(--color-text, #1e293b)',
        }}>
          Stránka nenalezena
        </h1>
        <p style={{
          color: 'var(--color-text-light, #64748b)',
          marginBottom: '2rem',
          fontSize: '1.05rem',
          lineHeight: 1.6,
        }}>
          Tato stránka neexistuje nebo byla přesunuta. Zkontrolujte adresu a zkuste to znovu.
        </p>
        <button
          className="btn btn-primary"
          style={{ minWidth: '180px', padding: '0.75rem 1.5rem' }}
          onClick={() => navigate(isLoggedIn ? '/dashboard' : '/')}
        >
          {isLoggedIn ? 'Zpět na přehled' : 'Zpět na úvod'}
        </button>
      </div>
    </div>
  )
}
