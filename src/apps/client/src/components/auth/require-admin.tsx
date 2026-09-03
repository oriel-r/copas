import type { ReactNode } from 'react';

/**
 * HOC to protect /admin routes.
 * Must verify session exists and session.user.role === 'admin'.
 */
export function RequireAdmin({ children: _children }: { children?: ReactNode }) {
  throw new Error('Not implemented: check session role and redirect if not admin');
}
