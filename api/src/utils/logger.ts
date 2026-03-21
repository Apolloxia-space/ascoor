type LogLevel = 'info' | 'warn' | 'error' | 'debug';

const logFn: Record<LogLevel, (msg: unknown, ...args: Array<unknown>) => void> = {
  info: console.log,
  warn: console.warn,
  error: console.error,
  debug: console.debug ?? console.log,
};

const severityByLevel: Record<LogLevel, 'INFO' | 'WARNING' | 'ERROR' | 'DEBUG'> = {
  info: 'INFO',
  warn: 'WARNING',
  error: 'ERROR',
  debug: 'DEBUG',
};

export const logger = {
  log: (level: LogLevel, message: string, meta: Record<string, unknown> = {}) => {
    const record = {
      severity: severityByLevel[level],
      level,
      message,
      ...meta,
      ts: new Date().toISOString(),
    };
    try {
      logFn[level](JSON.stringify(record));
    } catch {
      logFn[level](
        JSON.stringify({
          severity: severityByLevel[level],
          level,
          message,
          ts: new Date().toISOString(),
          logger_error: 'failed_to_serialize_log_record',
        }),
      );
    }
  },
  info: (message: string, meta: Record<string, unknown> = {}) => logger.log('info', message, meta),
  warn: (message: string, meta: Record<string, unknown> = {}) => logger.log('warn', message, meta),
  error: (message: string, meta: Record<string, unknown> = {}) =>
    logger.log('error', message, meta),
  debug: (message: string, meta: Record<string, unknown> = {}) =>
    logger.log('debug', message, meta),
};
