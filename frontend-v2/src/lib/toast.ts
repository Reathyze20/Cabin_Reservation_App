/**
 * lib/toast.ts — Globální showToast funkce (překlad z lib/common.ts)
 * Komunikuje přes window event, aby fungoval kdekoliv (axios interceptor, stránky, atd.)
 */
export type ToastType = 'success' | 'error' | 'info'

export function showToast(message: string, type: ToastType = 'info'): void {
  window.dispatchEvent(new CustomEvent('toast:show', { detail: { message, type } }))
}
