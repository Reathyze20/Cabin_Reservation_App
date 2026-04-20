/**
 * lib/toast.ts — Globální showToast funkce (překlad z lib/common.ts)
 * Komunikuje přes window event, aby fungoval kdekoliv (axios interceptor, stránky, atd.)
 */
import { getRecentSupportCode } from '@/lib/observability'

export type ToastType = 'success' | 'error' | 'info'

export function showToast(message: string, type: ToastType = 'info'): void {
  const supportCode = type === 'error' ? getRecentSupportCode() : undefined
  const finalMessage = supportCode && !message.includes('Kód chyby')
    ? `${message} Kód chyby: ${supportCode}`
    : message

  window.dispatchEvent(new CustomEvent('toast:show', { detail: { message: finalMessage, type } }))
}
