/* ============================================================================
   lib/logger.ts — Frontend error reporting do backend logu
   Zachycuje unhandled exceptions a catch bloky, odesílá na POST /api/logs/client
   ============================================================================ */
import { getToken } from './common';

interface FrontendErrorReport {
  message:    string;
  stack?:     string;
  url?:       string;
  component?: string;
  context?:   Record<string, unknown>;
  level?:     'error' | 'warn';
}

/** Odešle chybový report na backend log endpoint (fire-and-forget) */
async function reportError(report: FrontendErrorReport): Promise<void> {
  const token    = getToken();
  const endpoint = token ? '/api/logs/client' : '/api/logs/client/anon';
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    await fetch(endpoint, {
      method:    'POST',
      headers,
      credentials: 'include',
      body:      JSON.stringify({
        ...report,
        url: report.url ?? window.location.href,
      }),
      keepalive: true, // Funguje i při navigaci pryč ze stránky
    });
  } catch {
    // Tiše selžeme – nechceme rekurzivní chyby při logování
    console.error('[FE Logger] Failed to report error to backend:', report.message);
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

export const feLogger = {
  error(message: string, context?: Record<string, unknown>, component?: string): void {
    console.error(`[${component ?? 'App'}]`, message, context);
    void reportError({ message, context, component, level: 'error' });
  },

  warn(message: string, context?: Record<string, unknown>, component?: string): void {
    console.warn(`[${component ?? 'App'}]`, message, context);
    void reportError({ message, context, component, level: 'warn' });
  },

  /** Zachytí chybu z catch bloku a odešle ji */
  catch(err: unknown, component?: string, context?: Record<string, unknown>): void {
    const message = err instanceof Error ? err.message    : String(err);
    const stack   = err instanceof Error ? err.stack      : undefined;
    console.error(`[${component ?? 'App'}] Caught:`, err);
    void reportError({ message, stack, context, component, level: 'error' });
  },
};

// ─── Global unhandled error catchers ─────────────────────────────────────────

/** Volej jednou při startu aplikace (main.ts) */
export function initGlobalErrorHandlers(): void {
  // Uncaught synchronní JS chyby (TypeError, ReferenceError atd.)
  window.addEventListener('error', (event) => {
    void reportError({
      message:   event.message,
      stack:     event.error?.stack,
      url:       event.filename ?? window.location.href,
      component: 'global:uncaught',
      context:   { lineno: event.lineno, colno: event.colno },
      level:     'error',
    });
  });

  // Odmítnuté Promises bez catch (fetch chyby, async/await bez try-catch)
  window.addEventListener('unhandledrejection', (event) => {
    const reason  = event.reason;
    const message = reason instanceof Error ? reason.message : String(reason);
    const stack   = reason instanceof Error ? reason.stack   : undefined;
    void reportError({
      message:   `Unhandled Promise rejection: ${message}`,
      stack,
      component: 'global:unhandledrejection',
      level:     'error',
    });
  });
}
