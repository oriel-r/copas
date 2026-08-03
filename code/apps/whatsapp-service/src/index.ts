import { Hono } from 'hono'

const app = new Hono()
// Comentario temporal para probar workflow
app.get('/', (c) => {
  return c.text('Hello Hono!')
})

export default app
