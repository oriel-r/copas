import { Hono } from 'hono';
import { ensureLogger, getLogger } from '@copas/logger';
import { toDataUri } from './utils/binary.js';
import { createAiService } from './ai.service.js';

export const createAiRouter = () => {
  const router = new Hono<{ Bindings: CloudflareBindings }>();

  router.post('/extract', async (c) => {
    const env = c.env;
    ensureLogger({ appName: 'extractor', environment: (env as any)?.NODE_ENV });
    const logger = getLogger(['extractor', 'http']);

    const contentType = c.req.header('content-type') || '';
    let documentUrl: string | undefined;

    try {
      if (contentType.includes('multipart/form-data')) {
        const formData = await c.req.formData();
        const file = formData.get('file') as File | null;
        if (!file) {
          return c.json({ error: 'No file provided in form data' }, 400);
        }
        const arrayBuffer = await file.arrayBuffer();
        documentUrl = toDataUri(arrayBuffer, file.type || 'application/pdf');
      } else {
        const body = await c.req.json().catch(() => ({}));
        documentUrl = body?.documentUrl;
      }

      if (!documentUrl) {
        return c.json({ error: 'documentUrl or file is required' }, 400);
      }

      const aiService = createAiService({
        aiResultQueue: env?.AI_RESULT_QUEUE,
        mistralApiKey: env?.MISTRAL_API_KEY,
        workersAi: env?.AI,
        aiModel: env?.AI_MODEL,
      });

      logger.info('Processing direct HTTP extraction request');
      const result = await aiService.extractPolicy(documentUrl);
      return c.json(result, 200);
    } catch (err: any) {
      logger.error('Direct HTTP extraction failed: {error}', {
        error: err?.message ?? String(err),
      });
      return c.json({ error: err?.message ?? String(err) }, 500);
    }
  });

  return router;
};
