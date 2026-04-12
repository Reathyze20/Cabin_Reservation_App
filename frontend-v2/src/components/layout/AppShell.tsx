/**
 * components/layout/AppShell.tsx
 * Překlad: #app-section div.app-container z index.html + showApp() z main.ts
 * Wrapper pro všechny přihlášené stránky: offline banner, header, nav, page outlet, mobile nav.
 */
import { useState } from 'react'
import { useLocation, Outlet } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuth } from '@/context/AuthContext'
import { TopBar } from './TopBar'
import { MobileHeader } from './MobileHeader'
import { MobileNav } from './MobileNav'
import { ProfileDrawer } from './ProfileDrawer'
import { HelpFab } from '@/components/shared/HelpFab'
import { OfflineBanner } from '@/components/shared/OfflineBanner'

const pageVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit:    { opacity: 0 },
}

const pageTransition = {
  duration: 0.12,
  ease: 'easeOut' as const,
}

export function AppShell() {
  const { user } = useAuth()
  const location = useLocation()
  const [profileDrawerOpen, setProfileDrawerOpen] = useState(false)

  const animalIcon = user?.animalIcon ?? null
  const username = user?.username ?? 'Uživatel'

  return (
    <div className="app-wrapper">
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
        <main id="page-container">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={pageTransition}
              style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, minHeight: 0 }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
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
