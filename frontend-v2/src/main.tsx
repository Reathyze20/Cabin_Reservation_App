/**
 * main.tsx — Bootstrap
 * Provides: QueryClient, React Router, AuthContext
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider, onlineManager } from '@tanstack/react-query'
import './index.css'
import App from './App'
import { installGlobalErrorHandlers } from '@/lib/errorReporting'

// Načtení uživatelsky nastaveného pozadí při startu aplikace
const customBg = localStorage.getItem('app-background');
if (customBg) {
  document.documentElement.style.setProperty('--bg-image', `url("${customBg}")`);
}

// ─── TanStack Query: explicitně sync s window online/offline events ────────────
// V5 toto dělá automaticky, ale explicitní registrace zaručuje kompatibilitu
// s Chrome DevTools "Offline" throttling (simuluje odpojení).
onlineManager.setEventListener((setOnline) => {
  const handleOnline = () => setOnline(true)
  const handleOffline = () => setOnline(false)
  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)
  return () => {
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
  }
})

// ─── QueryClient konfigurace pro offline odolnost ──────────────────────────────
// Report uncaught errors & unhandled rejections to backend
installGlobalErrorHandlers(() => {
  const token = sessionStorage.getItem('authToken') ?? localStorage.getItem('authToken')
  return !!token
})

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // Cached data zůstane v paměti 10 minut → app vykreslí UI i offline z cache
      gcTime: 10 * 60 * 1000,
      // Smart retry: don't retry network/SSL errors (ERR_CERT, ERR_NETWORK),
      // only retry server errors (5xx) up to 2 times
      retry: (failureCount, error) => {
        // Network errors (SSL, DNS, connection refused) — no point retrying
        if (isNetworkError(error)) return false
        // 4xx client errors — no retry (auth, validation, not found)
        if (isClientError(error)) return false
        // 5xx server errors — retry up to 2 times
        return failureCount < 2
      },
      retryDelay: (attempt) => Math.min(1_000 * 2 ** attempt, 15_000),
      // 'online' = dotazy se pozastaví (neselžou) když je offline
      networkMode: 'online',
    },
    mutations: {
      // Mutace se pozastaví když je offline → neselžou okamžitě
      networkMode: 'online',
      // 1 automatický retry pro přechodné výpadky (brief connectivity drops)
      retry: 1,
      retryDelay: (attempt) => Math.min(1_000 * 2 ** attempt, 10_000),
    },
  },
})

// ─── Helpers for retry logic ─────────────────────────────────────────────────
function isNetworkError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false
  const err = error as { code?: string; message?: string }
  // Axios network errors: no response received at all
  if (err.code === 'ERR_NETWORK' || err.code === 'ERR_CANCELED') return true
  // SSL/cert errors show up as network errors with no response
  if (err.message?.includes('Network Error')) return true
  return false
}

function isClientError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false
  const err = error as { response?: { status?: number } }
  const status = err.response?.status
  return !!status && status >= 400 && status < 500
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </BrowserRouter>
  </StrictMode>,
)
