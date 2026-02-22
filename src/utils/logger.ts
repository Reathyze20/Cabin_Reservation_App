import pino from 'pino';
import { requestContext } from './asyncContext';
import fs from 'fs';
import path from 'path';

const isDev = process.env.NODE_ENV === 'development';
const isTest = process.env.NODE_ENV === 'test';

const level = isTest ? 'warn' : isDev ? 'debug' : 'info';

const LOGS_DIR = path.join(import.meta.dirname, '../../data/logs');
if (!fs.existsSync(LOGS_DIR) && !isTest) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

const transport = isDev
  ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    },
  }
  : undefined;

const baseLogger = pino({
  level,
  transport,
  redact: {
    paths: ['password', 'token', 'authorization', 'otp', 'secret', 'req.headers.authorization'],
    censor: '***',
  },
  base: isDev ? undefined : { pid: process.pid },
  mixin: () => {
    const context = requestContext.getStore();
    return context ? { requestId: context.requestId, userId: context.userId } : {};
  },
});

function appendToLogFile(level: string, msg: string, objOrMsg?: any, obj?: any) {
  if (isTest) return;
  try {
    const date = new Date().toISOString().split('T')[0];
    const logFile = path.join(LOGS_DIR, `${date}.log`);
    const timestamp = new Date().toISOString();

    let tag = 'SERVER';
    let message = msg;
    let extra = objOrMsg;

    // Handle our custom (tag, msg, obj) or (msg, obj) patterns
    if (obj) {
      tag = msg;
      message = objOrMsg;
      extra = obj;
    } else if (typeof objOrMsg === 'string' && msg.length < 20) {
      // Heuristic: if first arg is short and second is string, it's likely [TAG] MSG
      tag = msg;
      message = objOrMsg;
      extra = undefined;
    }

    let line = `[${timestamp}] [${level.toUpperCase()}] [${tag.toUpperCase()}] ${message}`;
    if (extra) {
      line += ` | ${JSON.stringify(extra)}`;
    }

    fs.appendFileSync(logFile, line + '\n');
  } catch (err) {
    // Fallback if file logging fails (don't crash the app)
    console.error('Failed to write to log file:', err);
  }
}

export const logger = {
  info: (msg: string, objOrMsg?: any, obj?: any) => {
    if (obj) baseLogger.info(obj, `[${msg}] ${objOrMsg}`);
    else if (objOrMsg !== undefined) baseLogger.info(objOrMsg, msg);
    else baseLogger.info(msg);
    appendToLogFile('INFO', msg, objOrMsg, obj);
  },
  warn: (msg: string, objOrMsg?: any, obj?: any) => {
    if (obj) baseLogger.warn(obj, `[${msg}] ${objOrMsg}`);
    else if (objOrMsg !== undefined) baseLogger.warn(objOrMsg, msg);
    else baseLogger.warn(msg);
    appendToLogFile('WARN', msg, objOrMsg, obj);
  },
  error: (msg: string, objOrMsg?: any, obj?: any) => {
    if (obj) baseLogger.error(obj, `[${msg}] ${objOrMsg}`);
    else if (objOrMsg !== undefined) baseLogger.error(objOrMsg, msg);
    else baseLogger.error(msg);
    appendToLogFile('ERROR', msg, objOrMsg, obj);
  },
  debug: (msg: string, objOrMsg?: any, obj?: any) => {
    if (obj) baseLogger.debug(obj, `[${msg}] ${objOrMsg}`);
    else if (objOrMsg !== undefined) baseLogger.debug(objOrMsg, msg);
    else baseLogger.debug(msg);
    appendToLogFile('DEBUG', msg, objOrMsg, obj);
  },

  /**
   * Specialized logger for Prisma errors to reduce noise.
   */
  prismaError: (msg: string, err: any) => {
    if (err && typeof err === 'object' && err.constructor.name.includes('Prisma')) {
      const prismaInfo = {
        code: err.code,
        message: err.message?.split('\n').shift(),
        meta: err.meta,
        clientVersion: err.clientVersion,
      };
      baseLogger.error({ prisma: prismaInfo }, msg);
      appendToLogFile('ERROR', msg, { prisma: prismaInfo });
    } else {
      baseLogger.error({ err }, msg);
      appendToLogFile('ERROR', msg, { err });
    }
  },

  listLogFiles: () => {
    if (!fs.existsSync(LOGS_DIR)) return [];
    try {
      return fs.readdirSync(LOGS_DIR)
        .filter(f => f.endsWith('.log'))
        .map(f => f.replace('.log', ''))
        .sort((a, b) => b.localeCompare(a));
    } catch {
      return [];
    }
  },

  readLogs: (options: { date?: string; lines?: number; level?: string }) => {
    try {
      const date = options.date || new Date().toISOString().split('T')[0];
      const logFile = path.join(LOGS_DIR, `${date}.log`);
      if (!fs.existsSync(logFile)) return [];

      let lines = fs.readFileSync(logFile, 'utf-8').split('\n').filter(l => l.trim());

      if (options.level) {
        const levelTag = `[${options.level.toUpperCase()}]`;
        lines = lines.filter(l => l.includes(levelTag));
      }

      const limit = options.lines || 200;
      return lines.slice(-limit);
    } catch {
      return [];
    }
  },
};

export default logger;
