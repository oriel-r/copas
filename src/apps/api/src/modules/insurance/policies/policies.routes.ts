import { Hono } from 'hono';
import { uploadUrlRequestSchema } from './policies.schema';
import { createPolicyRequestSchema } from '@copas/contracts';
import type { PoliciesService } from './policies.service';
import type { AppEnv } from '../../../core/types/env';

export function createPoliciesRouter(deps?: PoliciesService | { policiesService: PoliciesService }) {
  const service = (deps as any)?.policiesService ?? deps;

  const getService = (c: any): PoliciesService => {
    return service ?? c.get('services')?.insurance?.policies ?? c.get('insuranceModule')?.policiesService ?? c.get('policiesService');
  };

  const router = new Hono<AppEnv>()
    .get('/', async (c) => {
      const s = getService(c);
      const result = await s.list();
      return c.json(result, 200);
    })
    .get('/documents/*', async (c) => {
      const bucket = (c.env as any)?.DOCUMENT_BUCKET;
      const prefix = '/policies/documents/';
      const rawPath = c.req.path;
      const key = rawPath.startsWith(prefix) ? rawPath.slice(prefix.length) : rawPath;

      if (!bucket || typeof bucket.get !== 'function') {
        return c.text('Document storage not available', 503);
      }

      const object = await bucket.get(key);
      if (!object) {
        return c.json({ error: 'Document not found' }, 404);
      }

      const headers = new Headers();
      if (typeof object.writeHttpMetadata === 'function') {
        object.writeHttpMetadata(headers);
      }
      if (object.httpEtag) {
        headers.set('etag', object.httpEtag);
      }
      headers.set('content-type', headers.get('content-type') || 'application/pdf');

      return new Response(object.body, { headers });
    })
    .get('/extractions/:id', async (c) => {
      const s = getService(c);
      const id = c.req.param('id');
      const extractor = (s as any).getExtractionResult ?? (s as any).getExtraction;
      if (typeof extractor === 'function') {
        const result = await extractor.call(s, id);
        if (!result) return c.json({ error: 'Extraction not found' }, 404);
        return c.json(result, 200);
      }
      return c.json({ error: 'Not implemented' }, 501);
    })
    .get('/:id', async (c) => {
      const s = getService(c);
      const id = c.req.param('id');
      const result = await s.getById(id);
      if (!result) {
        return c.json({ error: 'Policy not found' }, 404);
      }
      return c.json(result, 200);
    })
    .post('/', async (c) => {
      const body = await c.req.json();
      const parsed = createPolicyRequestSchema.safeParse(body);
      if (!parsed.success) {
        return c.json({ error: parsed.error }, 400);
      }
      const s = getService(c);
      const created = await s.create(parsed.data);
      return c.json(created, 201);
    })
    .put('/:id', async (c) => {
      const id = c.req.param('id');
      const body = await c.req.json();
      const s = getService(c);
      const updater = (s as any).update ?? (s as any).updatePolicy;
      if (typeof updater !== 'function') return c.json({ error: 'Not implemented' }, 501);
      const updated = await updater.call(s, id, body);
      if (!updated) return c.json({ error: 'Policy not found' }, 404);
      return c.json(updated, 200);
    })
    .post('/upload-url', async (c) => {
      const body = await c.req.json();
      const parsed = uploadUrlRequestSchema.safeParse(body);
      if (!parsed.success) {
        return c.json({ error: parsed.error }, 400);
      }
      const s = getService(c);
      const organizationId = c.get('organizationId' as any) as string | null;
      if (!organizationId) return c.json({ error: 'organization required' }, 401);
      const result = await s.generateUploadUrl(parsed.data, organizationId);
      return c.json(result, 200);
    })
    .post('/upload', async (c) => {
      const organizationId = c.get('organizationId' as any) as string | null;
      if (!organizationId) return c.json({ error: 'organization required' }, 401);
      const bucket = (c.env as any)?.DOCUMENT_BUCKET;

      const contentType = c.req.header('content-type') || '';
      let fileBuffer: ArrayBuffer | null = null;
      let filename = 'policy.pdf';

      if (contentType.includes('multipart/form-data')) {
        const formData = await c.req.formData();
        const file = formData.get('file') as File | null;
        if (!file) {
          return c.json({ error: 'No file provided in form data' }, 400);
        }
        filename = file.name || filename;
        fileBuffer = await file.arrayBuffer();
      } else {
        fileBuffer = await c.req.arrayBuffer();
      }

      const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'id-1';
      const policyAssetKey = `${organizationId}/${id}-${filename}`;

      if (bucket && typeof bucket.put === 'function') {
        await bucket.put(policyAssetKey, fileBuffer, {
          httpMetadata: { contentType: 'application/pdf' },
        });
      }

      const baseUrl = (c.env as any)?.BACKEND_URL || (c.env as any)?.API_URL || (c.req.url ? new URL(c.req.url).origin : '') || 'http://localhost:8788';
      const documentUrl = `${baseUrl}/policies/documents/${policyAssetKey}`;

      return c.json({
        policyAssetKey,
        documentUrl,
        filename,
      }, 201);
    })
    .post('/extract', async (c) => {
      const body = await c.req.json();
      const policyAssetKey = body?.policyAssetKey || body?.documentUrl;
      if (!policyAssetKey) {
        return c.json({ error: 'policyAssetKey or documentUrl is required' }, 400);
      }
      const s = getService(c);
      const organizationId = c.get('organizationId' as any) as string | null;
      if (!organizationId) return c.json({ error: 'organization required' }, 401);

      const baseUrl = (c.env as any)?.BACKEND_URL || (c.env as any)?.API_URL || (c.req.url ? new URL(c.req.url).origin : '') || 'http://localhost:8788';
      const documentUrl =
        policyAssetKey.startsWith('http://') ||
        policyAssetKey.startsWith('https://') ||
        policyAssetKey.startsWith('data:')
          ? policyAssetKey
          : `${baseUrl}/policies/documents/${policyAssetKey}`;

      const userId = c.get('userId' as any) as string | null;
      const result = await (s as any).triggerExtraction(documentUrl, organizationId, userId ?? body?.userId ?? 'usr-1');
      return c.json(result, 202);
    })
    .post('/process-ai-result', async (c) => {
      const body = await c.req.json();
      if (!body || !body.structuredPayload) {
        return c.json({ error: 'structuredPayload is required' }, 400);
      }
      const s = getService(c);
      const created = await s.processAiResult(body);
      return c.json({ success: true, policy: created }, 200);
    });

  return router;
}

export const policiesRouter = createPoliciesRouter();
export type PoliciesRoutesType = typeof policiesRouter;



