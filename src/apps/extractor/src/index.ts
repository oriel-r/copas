import { Hono } from 'hono';
import { createAiService } from './modules/ai/ai.service';

const app = new Hono();

app.get('/', (c) => {
  return c.text('Hello Hono!');
});

const handler = Object.assign(app, {
  fetch: app.fetch.bind(app),
  async queue(batch: MessageBatch<any>, env: any, ctx: ExecutionContext) {
    if (batch?.messages) {
      const aiService = createAiService(env.AI_RESULT_QUEUE, env.MISTRAL_API_KEY, env.AI);
      for (const message of batch.messages) {
        const body = message.body;
        const payload = body?.payload ?? body;
        if (payload?.documentUrl) {
          await aiService.processDocument(payload);
        }
      }
    }
  },
});

export default handler;

