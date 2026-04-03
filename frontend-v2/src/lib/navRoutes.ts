/**
 * lib/navRoutes.ts — Překlad routes[] z lib/router.ts
 * Definuje navigační položky pro TopBar a MobileNav.
 */

export interface NavRoute {
  path: string
  label: string
  /** FA icon class, e.g. "fa-home" */
  icon: string
  /** Pokud je nastaveno, položka je viditelná jen pokud cabin.features[featureKey] === true */
  featureKey?: string
  /** Pokud true, viditelná jen pro role=admin */
  adminOnly?: boolean
  /** Zobrazovat i v mobile bottom nav */
  mobileNav?: boolean
}

export const NAV_ROUTES: NavRoute[] = [
  { path: '/dashboard',      label: 'Přehled',         icon: 'fa-home',          mobileNav: true },
  { path: '/reservations',   label: 'Rezervace',       icon: 'fa-calendar-alt',  featureKey: 'reservations', mobileNav: true },
  { path: '/notes',          label: 'Chat',            icon: 'fa-comments',      featureKey: 'notes',        mobileNav: true },
  { path: '/shopping',       label: 'Nákupy',          icon: 'fa-shopping-cart', featureKey: 'shopping',     mobileNav: true },
  { path: '/gallery',        label: 'Galerie',         icon: 'fa-images',        featureKey: 'gallery' },
  { path: '/diary',          label: 'Deník',           icon: 'fa-book-open',     featureKey: 'diary',        mobileNav: true },
  { path: '/reconstruction', label: 'Rekonstrukce',    icon: 'fa-hammer',        featureKey: 'reconstruction' },
  { path: '/admin',          label: 'Admin',           icon: 'fa-cog',           adminOnly: true },
  { path: '/cabin-settings', label: 'Nastavení chaty', icon: 'fa-sliders-h',     adminOnly: true },
]

/** Jen routy pro mobile bottom nav */
export const MOBILE_NAV_ROUTES = NAV_ROUTES.filter((r) => r.mobileNav)
