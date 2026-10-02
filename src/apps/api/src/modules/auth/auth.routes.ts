import { Hono } from 'hono'

import { createAuth, type Auth } from './auth.factory'

type AuthEnvironment = {
  Bindings: any
  Variables: {
    auth: Auth
  }
}

export const authRoutes = new Hono<AuthEnvironment>()

authRoutes.use('/*', async (c, next) => {
  c.set('auth', createAuth(c.env))
  await next()
})

authRoutes.on(['GET', 'POST'], '/*', (c) => {
  return c.var.auth.handler(c.req.raw)
})
