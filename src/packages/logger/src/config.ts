import {
  configure,
  configureSync,
  getConsoleSink,
  jsonLinesFormatter,
  type LogLevel,
  type Sink,
} from '@logtape/logtape';
import { prettyFormatter } from '@logtape/pretty';
import { AsyncLocalStorage } from 'node:async_hooks';

export interface LoggerConfigOptions {
  appName: string;
  environment?: string; // 'development' | 'staging' | 'production' | 'test'
  lowestLevel?: LogLevel;
  reset?: boolean;
}

let isConfigured = false;
let configuredEnv: string | undefined;

function resolveLowestLevel(env: string, explicitLevel?: LogLevel): LogLevel {
  if (explicitLevel) return explicitLevel;
  
  const envLogLevel = (typeof process !== 'undefined' && process.env?.LOG_LEVEL?.toLowerCase()) as LogLevel | undefined;
  if (envLogLevel && ['debug', 'info', 'warning', 'error', 'fatal'].includes(envLogLevel)) {
    return envLogLevel;
  }

  if (env === 'development') return 'debug';
  if (env === 'test') return 'warning';
  return 'info';
}

function createConsoleSink(env: string): Sink {
  if (env === 'development') {
    return getConsoleSink({
      formatter: prettyFormatter,
    });
  }

  return getConsoleSink({
    formatter: jsonLinesFormatter,
  });
}

/**
 * Configure LogTape synchronously for edge/serverless runtimes.
 * Safe to call multiple times; subsequent calls with the same environment are no-ops.
 */
export function ensureLogger(options: LoggerConfigOptions): void {
  const env = options.environment || 'development';

  if (isConfigured && configuredEnv === env && !options.reset) {
    return;
  }

  const lowestLevel = resolveLowestLevel(env, options.lowestLevel);
  const sink = createConsoleSink(env);

  try {
    configureSync({
      reset: options.reset ?? isConfigured,
      contextLocalStorage: new AsyncLocalStorage(),
      sinks: {
        console: sink,
      },
      loggers: [
        {
          category: ['logtape', 'meta'],
          lowestLevel: 'warning',
          sinks: ['console'],
        },
        {
          category: [],
          lowestLevel,
          sinks: ['console'],
        },
      ],
    });
    isConfigured = true;
    configuredEnv = env;
  } catch (err: any) {
    if (err?.name === 'ConfigError' || err?.message?.includes('Already configured')) {
      isConfigured = true;
      configuredEnv = env;
      return;
    }
    throw err;
  }
}

/**
 * Async variant of ensureLogger for startup scripts or initialization workflows.
 */
export async function setupLogger(options: LoggerConfigOptions): Promise<void> {
  const env = options.environment || 'development';

  if (isConfigured && configuredEnv === env && !options.reset) {
    return;
  }

  const lowestLevel = resolveLowestLevel(env, options.lowestLevel);
  const sink = createConsoleSink(env);

  try {
    await configure({
      reset: options.reset ?? isConfigured,
      contextLocalStorage: new AsyncLocalStorage(),
      sinks: {
        console: sink,
      },
      loggers: [
        {
          category: ['logtape', 'meta'],
          lowestLevel: 'warning',
          sinks: ['console'],
        },
        {
          category: [],
          lowestLevel,
          sinks: ['console'],
        },
      ],
    });
    isConfigured = true;
    configuredEnv = env;
  } catch (err: any) {
    if (err?.name === 'ConfigError' || err?.message?.includes('Already configured')) {
      isConfigured = true;
      configuredEnv = env;
      return;
    }
    throw err;
  }
}
