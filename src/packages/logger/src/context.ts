import { withContext } from '@logtape/logtape';

export interface LogContextData {
  requestId?: string;
  organizationId?: string | null;
  userId?: string | null;
  queue?: string;
  aiExtractionResultId?: string;
  documentUrl?: string;
  attempts?: number;
  method?: string;
  path?: string;
  clientIp?: string;
  userAgent?: string;
  durationMs?: number;
  [key: string]: unknown;
}

/**
 * Executes a callback with the given log context attached to any logger invocations
 * within its asynchronous execution tree via AsyncLocalStorage.
 */
export function withLogContext<T>(
  context: LogContextData,
  fn: () => T
): T {
  // Filter out undefined values to keep context compact
  const cleanContext: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(context)) {
    if (value !== undefined) {
      cleanContext[key] = value;
    }
  }
  return withContext(cleanContext, fn);
}
