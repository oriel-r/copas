import { createMiddleware } from 'hono/factory';
import { createAuth } from '../../modules/auth/auth.factory';
import type { AppEnv } from '../types/env';

export const sessionMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  // Bypass auth infra routes - no need to lookup session
  const path = c.req.path;
  if (path.startsWith('/auth') || path === '/') {
    await next();
    return;
  }

  try {
    const auth = createAuth(c.env as CloudflareBindings);
    // Docs exact: auth.api.getSession({ headers: c.req.raw.headers })
    const session = await auth.api.getSession({
      headers: c.req.raw.headers,
    });

    // Better Auth Infer: { session: {activeOrganizationId,...}, user: {...} } | null
    const organizationId = (session as any)?.session?.activeOrganizationId ?? null;
    const user = (session as any)?.user ?? null;
    const userId = user?.id ?? (session as any)?.session?.userId ?? null;

    c.set('session' as any, session);
    c.set('user' as any, user);
    c.set('userId' as any, userId);
    c.set('organizationId' as any, organizationId);
  } catch {
    c.set('session' as any, null);
    c.set('user' as any, null);
    c.set('userId' as any, null);
    c.set('organizationId' as any, null);
  }

  await next();
});
