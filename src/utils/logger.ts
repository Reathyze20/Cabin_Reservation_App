import pino from 'pino';
import { requestContext } from './asyncContext';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const isDev  = process.env.NODE_ENV !== 'production';
const isTest = process.env.NODE_ENV === 'test';

const level = isTest ? 'silent' : isDev ? 'debug' : 'info';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const LOGS_DIR = path.join(__dirname, '../../data/logs');

if (!fs.existsSync(LOGS_DIR) && !isTest) {
  try { fs.mkdirSync(LOGS_DIR, { recursive: true }); }
  catch (err) { console.error('Failed to create logs directory:', err); }
}

// ─── Pino transport ────────────────────────────────────────────────────────
// DEV: pino-pretty (barevný, čitelný výstup)
// PROD: čistý JSON na stdout (Railway/Docker sbírá automaticky)

const transport = isDev
  ? pino.transport({
      target: 'pino-pretty',
      options: {
        colorize:      true,
        translateTime: 'SYS:HH:MM:ss.l',
        ignore:        'pid,hostname',
        messageFormat: '{msg}',
        singleLine:    false,
      },
    })
  : undefined;

const baseLogger = pino(
  {
    level,
    mixin() {
      const ctx = requestContext.getStore();
      return ctx
        ? { requestId: ctx.requestId, ...(ctx.userId ? { actorId: ctx.userId } : {}) }
        : {};
    },
    redact: {
      paths: [
        'password', 'passwordHash', 'token', 'authorization', 'secret', 'otp', 'cookie',
        'req.headers.authorization', 'req.headers.cookie',
        'body.password', 'body.token',
      ],
      censor: '[REDACTED]',
    },
    base: {
      app: 'chata-trebenice',
      env: process.env.NODE_ENV ?? 'development',
      pid: process.pid,
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    serializers: {
      err:   pino.stdSerializers.err,
      error: pino.stdSerializers.err,
    },
  },
  transport,
);

// ─── LogFields – strukturovaná data pro Kibana-style filtrování ───────────

export interface LogFields {
  module?:     string;    // Funkční oblast: AUTH, SHOPPING …
  method?:     string;    // HTTP metoda
  path?:       string;    // URL path
  status?:     number;    // HTTP status code
  durationMs?: number;    // Doba zpracování v ms
  ip?:         string;    // IP adresa klienta
  userId?:     string;    // ID přihlášeného uživatele
  role?:       string;    // Role uživatele
  username?:   string;    // Přezdívka uživatele
  source?:     'backend' | 'frontend';
  requestId?:  string;
  [key: string]: unknown;
}

// ─── File appender (NDJSON – jeden JSON objekt na řádek) ──────────────────
// Vždy zapisujeme do souboru (kromě test prostředí),
// aby Admin log viewer fungoval v dev i v prod.

const enableFileLog = !isTest;

function appendToLogFile(record: Record<string, unknown>): void {
  if (!enableFileLog) return;
  try {
    const date    = new Date().toISOString().split('T')[0];
    const logFile = path.join(LOGS_DIR, `${date}.log`);
    fs.appendFileSync(logFile, JSON.stringify(record) + '\n');
  } catch { /* tiše – nechceme crashnout server kvůli logu */ }
}

// ─── Normalizace starého 3-arg volání → nový unified formát ──────────────
// Podporuje všechny existující call-site vzory:
//   logger.error("AUTH", "msg", { extra })   → module:"AUTH", msg:"msg"
//   logger.warn("CONFIG", "msg")             → module:"CONFIG", msg:"msg"
//   logger.info("msg", { ip, user })         → msg:"msg", fields:{ip,user}
//   logger.info("msg")                       → msg:"msg"

function normalize(
  msg: string,
  objOrMsg?: unknown,
  obj?: unknown,
): { message: string; fields: LogFields } {
  if (obj !== undefined) {
    // 3-arg: (tag, message, extraObj)
    const fields: LogFields = {
      module: msg,
      ...(typeof obj === 'object' && obj !== null ? (obj as LogFields) : { extra: obj }),
    };
    return { message: typeof objOrMsg === 'string' ? objOrMsg : msg, fields };
  }
  if (objOrMsg !== undefined) {
    if (typeof objOrMsg === 'string') {
      // 2-arg string: (tag, message)
      return { message: objOrMsg, fields: { module: msg } };
    }
    // 2-arg object: (message, fieldsObj)
    return { message: msg, fields: objOrMsg as LogFields };
  }
  return { message: msg, fields: {} };
}

function makeRecord(
  lvl: string,
  message: string,
  fields: LogFields,
): Record<string, unknown> {
  const ctx = requestContext.getStore();
  return {
    time:      new Date().toISOString(),
    level:     lvl,
    msg:       message,
    source:    'backend',
    ...fields,
    ...(ctx?.requestId ? { requestId: ctx.requestId } : {}),
    ...(ctx?.userId    ? { actorId:   ctx.userId }    : {}),
  };
}

// ─── Public logger API ────────────────────────────────────────────────────

export const logger = {

  debug(msg: string, objOrMsg?: unknown, obj?: unknown): void {
    const { message, fields } = normalize(msg, objOrMsg, obj);
    const rec = makeRecord('debug', message, fields);
    baseLogger.debug(rec, message);
    appendToLogFile(rec);
  },

  info(msg: string, objOrMsg?: unknown, obj?: unknown): void {
    const { message, fields } = normalize(msg, objOrMsg, obj);
    const rec = makeRecord('info', message, fields);
    baseLogger.info(rec, message);
    appendToLogFile(rec);
  },

  warn(msg: string, objOrMsg?: unknown, obj?: unknown): void {
    const { message, fields } = normalize(msg, objOrMsg, obj);
    const rec = makeRecord('warn', message, fields);
    baseLogger.warn(rec, message);
    appendToLogFile(rec);
  },

  error(msg: string, objOrMsg?: unknown, obj?: unknown): void {
    const { message, fields } = normalize(msg, objOrMsg, obj);
    const rec = makeRecord('error', message, fields);
    baseLogger.error(rec, message);
    appendToLogFile(rec);
  },

  // ── Specialty loggers ──────────────────────────────────────────────────

  /** HTTP request/response log — volá httpLogger middleware */
  http(fields: LogFields & { method: string; path: string; status: number; durationMs: number }): void {
    const lvl = fields.status >= 500 ? 'error' : fields.status >= 400 ? 'warn' : 'info';
    const message = `${fields.method} ${fields.path} → ${fields.status} (${fields.durationMs}ms)`;
    const rec = makeRecord(lvl, message, { ...fields, source: 'backend' });
    baseLogger[lvl](rec, message);
    // Zapisujeme všechny requesty – admin viewer musí vidět vše
    appendToLogFile(rec);
  },

  /** Prisma/DB chyby se serializují speciálně */
  prismaError(msg: string, err: unknown, fields?: LogFields): void {
    const prismaFields: Record<string, unknown> = {};
    if (err && typeof err === 'object') {
      const e = err as Record<string, unknown>;
      prismaFields.prismaCode    = e['code'];
      prismaFields.prismaMessage = String(e['message'] ?? '').split('\n')[0];
      prismaFields.prismaMeta    = e['meta'];
    }
    const rec = makeRecord('error', msg, { ...fields, ...prismaFields, source: 'backend' });
    baseLogger.error(rec, msg);
    appendToLogFile(rec);
  },

  /** Frontend zachycené chyby (přes POST /api/logs/client) */
  frontend(msg: string, fields: LogFields): void {
    const rec = makeRecord('error', msg, { ...fields, source: 'frontend' });
    baseLogger.error(rec, msg);
    appendToLogFile(rec);
  },

  // ── Admin log reader API ──────────────────────────────────────────────

  listLogFiles(): string[] {
    if (!fs.existsSync(LOGS_DIR)) return [];
    try {
      return fs.readdirSync(LOGS_DIR)
        .filter(f => f.endsWith('.log'))
        .map(f => f.replace('.log', ''))
        .sort((a, b) => b.localeCompare(a));
    } catch { return []; }
  },

  readLogs(options: {
    date?:   string;
    lines?:  number;
    level?:  string;
    userId?: string;
    module?: string;
    source?: string;
  }): Record<string, unknown>[] {
    try {
      const date    = options.date ?? new Date().toISOString().split('T')[0];
      const logFile = path.join(LOGS_DIR, `${date}.log`);
      if (!fs.existsSync(logFile)) return [];

      const raw = fs.readFileSync(logFile, 'utf-8')
        .split('\n')
        .filter(l => l.trim());

      // Parsuj každý řádek jako JSON (nový NDJSON formát)
      // s fallbackem na starý textový formát pro zpětnou kompatibilitu
      let parsed: Record<string, unknown>[] = raw.map(line => {
        try { return JSON.parse(line) as Record<string, unknown>; }
        catch {
          return { time: '', level: 'info', msg: line, source: 'backend', _legacy: true };
        }
      });

      // Server-side filtry (Kibana-style)
      if (options.level) {
        const lvl = options.level.toLowerCase();
        parsed = parsed.filter(r => String(r['level']).toLowerCase() === lvl);
      }
      if (options.userId) {
        parsed = parsed.filter(r =>
          r['userId'] === options.userId || r['actorId'] === options.userId,
        );
      }
      if (options.module) {
        const mod = options.module.toUpperCase();
        parsed = parsed.filter(r => String(r['module'] ?? '').toUpperCase() === mod);
      }
      if (options.source) {
        parsed = parsed.filter(r => r['source'] === options.source);
      }

      const limit = options.lines ?? 200;
      return parsed.slice(-limit);
    } catch { return []; }
  },
};

export default logger;
