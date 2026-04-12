/**
 * lib/navRoutes.ts — Překlad routes[] z lib/router.ts
 * Definuje navigační položky pro TopBar a MobileNav.
 */
import type { LucideIcon } from 'lucide-react'
import { Home, CalendarDays, MessageCircle, ShoppingCart, Images, BookOpen, Hammer, Settings, SlidersHorizontal } from 'lucide-react'

export interface NavRoute {
  path: string
  label: string
  /** Lucide icon component */
  icon: LucideIcon
  /** Pokud je nastaveno, položka je viditelná jen pokud cabin.features[featureKey] === true */
  featureKey?: string
  /** Pokud true, viditelná jen pro role=admin */
  adminOnly?: boolean
  /** Zobrazovat i v mobile bottom nav */
  mobileNav?: boolean
}

export const NAV_ROUTES: NavRoute[] = [
  { path: '/dashboard',      label: 'Přehled',         icon: Home,               mobileNav: true },
  { path: '/reservations',   label: 'Rezervace',       icon: CalendarDays,        featureKey: 'reservations', mobileNav: true },
  { path: '/notes',          label: 'Chat',            icon: MessageCircle,       featureKey: 'notes',        mobileNav: true },
  { path: '/shopping',       label: 'Nákupy',          icon: ShoppingCart,        featureKey: 'shopping',     mobileNav: true },
  { path: '/gallery',        label: 'Galerie',         icon: Images,             featureKey: 'gallery' },
  { path: '/diary',          label: 'Deník',           icon: BookOpen,           featureKey: 'diary',        mobileNav: true },
  { path: '/reconstruction', label: 'Rekonstrukce',    icon: Hammer,             featureKey: 'reconstruction' },
  { path: '/admin',          label: 'Admin',           icon: Settings,           adminOnly: true },
  { path: '/cabin-settings', label: 'Nastavení chaty', icon: SlidersHorizontal,  adminOnly: true },
]

/** Jen routy pro mobile bottom nav */
export const MOBILE_NAV_ROUTES = NAV_ROUTES.filter((r) => r.mobileNav)
