import { Router, Request, Response } from 'express';
import { protect, protectWithTokenFallback } from '../../middleware/authMiddleware';
import logger           from '../../utils/logger';
import prisma           from '../../utils/prisma';
import { z }            from 'zod';

const router = Router();

function hasCabinLogAccess(req: Request): boolean {
  if (!req.user) return false;
  return req.user.role === 'admin' && typeof req.user.cabinId === 'string' && req.user.cabinId.length > 0;
}

// ─── Validační schéma pro frontend chybový report ────────────────────────────
const ClientErrorSchema = z.object({
  message:   z.string().max(1000),
  stack:     z.string().max(5000).optional(),
  url:       z.string().max(500).optional(),
  path:      z.string().max(300).optional(),
  component: z.string().max(100).optional(),
  context:   z.record(z.string(), z.unknown()).optional(),
  requestId: z.string().max(100).optional(),
  errorId:   z.string().max(100).optional(),
  level:     z.enum(['error', 'warn', 'info']).default('error'),
});

const LogQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  lines: z.coerce.number().int().min(1).max(500).optional(),
  level: z.enum(['debug', 'info', 'warn', 'error']).optional(),
  userId: z.string().max(100).optional(),
  module: z.string().max(100).optional(),
  source: z.enum(['backend', 'frontend']).optional(),
  requestId: z.string().max(100).optional(),
  path: z.string().max(300).optional(),
  status: z.coerce.number().int().min(100).max(599).optional(),
  search: z.string().max(200).optional(),
});

// ============================================================================
//               GET /api/logs — číst logy (admin only)
// ============================================================================
router.get('/', protect, async (req: Request, res: Response) => {
  if (!hasCabinLogAccess(req)) {
    return res.status(403).json({ message: 'Pouze pro adminy.' });
  }

  const currentUser = req.user;
  if (!currentUser?.cabinId) {
    return res.status(403).json({ message: 'Pouze pro adminy.' });
  }

  const parsedQuery = LogQuerySchema.safeParse(req.query);
  if (!parsedQuery.success) {
    return res.status(400).json({
      message: 'Neplatný formát filtru logů.',
      errors: parsedQuery.error.flatten().fieldErrors,
    });
  }

  const { date, lines, level, userId, module: mod, source, requestId, path, status, search } = parsedQuery.data;

  try {
    const cabinUserIds = await prisma.user.findMany({
      where: { cabinId: currentUser.cabinId },
      select: { id: true },
    });

    const logLines = logger.readLogs({
      date,
      lines,
      level,
      userId,
      module: mod,
      source,
      requestId,
      path,
      status,
      search,
      cabinId: currentUser.cabinId,
      allowedUserIds: cabinUserIds.map((cabinUser) => cabinUser.id),
    });

    res.json({
      date:  date ?? new Date().toISOString().split('T')[0],
      count: logLines.length,
      logs:  logLines,
    });
  } catch (error) {
    logger.error('LOGS', 'Failed to read cabin-scoped logs', {
      error: String(error),
      cabinId: currentUser.cabinId,
      userId: currentUser.userId,
    });
    res.status(500).json({ message: 'Chyba při načítání logů.' });
  }
});

// ============================================================================
//               GET /api/logs/files — seznam dostupných dat
// ============================================================================
router.get('/files', protect, async (req: Request, res: Response) => {
  if (!hasCabinLogAccess(req)) {
    return res.status(403).json({ message: 'Pouze pro adminy.' });
  }
  res.json({ files: logger.listLogFiles() });
});

// ============================================================================
//   POST /api/logs/client — frontend chyby (autentizovaný uživatel)
// ============================================================================
router.post('/client', protectWithTokenFallback, (req: Request, res: Response) => {
  const parsed = ClientErrorSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: 'Neplatný formát chybového reportu.',
      errors:  parsed.error.flatten().fieldErrors,
    });
  }

  const data = parsed.data;
  logger.frontend(`[FE] ${data.message}`, {
    level:     data.level,
    source:    'frontend',
    module:    data.component ?? 'unknown',
    url:       data.url,
    path:      data.path,
    stack:     data.stack,
    context:   data.context,
    requestId: data.requestId,
    errorId:   data.errorId,
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
    level:     data.level,
    source:    'frontend',
    module:    data.component ?? 'unknown',
    url:       data.url,
    path:      data.path,
    stack:     data.stack,
    context:   data.context,
    requestId: data.requestId,
    errorId:   data.errorId,
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
