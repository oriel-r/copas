import type { Queue } from '@cloudflare/workers-types';
import { extractedPolicySchema, type AiQueuePayload, type AiResultQueueMessage, type ExtractedPolicy } from '@copas/contracts';

export function createAiService(
  arg1?: any,
  arg2?: any,
  arg3?: any
) {
  const depsObj = typeof arg1 === 'object' && arg1 !== null ? arg1 : {};

  const ocrClient = depsObj.ocrClient ?? (arg1 && typeof arg1.process === 'function' ? arg1 : null);
  const llmClient = depsObj.llmClient ?? (arg2 && typeof arg2.generateStructured === 'function' ? arg2 : null);
  const aiResultQueue = depsObj.aiResultQueue ?? depsObj.queue ?? (arg1 && typeof arg1.send === 'function' ? arg1 : null);
  const mistralApiKey = typeof arg2 === 'string' ? arg2 : depsObj.mistralApiKey;
  const workersAi = depsObj.workersAi ?? depsObj.AI ?? arg3;

  const service = {
    extractMarkdown: async (documentUrl: string): Promise<string> => {
      if (ocrClient && typeof ocrClient.process === 'function') {
        const res = await ocrClient.process(documentUrl);
        return typeof res === 'string' ? res : (res?.markdown ?? res?.text ?? '');
      }

      const res = await fetch('https://api.mistral.ai/v1/ocr', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${mistralApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'mistral-ocr-latest',
          document: {
            type: 'document_url',
            document_url: documentUrl,
          },
        }),
      });

      if (!res.ok) {
        throw new Error(`Mistral OCR failed: ${res.statusText}`);
      }

      const data: any = await res.json();
      if (data?.pages && Array.isArray(data.pages)) {
        return data.pages.map((p: any) => p.markdown).join('\n\n');
      }
      return data?.markdown ?? data?.text ?? '';
    },

    normalizeToSchema: async (markdownText: string): Promise<ExtractedPolicy> => {
      if (llmClient && typeof llmClient.generateStructured === 'function') {
        const res = await llmClient.generateStructured({ markdown: markdownText, schema: extractedPolicySchema });
        return extractedPolicySchema.parse(res);
      }

      const ai = workersAi?.AI ?? workersAi;
      const prompt = `Extrae los datos de la siguiente póliza en formato JSON estructurado:\n\n${markdownText}`;
      
      let response: any;
      if (ai && typeof ai.run === 'function') {
        response = await ai.run('@cf/meta/llama-3.3-70b-instruct', {
          messages: [
            {
              role: 'system',
              content: 'Eres un extractor experto de pólizas de seguros. Devuelve exclusivamente un objeto JSON válido.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
        });
      }

      let content = response?.response ?? response;
      let parsed: any;
      if (typeof content === 'string') {
        const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/) ?? [null, content];
        const jsonStr = jsonMatch[1] || content;
        try {
          parsed = JSON.parse(jsonStr.trim());
        } catch {
          parsed = JSON.parse(content.trim());
        }
      } else {
        parsed = content;
      }

      return extractedPolicySchema.parse(parsed);
    },

    extractPolicy: async (documentUrl: string): Promise<ExtractedPolicy> => {
      const markdown = await service.extractMarkdown(documentUrl);
      const structured = await service.normalizeToSchema(markdown);
      return extractedPolicySchema.parse(structured);
    },

    processDocument: async (payload: AiQueuePayload): Promise<ExtractedPolicy> => {
      const extracted = await service.extractPolicy(payload.documentUrl);

      if (aiResultQueue && typeof aiResultQueue.send === 'function') {
        await aiResultQueue.send({
          type: 'ai-result',
          payload: {
            aiExtractionResultId: payload.aiExtractionResultId,
            structuredPayload: extracted,
          },
          metadata: {
            organizationId: (payload as any).organizationId ?? (payload as any).tenantId ?? 'default',
            idempotencyKey: payload.aiExtractionResultId,
          },
        });
      }

      return extracted;
    },
  };

  return service;
}

export type AiService = ReturnType<typeof createAiService>;


