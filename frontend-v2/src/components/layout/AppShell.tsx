/**
 * components/layout/AppShell.tsx
 * Překlad: #app-section div.app-container z index.html + showApp() z main.ts
 * Wrapper pro všechny přihlášené stránky: offline banner, header, nav, page outlet, mobile nav.
 */
import { useEffect, useRef, useState } from 'react'
import { useLocation, useOutlet } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuth } from '@/context/AuthContext'
import { TopBar } from './TopBar'
import { MobileHeader } from './MobileHeader'
import { MobileNav } from './MobileNav'
import { ProfileDrawer } from './ProfileDrawer'
import { HelpFab } from '@/components/shared/HelpFab'
import { OfflineBanner } from '@/components/shared/OfflineBanner'
import { RouteTransitionSkeleton, getRouteSkeletonVariant } from '@/components/shared/RouteTransitionSkeleton'
import { useRealtimeSync } from '@/hooks/useRealtimeSync'

const pageVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit:    { opacity: 0 },
}

const pageTransition = {
  duration: 0.12,
  ease: 'easeOut' as const,
}

const ROUTE_SKELETON_OVERLAY_MS = 140

export function AppShell() {
  const { user } = useAuth()
  const location = useLocation()
  const outlet = useOutlet()
  const [profileDrawerOpen, setProfileDrawerOpen] = useState(false)
  useRealtimeSync()
  const [showRouteSkeleton, setShowRouteSkeleton] = useState(false)
  const isFirstRoutePaint = useRef(true)

  const animalIcon = user?.animalIcon ?? null
  const username = user?.username ?? 'Uživatel'
  const routeSkeletonVariant = getRouteSkeletonVariant(location.pathname)

  useEffect(() => {
    if (isFirstRoutePaint.current) {
      isFirstRoutePaint.current = false
      return
    }

    setShowRouteSkeleton(true)

    const timerId = window.setTimeout(() => {
      setShowRouteSkeleton(false)
    }, ROUTE_SKELETON_OVERLAY_MS)

    return () => {
      window.clearTimeout(timerId)
    }
  }, [location.pathname])

  return (
    <div className="app-wrapper" data-testid="app-shell">
      <a href="#page-container" className="skip-to-content">Přeskočit navigaci</a>
      <div id="app-section" className="app-container">
        {/* Offline banner */}
        <OfflineBanner />

        {/* Mobile header */}
        <MobileHeader
          animalIcon={animalIcon}
          username={username}
          onOpenProfileDrawer={() => setProfileDrawerOpen(true)}
        />

        {/* Desktop top bar */}
        <TopBar onOpenProfileDrawer={() => setProfileDrawerOpen(true)} />

        {/* Page content with route transitions */}
        <main id="page-container" data-testid="app-shell-main">
          <motion.div
            key={location.pathname}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            transition={pageTransition}
            style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, minHeight: 0, height: '100%', position: 'relative' }}
          >
            {outlet}

            <AnimatePresence>
              {showRouteSkeleton ? (
                <motion.div
                  key={location.pathname}
                  initial={{ opacity: 1 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.16, ease: 'easeOut' }}
                  className="pointer-events-none absolute inset-0 z-10"
                  aria-hidden="true"
                >
                  <RouteTransitionSkeleton variant={routeSkeletonVariant} />
                </motion.div>
              ) : null}
            </AnimatePresence>
          </motion.div>
        </main>

        {/* Mobile bottom navigation */}
        <MobileNav />
      </div>

      {/* Profile Drawer (global overlay) */}
      <ProfileDrawer
        isOpen={profileDrawerOpen}
        onClose={() => setProfileDrawerOpen(false)}
      />

      {/* Global loading overlay (pro stránky které to potřebují) */}
      <div id="loading-overlay" className="loading-overlay hidden">
        <div className="spinner"></div>
      </div>

      {/* Help FAB + modal */}
      <HelpFab />
    </div>
  )
}
