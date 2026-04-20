/**
 * App.tsx — Root: AuthProvider + Route table
 * Fáze 1: Auth forms + AppShell s protected routami.
 */
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { ErrorBoundary } from 'react-error-boundary'
import { AuthProvider, useAuth } from '@/context/AuthContext'
import { AuthPage } from '@/features/auth/AuthPage'
import { ResetPasswordPage } from '@/features/auth/ResetPasswordPage'
import { VerifyEmailPage } from '@/features/auth/VerifyEmailPage'
import { LandingPage } from '@/features/landing/LandingPage'
import { InvitePage } from '@/features/invite/InvitePage'
import { NotFoundPage } from '@/features/not-found/NotFoundPage'
import { PrivacyPage } from '@/features/legal/PrivacyPage'
import { TermsPage } from '@/features/legal/TermsPage'
import { CookieConsent } from '@/components/shared/CookieConsent'
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
const AdminDiagnosticsPage = lazyRetry(() => import('@/features/admin/AdminDiagnosticsPage').then(m => ({ default: m.AdminDiagnosticsPage })))
const SuperAdminPage = lazyRetry(() => import('@/features/superadmin/SuperAdminPage').then(m => ({ default: m.SuperAdminPage })))
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
  const { isLoggedIn, user, isSuperAdmin } = useAuth()
  const location = useLocation()

  if (isLoggedIn && user?.cabinId === null) {
    if (isSuperAdmin) {
      if (location.pathname.startsWith('/superadmin')) return <>{children}</>
      return <Navigate to="/superadmin" replace />
    }

    return <Navigate to="/onboarding" replace />
  }

  return <>{children}</>
}
// ─── Guard pro admin-only routy (zabrání lazy-load chunků pro ne-adminy) ─────────
function AdminRoute({ children }: { children: ReactNode }) {
  const { isAdmin } = useAuth()
  if (!isAdmin) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

function SuperAdminRoute({ children }: { children: ReactNode }) {
  const { isSuperAdmin, user } = useAuth()
  if (!isSuperAdmin) return <Navigate to={user?.cabinId ? '/dashboard' : '/onboarding'} replace />
  return <>{children}</>
}
// ─── Route table ───────────────────────────────────────────────────────────────
function AppRoutes() {
  const { isLoggedIn, user } = useAuth()
  const authedHome = user?.isSuperAdmin && !user?.cabinId
    ? '/superadmin'
    : user?.cabinId
      ? '/dashboard'
      : '/onboarding'

  return (
    <Routes>
      {/* Auth */}
      <Route path="/" element={isLoggedIn ? <Navigate to={authedHome} replace /> : <LandingPage />} />
      <Route path="/login" element={isLoggedIn ? <Navigate to={authedHome} replace /> : <AuthPage />} />
      <Route path="/reset-password" element={isLoggedIn ? <Navigate to={authedHome} replace /> : <ResetPasswordPage />} />
      {/* Token-based verify route (standalone stránka) */}
      <Route path="/verify" element={<VerifyEmailPage />} />
      {/* Legal pages — public, no auth needed */}
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/invite/:token" element={isLoggedIn ? <Navigate to={authedHome} replace /> : <InvitePage />} />

      {/* Onboarding — přihlášený uživatel bez chaty */}
      <Route
        path="/onboarding"
        element={
          <PrivateRoute>
            {user?.isSuperAdmin && !user?.cabinId ? (
              <Navigate to="/superadmin" replace />
            ) : (
              <Suspense fallback={<PageSpinner />}>
                <OnboardingPage />
              </Suspense>
            )}
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
        <Route path="/admin" element={<AdminRoute><ErrorBoundary FallbackComponent={FeatureErrorFallback}><Suspense fallback={<PageSpinner />}><AdminPage /></Suspense></ErrorBoundary></AdminRoute>} />
        <Route path="/admin/invites" element={<AdminRoute><ErrorBoundary FallbackComponent={FeatureErrorFallback}><Suspense fallback={<PageSpinner />}><AdminPage /></Suspense></ErrorBoundary></AdminRoute>} />
        <Route path="/admin/cabin" element={<AdminRoute><ErrorBoundary FallbackComponent={FeatureErrorFallback}><Suspense fallback={<PageSpinner />}><AdminPage /></Suspense></ErrorBoundary></AdminRoute>} />
        <Route path="/admin/diagnostics" element={<AdminRoute><ErrorBoundary FallbackComponent={FeatureErrorFallback}><Suspense fallback={<PageSpinner />}><AdminDiagnosticsPage /></Suspense></ErrorBoundary></AdminRoute>} />
        <Route path="/cabin-settings" element={<AdminRoute><Navigate to="/admin/cabin" replace /></AdminRoute>} />
        <Route path="/superadmin"     element={<SuperAdminRoute><ErrorBoundary FallbackComponent={FeatureErrorFallback}><Suspense fallback={<PageSpinner />}><SuperAdminPage /></Suspense></ErrorBoundary></SuperAdminRoute>} />
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
        <CookieConsent />
      </AuthProvider>
    </ErrorBoundary>
  )
}

