/**
 * lib/offlineQueue.ts — Fronta mutací provedených bez připojení.
 *
 * Když POST/PUT/PATCH/DELETE selže kvůli výpadku sítě, uloží se do
 * LocalStorage a po obnovení připojení (event `online`) se v původním
 * pořadí přehraje přes apiClient. Fronta přežije i reload stránky.
 *
 * Neukládají se: GET požadavky, uploady souborů (FormData), auth
 * endpointy a klientské error reporty.
 *
 * Eventy na window:
 *   'offline-queue:changed' — změnil se počet čekajících mutací
 *   'offline-queue:flushed' — fronta byla (aspoň částečně) odeslána;
 *                             posluchač by měl invalidovat query cache
 */
import type { InternalAxiosRequestConfig } from 'axios'
import { isNetworkError } from '@/lib/networkError'
import { showToast } from '@/lib/toast'

export interface QueuedMutation {
  id: string
  method: string
  url: string
  data?: unknown
  queuedAt: string
}

const STORAGE_KEY = 'offlineMutationQueue'
const MAX_QUEUE_LENGTH = 100
/** Hlavička označující přehrávaný request — interceptor ho už znovu nefrontuje */
export const REPLAY_HEADER = 'X-Offline-Replay'

const QUEUEABLE_METHODS = new Set(['post', 'put', 'patch', 'delete'])
const EXCLUDED_URL_PARTS = [
  '/login',
  '/register',
  '/verify-token',
  '/verify-email',
  '/forgot-password',
  '/reset-password',
  '/logs/client',
]

function readQueue(): QueuedMutation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeQueue(queue: QueuedMutation[]): void {
  try {
    if (queue.length === 0) {
      localStorage.removeItem(STORAGE_KEY)
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(queue))
    }
  } catch {
    // LocalStorage plné/nedostupné — fronta se pro tuto změnu neuloží
  }
  window.dispatchEvent(new CustomEvent('offline-queue:changed'))
}

export function getQueueLength(): number {
  return readQueue().length
}

/** Rozhodne, jestli daný request patří do offline fronty. */
export function isQueueableRequest(config: InternalAxiosRequestConfig | undefined): boolean {
  if (!config?.method || !config.url) return false
  if (!QUEUEABLE_METHODS.has(config.method.toLowerCase())) return false
  if (config.headers?.[REPLAY_HEADER]) return false
  if (typeof FormData !== 'undefined' && config.data instanceof FormData) return false
  if (EXCLUDED_URL_PARTS.some((part) => config.url!.includes(part))) return false
  return true
}

/** Uloží request do fronty. Vrací true při úspěchu. */
export function enqueueMutation(config: InternalAxiosRequestConfig): boolean {
  const queue = readQueue()
  if (queue.length >= MAX_QUEUE_LENGTH) return false

  let data: unknown
  if (typeof config.data === 'string') {
    try {
      data = JSON.parse(config.data)
    } catch {
      data = config.data
    }
  } else {
    data = config.data
  }

  queue.push({
    id: crypto.randomUUID(),
    method: config.method!.toLowerCase(),
    url: config.url!,
    data,
    queuedAt: new Date().toISOString(),
  })
  writeQueue(queue)
  return true
}

let flushing = false

/**
 * Přehraje frontu v pořadí vzniku. Při síťové chybě se zastaví a čeká
 * na další `online` event; při serverové chybě (4xx/5xx) položku zahodí,
 * aby neblokovala zbytek fronty.
 */
export async function flushQueue(): Promise<void> {
  if (flushing) return
  const queue = readQueue()
  if (queue.length === 0) return

  flushing = true
  // Lazy import — vyhne se cyklické závislosti client.ts ↔ offlineQueue.ts
  const { default: apiClient } = await import('@/api/client')

  let sent = 0
  let dropped = 0

  try {
    while (true) {
      const current = readQueue()
      const entry = current[0]
      if (!entry) break

      try {
        await apiClient.request({
          method: entry.method,
          url: entry.url,
          data: entry.data,
          headers: { [REPLAY_HEADER]: '1' },
        })
        sent += 1
        writeQueue(readQueue().filter((q) => q.id !== entry.id))
      } catch (err) {
        if (isNetworkError(err)) {
          // Spojení zase vypadlo — zbytek fronty počká na další pokus
          break
        }
        // Server request odmítl (např. konflikt, validace) — zahodit, jinak blokuje frontu
        dropped += 1
        writeQueue(readQueue().filter((q) => q.id !== entry.id))
      }
    }
  } finally {
    flushing = false
  }

  if (sent > 0) {
    window.dispatchEvent(new CustomEvent('offline-queue:flushed'))
    showToast(
      {
        title: 'Změny odeslány',
        detail: sent === 1
          ? 'Změna provedená offline byla uložena na server.'
          : `${sent} změn provedených offline bylo uloženo na server.`,
      },
      'success',
    )
  }
  if (dropped > 0) {
    showToast(
      {
        title: 'Některé změny se nepodařilo uložit',
        detail: `${dropped} ${dropped === 1 ? 'změnu' : 'změny/změn'} server odmítl — zkontrolujte prosím data.`,
      },
      'error',
    )
  }
}

/** Zaregistruje flush na obnovení připojení + zkusí flush při startu aplikace. */
export function initOfflineQueue(): void {
  window.addEventListener('online', () => {
    void flushQueue()
  })
  if (navigator.onLine) {
    void flushQueue()
  }
}
