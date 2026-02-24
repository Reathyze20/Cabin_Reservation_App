import { Router, Request, Response } from 'express';
import { protect }      from '../../middleware/authMiddleware';
import logger           from '../../utils/logger';
import { z }            from 'zod';

const router = Router();

// ─── Validační schéma pro frontend chybový report ────────────────────────────
const ClientErrorSchema = z.object({
  message:   z.string().max(1000),
  stack:     z.string().max(5000).optional(),
  url:       z.string().max(500).optional(),
  component: z.string().max(100).optional(),
  context:   z.record(z.string(), z.unknown()).optional(),
  level:     z.enum(['error', 'warn']).default('error'),
});

// ============================================================================
//               GET /api/logs — číst logy (admin only)
// ============================================================================
router.get('/', protect, (req: Request, res: Response) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Pouze pro adminy.' });
  }

  const { date, lines, level, userId, module: mod, source } = req.query;

  const logLines = logger.readLogs({
    date:   date   as string | undefined,
    lines:  lines  ? parseInt(lines as string, 10) : 200,
    level:  level  as string | undefined,
    userId: userId as string | undefined,
    module: mod    as string | undefined,
    source: source as string | undefined,
  });

  res.json({
    date:  date ?? new Date().toISOString().split('T')[0],
    count: logLines.length,
    logs:  logLines, // pole JSON objektů (NDJSON)
  });
});

// ============================================================================
//               GET /api/logs/files — seznam dostupných dat
// ============================================================================
router.get('/files', protect, (req: Request, res: Response) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Pouze pro adminy.' });
  }
  res.json({ files: logger.listLogFiles() });
});

// ============================================================================
//   POST /api/logs/client — frontend chyby (autentizovaný uživatel)
// ============================================================================
router.post('/client', protect, (req: Request, res: Response) => {
  const parsed = ClientErrorSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: 'Neplatný formát chybového reportu.',
      errors:  parsed.error.flatten().fieldErrors,
    });
  }

  const data = parsed.data;
  logger.frontend(`[FE] ${data.message}`, {
    source:    'frontend',
    module:    data.component ?? 'unknown',
    url:       data.url,
    stack:     data.stack,
    context:   data.context,
    userId:    req.user?.userId,
    username:  req.user?.username,
    role:      req.user?.role,
  });

  res.status(204).end();
});

// ============================================================================
//   POST /api/logs/client/anon — frontend chyby (NEautentizovaný uživatel)
//   Např. chyby přihlašovací stránky, síťové problémy před loginem
// ============================================================================
router.post('/client/anon', (req: Request, res: Response) => {
  const parsed = ClientErrorSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Neplatný formát.' });
  }

  const ip  = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? req.ip ?? '—';
  if (!checkAnonRateLimit(ip)) {
    return res.status(429).json({ message: 'Too many error reports.' });
  }

  const data = parsed.data;
  logger.frontend(`[FE:anon] ${data.message}`, {
    source:    'frontend',
    module:    data.component ?? 'unknown',
    url:       data.url,
    stack:     data.stack,
    context:   data.context,
    userId:    'anonymous',
    ip,
  });

  res.status(204).end();
});

// ── In-memory rate limiter pro anon endpoint (max 10 req/min/IP) ─────────────
const anonHits = new Map<string, number>();
setInterval(() => anonHits.clear(), 60_000);

function checkAnonRateLimit(ip: string, max = 10): boolean {
  const count = (anonHits.get(ip) ?? 0) + 1;
  anonHits.set(ip, count);
  return count <= max;
}

export default router;
