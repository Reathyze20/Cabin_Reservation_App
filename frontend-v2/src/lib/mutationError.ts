/**
 * lib/mutationError.ts
 *
 * Centralizovaný error handler pro useMutation onError callbacky.
 * Rozlišuje síťové výpadky vs. serverové chyby a zobrazuje
 * strukturovaný toast s kontextovými informacemi.
 *
 * Použití:
 *   onError: handleMutationError('Chyba při ukládání')
 *
 * Nahrazuje opakující se pattern:
 *   onError: (err) => {
 *     showToast(isNetworkError(err) ? OFFLINE_TOAST_MSG : 'Chyba...', ...)
 *   }
 */
import { isNetworkError, OFFLINE_TOAST_MSG } from '@/lib/networkError'
import { extractSupportErrorDetails, getUserFriendlyMessage } from '@/lib/errorDetails'
import { reportError } from '@/lib/errorReporting'
import { showToast } from '@/lib/toast'

/**
 * Vrátí onError handler pro useMutation.
 *
 * @param fallbackTitle - Český nadpis chyby zobrazený uživateli
 *                        (např. "Chyba při vytváření seznamu")
 * @param options.component - Volitelný název komponenty pro error reporting
 * @param options.silent - Pokud true, nezobrazí toast (jen reportuje)
 */
export function handleMutationError(
  fallbackTitle: string,
  options?: { component?: string; silent?: boolean },
) {
  return (err: Error) => {
    // ── Síťový výpadek → soft info toast, žádný rollback ──────────────
    if (isNetworkError(err)) {
      // Změna už je v offline frontě — apiClient o tom uživatele informoval
      if ((err as Error & { queuedOffline?: boolean }).queuedOffline) return
      if (!options?.silent) {
        showToast({ title: 'Výpadek připojení', detail: OFFLINE_TOAST_MSG }, 'info')
      }
      return
    }

    // ── Serverová chyba → strukturovaný error toast ───────────────────
    const details = extractSupportErrorDetails(err)

    // Preferujeme server message, pak HTTP-status friendly, pak generic
    const serverMessage = details.message
    const statusMessage = getUserFriendlyMessage(details.status)
    const detail = serverMessage && serverMessage !== err.message
      ? serverMessage
      : statusMessage

    if (!options?.silent) {
      showToast(
        {
          title: fallbackTitle,
          detail,
          supportCode: details.supportCode,
        },
        'error',
      )
    }

    // ── Report na backend ─────────────────────────────────────────────
    reportError({
      message: err.message ?? 'Unknown mutation error',
      stack: (err as Error & { stack?: string }).stack,
      component: options?.component ?? 'useMutation',
      requestId: details.requestId,
      errorId: details.errorId,
      path: window.location.pathname,
    })
  }
}
