/**
 * components/layout/MobileNav.tsx
 * Překlad: nav#mobile-nav z index.html + buildMobileNav() z router.ts
 * Zobrazuje 5 hlavních sekcí v bottom tab baru.
 */
import { NavLink } from 'react-router-dom'
import { MOBILE_NAV_ROUTES } from '@/lib/navRoutes'
import { useCabinFeatures, isFeatureEnabled } from '@/hooks/useCabinFeatures'
import { useAuth } from '@/context/AuthContext'

export function MobileNav() {
  const { user } = useAuth()
  const { data: cabin } = useCabinFeatures()

  if (!user?.cabinId) return null

  const visibleRoutes = MOBILE_NAV_ROUTES.filter((r) => {
    if (r.featureKey) return isFeatureEnabled(cabin?.features, r.featureKey)
    return true
  })

  return (
    <nav id="mobile-nav" className="mobile-nav" data-testid="mobile-nav">
      {visibleRoutes.map((route) => (
        <NavLink
          key={route.path}
          to={route.path}
          className={({ isActive }) => `mobile-nav-link${isActive ? ' active' : ''}`}
          data-testid="mobile-nav-link"
          data-route={route.path}
        >
          <route.icon size={20} />
          <span>{route.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
