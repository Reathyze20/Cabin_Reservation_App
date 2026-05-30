/**
 * components/layout/TopBar.tsx
 * Překlad: div.top-bar z index.html + dropdown logika + nav z router.ts buildNav()
 */
import { useEffect, useRef, useState } from 'react'
import { NavLink, Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { showToast } from '@/lib/toast'
import { NAV_ROUTES } from '@/lib/navRoutes'
import { useCabinFeatures, isFeatureEnabled } from '@/hooks/useCabinFeatures'
import { ScrollText, Settings, Shield, UserPlus } from 'lucide-react'
import { AnimalAvatar } from '@/components/shared/AnimalAvatar'

interface TopBarProps {
  onOpenProfileDrawer: () => void
}

export function TopBar({ onOpenProfileDrawer }: TopBarProps) {
  const { user, isAdmin, isSuperAdmin, logout } = useAuth()
  const { data: cabin } = useCabinFeatures()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Zavřít dropdown při kliknutí mimo
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleLogout() {
    setDropdownOpen(false)
    logout()
    showToast('Odhlášení úspěšné', 'info')
  }

  // Viditelné nav položky dle feature flags a role
  const visibleRoutes = NAV_ROUTES.filter((r) => {
    if (!user?.cabinId && isSuperAdmin && !r.superAdminOnly) return false
    if (r.adminOnly) return isAdmin
    if (r.superAdminOnly) return isSuperAdmin
    if (r.featureKey) return isFeatureEnabled(cabin?.features, r.featureKey)
    return true
  })
  // Admin obrazovky se zobrazují v dropdownu, ne v hlavní nav
  const mainNavRoutes = visibleRoutes.filter((r) => !r.adminOnly && !r.superAdminOnly)

  const username = user?.username ?? 'Uživatel'

  return (
    <div className="top-bar" data-testid="desktop-topbar">
      <div className="nav-left-group">
        <Link to={user?.isSuperAdmin && !user?.cabinId ? '/superadmin' : '/dashboard'} className="brand-logo-lockup" data-testid="desktop-home-link">
          <img src="/logo-icon.svg" alt="Chatačeskéstředohoří" className="nav-logo-icon" />
        </Link>

        <nav id="app-nav" className="app-nav" data-testid="desktop-primary-nav">
          {mainNavRoutes.map((route) => (
            <NavLink
              key={route.path}
              to={route.path}
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
              data-testid="desktop-nav-link"
              data-route={route.path}
            >
              {route.label}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="user-info dropdown-container" id="nav-user-dropdown-container" ref={dropdownRef}>
        <button
          id="nav-dropdown-trigger"
          className="nav-dropdown-trigger"
          title="Otevřít profilové menu"
          aria-expanded={dropdownOpen}
          aria-haspopup="true"
          onClick={() => setDropdownOpen((v) => !v)}
          data-testid="profile-menu-button"
        >
          <span id="nav-animal-icon" className="nav-avatar">
            <AnimalAvatar icon={user?.animalIcon} username={username} size={32} />
          </span>
          <div id="user-greeting" className="profile-name">
            <span className="greeting">Ahoj, </span>
            <span className="username">{username}!</span>
          </div>
          <span className="nav-dropdown-arrow">▼</span>
        </button>

        <div id="nav-dropdown-menu" className={`nav-dropdown-menu${dropdownOpen ? '' : ' hidden'}`} role="menu" data-testid="profile-menu">
          {cabin?.name && (
            <>
              <div className="nav-dropdown-label" title={cabin.name}>{cabin.name}</div>
              <div className="nav-dropdown-separator"></div>
            </>
          )}
          <button
            id="profile-button"
            className="nav-dropdown-item"
            onClick={() => { setDropdownOpen(false); onOpenProfileDrawer() }}
            data-testid="profile-menu-profile-button"
          >
            Osobní profil
          </button>

          {(isAdmin || isSuperAdmin) && (
            <>
              <div id="nav-admin-separator" className="nav-dropdown-separator"></div>
              {isSuperAdmin && (
                <Link
                  to="/superadmin"
                  className="nav-dropdown-item"
                  onClick={() => setDropdownOpen(false)}
                  data-testid="profile-menu-superadmin-link"
                >
                  <Shield size={16} style={{ marginRight: '8px', verticalAlign: 'text-bottom' }} />
                  Backoffice
                </Link>
              )}
              {isAdmin && (
                <>
                  <Link
                    to="/admin"
                    id="nav-admin-management"
                    className="nav-dropdown-item"
                    onClick={() => setDropdownOpen(false)}
                    data-testid="profile-menu-admin-link"
                  >
                    <Settings size={16} style={{ marginRight: '8px', verticalAlign: 'text-bottom' }} />
                    Administrativa
                  </Link>
                  <Link
                    to="/admin/invites"
                    id="nav-admin-invites"
                    className="nav-dropdown-item"
                    onClick={() => setDropdownOpen(false)}
                    data-testid="profile-menu-invites-link"
                  >
                    <UserPlus size={16} style={{ marginRight: '8px', verticalAlign: 'text-bottom' }} />
                    Pozvat člena
                  </Link>
                  <Link
                    to="/admin/diagnostics"
                    id="nav-admin-debug"
                    className="nav-dropdown-item"
                    onClick={() => setDropdownOpen(false)}
                    data-testid="profile-menu-diagnostics-link"
                  >
                    <ScrollText size={16} style={{ marginRight: '8px', verticalAlign: 'text-bottom' }} />
                    Diagnostika
                  </Link>
                </>
              )}
            </>
          )}

          <div className="nav-dropdown-separator"></div>
          <button id="logout-button" className="nav-dropdown-item" onClick={handleLogout} data-testid="profile-menu-logout-button">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Odhlásit
          </button>
        </div>
      </div>
    </div>
  )
}
