import { Hono } from 'hono'
import { cors } from 'hono/cors'

import { authRoutes } from './modules/auth'

const app = new Hono<{ Bindings: CloudflareBindings }>()

app.get('/', (c) => {
  return c.json({ service: 'api', status: 'ok' })
})

app.use(
  '/auth/*',
  cors({
    origin: (origin, c) => {
      return origin === c.env.CLIENT_URL ? origin : ''
    },
    credentials: true,
  }),
)

app.route('/auth', authRoutes)

export default app
