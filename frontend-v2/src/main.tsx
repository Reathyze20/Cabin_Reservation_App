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
      // Při výpadku sítě: exponenciální backoff (1s → 2s → 4s → max 30s)
      retry: 3,
      retryDelay: (attempt) => Math.min(1_000 * 2 ** attempt, 30_000),
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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </BrowserRouter>
  </StrictMode>,
)
