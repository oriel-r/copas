import { Hono } from 'hono'

const app = new Hono()
// Comentario temporal debe borrarse en el siguiente commit
app.get('/', (c) => {
  return c.text('Hello Hono!')
})

export default app
