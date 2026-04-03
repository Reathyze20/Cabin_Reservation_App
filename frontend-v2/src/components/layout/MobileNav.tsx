/**
 * components/layout/MobileNav.tsx
 * Překlad: nav#mobile-nav z index.html + buildMobileNav() z router.ts
 * Zobrazuje 5 hlavních sekcí v bottom tab baru.
 */
import { NavLink } from 'react-router-dom'
import { MOBILE_NAV_ROUTES } from '@/lib/navRoutes'
import { useCabinFeatures, isFeatureEnabled } from '@/hooks/useCabinFeatures'

export function MobileNav() {
  const { data: cabin } = useCabinFeatures()

  const visibleRoutes = MOBILE_NAV_ROUTES.filter((r) => {
    if (r.featureKey) return isFeatureEnabled(cabin?.features, r.featureKey)
    return true
  })

  return (
    <nav id="mobile-nav" className="mobile-nav">
      {visibleRoutes.map((route) => (
        <NavLink
          key={route.path}
          to={route.path}
          className={({ isActive }) => `mobile-nav-link${isActive ? ' active' : ''}`}
        >
          <i className={`fas ${route.icon}`}></i>
          <span>{route.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
