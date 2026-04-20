/**
 * lib/networkError.ts
 *
 * Detekuje síťovou chybu (žádné připojení) vs serverovou chybu (backend vrátil 4xx/5xx).
 *
 * Toto rozlišení umožňuje mutation handlers:
 *   - ✅ Při síťové chybě → ponechat optimistické UI, zobrazit soft toast
 *   - ❌ Při serverové chybě → rollback optimistického UI, zobrazit chybové hlášení
 */
import axios from 'axios'

/**
 * Vrátí `true` pokud je chyba způsobena výpadkem sítě (žádná odpověď od serveru),
 * `false` pokud server vrátil HTTP chybový kód (4xx / 5xx).
 */
export function isNetworkError(err: unknown): boolean {
  if (axios.isAxiosError(err)) {
    // err.response je undefined = request nikdy nedorazil na server
    return !err.response
  }
  // TypeError: Failed to fetch, NetworkError, etc.
  if (err instanceof TypeError) {
    return err.message.toLowerCase().includes('network') ||
           err.message.toLowerCase().includes('fetch')
  }
  return false
}

export function getNetworkAwareLoadMessage(
  err: unknown,
  fallback = 'Data se teď nepodařilo načíst. Zkuste to prosím znovu.',
): string {
  if (isNetworkError(err)) {
    return 'Vypadá to na problém s připojením. Obnovte spojení a zkuste načtení zopakovat.'
  }

  return fallback
}

export function getNetworkAwareActionMessage(
  err: unknown,
  fallback: string,
  offlineFallback = 'Spojení vypadlo dřív, než se změna stihla uložit. Zkuste to znovu po obnovení připojení.',
): string {
  return isNetworkError(err) ? offlineFallback : fallback
}

/** Zpráva zobrazená při výpadku připojení místo červeného erroru */
export const OFFLINE_TOAST_MSG = 'Není připojení k internetu. Změna bude synchronizována automaticky po obnovení spojení.'
