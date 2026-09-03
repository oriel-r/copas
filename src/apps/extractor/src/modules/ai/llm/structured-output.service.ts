import { zodToJsonSchema } from 'zod-to-json-schema';
import { extractedPolicySchema } from '@copas/contracts';
import { getLogger } from '@copas/logger';
import { DEFAULT_SYSTEM_PROMPT } from './system-prompt.js';

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
  llmClient?: { generateStructured: (p: any) => Promise<any> };
}) => {
  const logger = getLogger(['extractor', 'llm']);

  return {
    normalizeToSchema: async (markdownText: string) => {
      logger.info('Starting LLM structured output normalization for model {model}', {
        model: deps.aiModel,
        markdownLength: markdownText.length,
      });
      const start = performance.now();

      if (deps.llmClient && typeof deps.llmClient.generateStructured === 'function') {
        try {
          const res = await deps.llmClient.generateStructured({
            markdown: markdownText,
            schema: extractedPolicySchema,
          });
          const durationMs = Math.round((performance.now() - start) * 100) / 100;

          // Justified: llmClient in tests may return string with fences or raw object
          if (typeof res === 'string') {
            const jsonMatch = res.match(/```(?:json)?\s*([\s\S]*?)\s*```/) ?? [null, res];
            const jsonStr = jsonMatch[1] || res;
            const parsed = extractedPolicySchema.parse(JSON.parse(jsonStr.trim()));
            logger.info('Custom LLM client normalized schema in {durationMs}ms', {
              durationMs,
            });
            return parsed;
          }
          const parsed = extractedPolicySchema.parse(res);
          logger.info('Custom LLM client normalized schema in {durationMs}ms', {
            durationMs,
          });
          return parsed;
        } catch (err: any) {
          const durationMs = Math.round((performance.now() - start) * 100) / 100;
          logger.error('Custom LLM client normalization failed after {durationMs}ms: {error}', {
            durationMs,
            error: err?.message ?? String(err),
          });
          throw err;
        }
      }

      const ai = deps.workersAi;
      if (!ai || typeof ai.run !== 'function') {
        throw new Error('Missing AI binding: workersAi.run not available');
      }

      const systemPrompt = DEFAULT_SYSTEM_PROMPT;

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
        const durationMs = Math.round((performance.now() - start) * 100) / 100;
        const msg = err?.message ?? String(err);
        if (msg.includes("JSON Mode couldn't be met")) {
          logger.error('Workers AI JSON mode failed after {durationMs}ms: {error}', {
            durationMs,
            model: deps.aiModel,
            error: msg,
          });
          throw new Error(`JSON Mode couldn't be met for model ${deps.aiModel}: ${msg}`);
        }
        logger.error('Workers AI run failed after {durationMs}ms: {error}', {
          durationMs,
          model: deps.aiModel,
          error: msg,
        });
        throw err;
      }

      try {
        // Justified: Workers AI returns {response: string|object} depending on binding version
        const content = (response as any)?.response ?? response;

        // With json_schema Gemma never returns fences, so no fence parsing here
        const parsedJson = typeof content === 'string' ? JSON.parse(content.trim()) : content;
        const parsed = extractedPolicySchema.parse(parsedJson);
        const durationMs = Math.round((performance.now() - start) * 100) / 100;

        logger.info('Workers AI structured output normalized successfully in {durationMs}ms', {
          durationMs,
          model: deps.aiModel,
          policyNumber: parsed.policy?.policyNumber || (parsed as any).policyNumber,
        });

        return parsed;
      } catch (parseErr: any) {
        const durationMs = Math.round((performance.now() - start) * 100) / 100;
        logger.error('Failed to parse or validate schema against Workers AI response in {durationMs}ms: {error}', {
          durationMs,
          model: deps.aiModel,
          error: parseErr?.message ?? String(parseErr),
        });
        throw parseErr;
      }
    },
  };
};

export type StructuredOutputService = ReturnType<typeof createStructuredOutputService>;
