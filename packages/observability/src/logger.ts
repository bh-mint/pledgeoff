import pino from 'pino';
import type { LogContext } from './types';

const isDev = process.env.NODE_ENV === 'development';

const baseLogger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  ...(isDev && {
    transport: {
      target: 'pino-pretty',
      options: { colorize: true },
    },
  }),
});

export type Logger = {
  info(ctx: LogContext, msg: string): void;
  warn(ctx: LogContext, msg: string): void;
  error(ctx: LogContext, msg: string): void;
  debug(ctx: LogContext, msg: string): void;
};

export function createLogger(bindings: Record<string, unknown> = {}): Logger {
  const child = baseLogger.child(bindings);
  return {
    info: (ctx, msg) => child.info(ctx, msg),
    warn: (ctx, msg) => child.warn(ctx, msg),
    error: (ctx, msg) => child.error(ctx, msg),
    debug: (ctx, msg) => child.debug(ctx, msg),
  };
}

export const logger = createLogger();
