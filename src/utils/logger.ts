import pino from 'pino';
import { requestContext } from './asyncContext';

const isDev = process.env.NODE_ENV === 'development';
const isTest = process.env.NODE_ENV === 'test';

const level = isTest ? 'warn' : isDev ? 'debug' : 'info';

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

export const logger = {
  info: (msg: string, objOrMsg?: any, obj?: any) => {
    if (obj) baseLogger.info(obj, `[${msg}] ${objOrMsg}`);
    else if (objOrMsg !== undefined) baseLogger.info(objOrMsg, msg);
    else baseLogger.info(msg);
  },
  warn: (msg: string, objOrMsg?: any, obj?: any) => {
    if (obj) baseLogger.warn(obj, `[${msg}] ${objOrMsg}`);
    else if (objOrMsg !== undefined) baseLogger.warn(objOrMsg, msg);
    else baseLogger.warn(msg);
  },
  error: (msg: string, objOrMsg?: any, obj?: any) => {
    if (obj) baseLogger.error(obj, `[${msg}] ${objOrMsg}`);
    else if (objOrMsg !== undefined) baseLogger.error(objOrMsg, msg);
    else baseLogger.error(msg);
  },
  debug: (msg: string, objOrMsg?: any, obj?: any) => {
    if (obj) baseLogger.debug(obj, `[${msg}] ${objOrMsg}`);
    else if (objOrMsg !== undefined) baseLogger.debug(objOrMsg, msg);
    else baseLogger.debug(msg);
  },

  /**
   * Specialized logger for Prisma errors to reduce noise.
   */
  prismaError: (msg: string, err: any) => {
    if (err && typeof err === 'object' && err.constructor.name.includes('Prisma')) {
      // Extract essential info from Prisma errors
      const prismaInfo = {
        code: err.code,
        message: err.message?.split('\n').shift(), // Only first line
        meta: err.meta,
        clientVersion: err.clientVersion,
      };
      baseLogger.error({ prisma: prismaInfo }, msg);
    } else {
      baseLogger.error({ err }, msg);
    }
  },
};

export default logger;
