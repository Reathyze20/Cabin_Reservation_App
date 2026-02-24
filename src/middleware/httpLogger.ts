/* ============================================================================
   middleware/httpLogger.ts — Strukturované HTTP request/response logování
   Loguje metodu, URL, status, dobu trvání, IP a user kontext (userId, role).
   ============================================================================ */
import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

// Endpointy, kde nechceme logovat každý hit (health check, statika)
const SKIP_PATHS = new Set(['/api/health']);
const QUIET_STATIC = /^\/(dist|uploads|favicon|apple-touch-icon|pwa-icon)/;

export function httpLogger(req: Request, res: Response, next: NextFunction): void {
  if (SKIP_PATHS.has(req.path)) {
    next();
    return;
  }

  const startNs = process.hrtime.bigint();

  res.on('finish', () => {
    const durationMs = Math.round(Number(process.hrtime.bigint() - startNs) / 1_000_000);
    const status     = res.statusCode;
    const method     = req.method;
    const urlPath    = req.path;

    // Statické soubory s 2xx logujeme tiše – zbytečný šum
    if (method === 'GET' && status < 400 && QUIET_STATIC.test(urlPath)) return;

    // ── Strukturované pole pro Kibana-style filtrování ────────────────────
    logger.http({
      method,
      path:       urlPath,
      status,
      durationMs,
      ip: (
        (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
        ?? req.ip
        ?? '—'
      ),
      requestId: req.headers['x-request-id'] as string | undefined,

      // Přidáme user kontext pouze pokud je request autentizovaný
      // → umožňuje filtrovat logy podle konkrétního uživatele
      ...(req.user
        ? {
            userId:   req.user.userId,
            username: req.user.username,
            role:     req.user.role,
          }
        : { userId: 'anonymous' }
      ),

      // Query parametry (sanitizované) — pomáhají debugovat filtry/paginaci
      ...(Object.keys(req.query).length > 0
        ? { query: sanitizeQuery(req.query as Record<string, string>) }
        : {}
      ),
    });
  });

  next();
}

/** Redaktuje potenciálně citlivé query parametry */
function sanitizeQuery(query: Record<string, string>): Record<string, string> {
  const SENSITIVE = new Set(['token', 'password', 'secret', 'key', 'auth', 'code']);
  return Object.fromEntries(
    Object.entries(query).map(([k, v]) =>
      SENSITIVE.has(k.toLowerCase()) ? [k, '[REDACTED]'] : [k, v],
    ),
  );
}
