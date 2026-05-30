import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'

export function NotFoundPage() {
  const navigate = useNavigate()
  const { isLoggedIn } = useAuth()

  return (
    <div className="not-found-page" data-testid="not-found-page">
      <div className="not-found-content">
        <div className="not-found-icon">404</div>
        <h1 className="not-found-title">Stránka nenalezena</h1>
        <p className="not-found-text">
          Tato stránka neexistuje nebo byla přesunuta. Zkontrolujte adresu a zkuste to znovu.
        </p>
        <button
          className="btn btn-primary"
          onClick={() => navigate(isLoggedIn ? '/dashboard' : '/')}
          data-testid="not-found-home-button"
        >
          {isLoggedIn ? 'Zpět na přehled' : 'Zpět na úvod'}
        </button>
      </div>
    </div>
  )
}
