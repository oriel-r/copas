import { zodToJsonSchema } from 'zod-to-json-schema';
import { extractedPolicySchema } from '@copas/contracts';
import { loadSystemPrompt } from './prompt.loader.js';

const jsonSchema = (() => {
  const schema = zodToJsonSchema(extractedPolicySchema as any, {
    target: 'jsonSchema7',
    $refStrategy: 'none',
  }) as any;
  delete schema.$schema;
  return schema;
})();

export const createStructuredOutputService = (deps: {
  workersAi: any;
  aiModel: string;
  bucket: any;
  promptR2Key: string;
  llmClient?: { generateStructured: (p: any) => Promise<any> };
}) => ({
  normalizeToSchema: async (markdownText: string) => {
    if (deps.llmClient && typeof deps.llmClient.generateStructured === 'function') {
      const res = await deps.llmClient.generateStructured({
        markdown: markdownText,
        schema: extractedPolicySchema,
      });
      // Justified: llmClient in tests may return string with fences or raw object
      if (typeof res === 'string') {
        const jsonMatch = res.match(/```(?:json)?\s*([\s\S]*?)\s*```/) ?? [null, res];
        const jsonStr = jsonMatch[1] || res;
        return extractedPolicySchema.parse(JSON.parse(jsonStr.trim()));
      }
      return extractedPolicySchema.parse(res);
    }

    const ai = deps.workersAi;
    if (!ai || typeof ai.run !== 'function') {
      throw new Error('Missing AI binding: workersAi.run not available');
    }

    const systemPrompt = await loadSystemPrompt(deps.bucket, deps.promptR2Key);

    let response: any;
    try {
      response = await ai.run(deps.aiModel, {
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: markdownText },
        ],
        temperature: 0.2,
        reasoning_effort: 'high',
        chat_template_kwargs: { enable_thinking: true },
        response_format: { type: 'json_schema', json_schema: jsonSchema },
      });
    } catch (err: any) {
      const msg = err?.message ?? String(err);
      if (msg.includes("JSON Mode couldn't be met")) {
        throw new Error(`JSON Mode couldn't be met for model ${deps.aiModel}: ${msg}`);
      }
      throw err;
    }

    // Justified: Workers AI returns {response: string|object} depending on binding version
    const content = (response as any)?.response ?? response;

    // With json_schema Gemma never returns fences, so no fence parsing here
    const parsed = typeof content === 'string' ? JSON.parse(content.trim()) : content;

    return extractedPolicySchema.parse(parsed);
  },
});

export type StructuredOutputService = ReturnType<typeof createStructuredOutputService>;
