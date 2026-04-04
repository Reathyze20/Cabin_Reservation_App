/**
 * App.tsx — Root: AuthProvider + Route table
 * Fáze 1: Auth forms + AppShell s protected routami.
 */
import { Routes, Route, Navigate } from 'react-router-dom'
import { ErrorBoundary } from 'react-error-boundary'
import { AuthProvider, useAuth } from '@/context/AuthContext'
import { AuthPage } from '@/features/auth/AuthPage'
import { VerifyEmailPage } from '@/features/auth/VerifyEmailPage'
import { LandingPage } from '@/features/landing/LandingPage'
import { InvitePage } from '@/features/invite/InvitePage'
import { NotFoundPage } from '@/features/not-found/NotFoundPage'
import { AppShell } from '@/components/layout/AppShell'
import { Toast } from '@/components/shared/Toast'
import { GlobalFallback } from '@/components/shared/GlobalFallback'
import { FeatureErrorFallback } from '@/components/shared/FeatureErrorFallback'
import { lazyRetry } from '@/lib/lazyRetry'
import { Suspense } from 'react'
import type { ReactNode } from 'react'

// ── Lazy-loaded page components (code splitting) ───────────────────────────────
const DashboardPage = lazyRetry(() => import('@/features/dashboard/DashboardPage').then(m => ({ default: m.DashboardPage })))
const ReservationsPage = lazyRetry(() => import('@/features/reservations/ReservationsPage').then(m => ({ default: m.ReservationsPage })))
const NotesPage = lazyRetry(() => import('@/features/notes/NotesPage').then(m => ({ default: m.NotesPage })))
const ShoppingPage = lazyRetry(() => import('@/features/shopping/ShoppingPage').then(m => ({ default: m.ShoppingPage })))
const GalleryPage = lazyRetry(() => import('@/features/gallery/GalleryPage').then(m => ({ default: m.GalleryPage })))
const DiaryPage = lazyRetry(() => import('@/features/diary/DiaryPage').then(m => ({ default: m.DiaryPage })))
const ReconstructionPage = lazyRetry(() => import('@/features/reconstruction/ReconstructionPage').then(m => ({ default: m.ReconstructionPage })))
const AdminPage = lazyRetry(() => import('@/features/admin/AdminPage').then(m => ({ default: m.AdminPage })))
const CabinSettingsPage = lazyRetry(() => import('@/features/settings/CabinSettingsPage').then(m => ({ default: m.CabinSettingsPage })))
const OnboardingPage = lazyRetry(() => import('@/features/onboarding/OnboardingPage'))

// ─── Placeholder pages (budou nahrazeny v Fázích 2–7) ─────────────────────────
function PageSpinner() {
  return <div className="spinner-container"><div className="spinner" /></div>
}

// ─── Guard pro přihlášené routy ─────────────────────────────────────────────────
function PrivateRoute({ children }: { children: ReactNode }) {
  const { isLoggedIn } = useAuth()
  if (!isLoggedIn) return <Navigate to="/login" replace />
  return <>{children}</>
}

// ─── Guard: přihlášený uživatel bez chaty → onboarding ────────────────────────
function CabinGuard({ children }: { children: ReactNode }) {
  const { isLoggedIn, user } = useAuth()
  if (isLoggedIn && user?.cabinId === null) return <Navigate to="/onboarding" replace />
  return <>{children}</>
}
// ─── Guard pro admin-only routy (zabrání lazy-load chunků pro ne-adminy) ─────────
function AdminRoute({ children }: { children: ReactNode }) {
  const { isAdmin } = useAuth()
  if (!isAdmin) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}
// ─── Route table ───────────────────────────────────────────────────────────────
function AppRoutes() {
  const { isLoggedIn } = useAuth()

  return (
    <Routes>
      {/* Auth */}
      <Route path="/" element={isLoggedIn ? <Navigate to="/dashboard" replace /> : <LandingPage />} />
      <Route path="/login" element={isLoggedIn ? <Navigate to="/dashboard" replace /> : <AuthPage />} />
      {/* Token-based verify route (standalone stránka) */}
      <Route path="/verify" element={<VerifyEmailPage />} />
      <Route path="/invite/:token" element={isLoggedIn ? <Navigate to="/dashboard" replace /> : <InvitePage />} />

      {/* Onboarding — přihlášený uživatel bez chaty */}
      <Route
        path="/onboarding"
        element={
          <PrivateRoute>
            <Suspense fallback={<PageSpinner />}>
              <OnboardingPage />
            </Suspense>
          </PrivateRoute>
        }
      />

      {/* Protected — AppShell wrapper + cabin guard */}
      <Route
        element={
          <PrivateRoute>
            <CabinGuard>
              <AppShell />
            </CabinGuard>
          </PrivateRoute>
        }
      >
        <Route path="/dashboard"      element={<ErrorBoundary FallbackComponent={FeatureErrorFallback}><Suspense fallback={<PageSpinner />}><DashboardPage /></Suspense></ErrorBoundary>} />
        <Route path="/reservations"   element={<ErrorBoundary FallbackComponent={FeatureErrorFallback}><Suspense fallback={<PageSpinner />}><ReservationsPage /></Suspense></ErrorBoundary>} />
        <Route path="/notes"          element={<ErrorBoundary FallbackComponent={FeatureErrorFallback}><Suspense fallback={<PageSpinner />}><NotesPage /></Suspense></ErrorBoundary>} />
        <Route path="/shopping"       element={<ErrorBoundary FallbackComponent={FeatureErrorFallback}><Suspense fallback={<PageSpinner />}><ShoppingPage /></Suspense></ErrorBoundary>} />
        <Route path="/gallery"        element={<ErrorBoundary FallbackComponent={FeatureErrorFallback}><Suspense fallback={<PageSpinner />}><GalleryPage /></Suspense></ErrorBoundary>} />
        <Route path="/diary"          element={<ErrorBoundary FallbackComponent={FeatureErrorFallback}><Suspense fallback={<PageSpinner />}><DiaryPage /></Suspense></ErrorBoundary>} />
        <Route path="/reconstruction" element={<ErrorBoundary FallbackComponent={FeatureErrorFallback}><Suspense fallback={<PageSpinner />}><ReconstructionPage /></Suspense></ErrorBoundary>} />
        <Route path="/admin"          element={<AdminRoute><ErrorBoundary FallbackComponent={FeatureErrorFallback}><Suspense fallback={<PageSpinner />}><AdminPage /></Suspense></ErrorBoundary></AdminRoute>} />
        <Route path="/cabin-settings" element={<AdminRoute><ErrorBoundary FallbackComponent={FeatureErrorFallback}><Suspense fallback={<PageSpinner />}><CabinSettingsPage /></Suspense></ErrorBoundary></AdminRoute>} />
      </Route>

      {/* Fallback — 404 */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

// ─── Root ──────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <ErrorBoundary FallbackComponent={GlobalFallback}>
      <AuthProvider>
        <AppRoutes />
        {/* Toast je mimo AppShell — musí fungovat i na auth stránkách */}
        <Toast />
      </AuthProvider>
    </ErrorBoundary>
  )
}

