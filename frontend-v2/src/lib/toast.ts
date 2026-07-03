/**
 * lib/toast.ts — Globální showToast funkce
 * Komunikuje přes window event, aby fungoval kdekoliv (axios interceptor, stránky, atd.)
 *
 * Podporuje dva režimy:
 *   showToast('Zpráva', 'error')                          — plain string (zpětně kompatibilní)
 *   showToast({ title: '...', detail: '...' }, 'error')   — strukturovaný payload
 */
import { getRecentSupportCode } from '@/lib/observability'

export type ToastType = 'success' | 'error' | 'info'

export interface ToastPayload {
  /** Hlavní nadpis toastu (bold) */
  title: string
  /** Volitelný popis pod nadpisem */
  detail?: string
  /** Korelační kód chyby pro podporu */
  supportCode?: string
}

export type ToastInput = string | ToastPayload

function normalizePayload(input: ToastInput): ToastPayload {
  if (typeof input === 'string') {
    return { title: input }
  }
  return input
}

function enrichWithSupportCode(payload: ToastPayload, type: ToastType): ToastPayload {
  if (type !== 'error') return payload

  // Pokud payload už má supportCode, neměníme
  if (payload.supportCode) return payload

  // Zkusíme dostat support code z posledního API callu
  const supportCode = getRecentSupportCode()
  if (!supportCode) return payload

  // Ověříme, že support code už není v textu
  if (payload.title.includes('Kód chyby') || payload.title.includes(supportCode)) return payload
  if (payload.detail?.includes('Kód chyby') || payload.detail?.includes(supportCode)) return payload

  return { ...payload, supportCode }
}

export function showToast(input: ToastInput, type: ToastType = 'info'): void {
  const normalized = normalizePayload(input)
  const enriched = enrichWithSupportCode(normalized, type)

  window.dispatchEvent(
    new CustomEvent('toast:show', {
      detail: {
        title: enriched.title,
        detail: enriched.detail,
        supportCode: enriched.supportCode,
        type,
      },
    }),
  )
}
