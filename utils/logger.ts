const isDev = Boolean((import.meta as any).env?.DEV);
const MAX_STRING_LENGTH = 500;

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

function sanitizeValue(value: unknown): unknown {
  if (typeof value === 'string') {
    return value.length > MAX_STRING_LENGTH ? `${value.slice(0, MAX_STRING_LENGTH)}...` : value;
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message
    };
  }

  if (Array.isArray(value)) {
    return value.slice(0, 20).map(sanitizeValue);
  }

  if (value && typeof value === 'object') {
    return '[Object]';
  }

  return value;
}

function log(level: LogLevel, ...args: unknown[]) {
  if (!isDev && (level === 'debug' || level === 'info')) return;

  const sanitizedArgs = args.map(sanitizeValue);
  console[level](...sanitizedArgs);
}

export const logger = {
  debug: (...args: unknown[]) => log('debug', ...args),
  info: (...args: unknown[]) => log('info', ...args),
  warn: (...args: unknown[]) => log('warn', ...args),
  error: (...args: unknown[]) => log('error', ...args)
};
