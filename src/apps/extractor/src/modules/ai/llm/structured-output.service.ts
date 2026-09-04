import { z, extractedPolicySchema } from '@copas/contracts';
import { getLogger } from '@copas/logger';
import { DEFAULT_SYSTEM_PROMPT } from './system-prompt.js';

const jsonSchema = (() => {
  const schema = (
    typeof (extractedPolicySchema as any).toJSONSchema === 'function'
      ? (extractedPolicySchema as any).toJSONSchema()
      : typeof (z as any).toJSONSchema === 'function'
        ? (z as any).toJSONSchema(extractedPolicySchema)
        : {}
  ) as any;
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
          logger.debug('Custom LLM client raw output received in {durationMs}ms', {
            durationMs,
            rawResponse: typeof res === 'object' ? JSON.stringify(res) : String(res),
          });

          // Justified: llmClient in tests may return string with fences or raw object
          if (typeof res === 'string') {
            const jsonMatch = res.match(/```(?:json)?\s*([\s\S]*?)\s*```/) ?? [null, res];
            const jsonStr = jsonMatch[1] || res;
            const parsedJson = JSON.parse(jsonStr.trim());
            logger.debug('Custom LLM client parsed JSON before schema validation', {
              parsedJson: JSON.stringify(parsedJson),
            });
            const parsed = extractedPolicySchema.parse(parsedJson);
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

      const durationMs = Math.round((performance.now() - start) * 100) / 100;
      logger.debug('Workers AI raw response received in {durationMs}ms', {
        durationMs,
        model: deps.aiModel,
        rawResponse: typeof response === 'object' ? JSON.stringify(response) : String(response),
      });

      let parsedJson: any;
      try {
        // Justified: Workers AI returns {response: string|object} depending on binding version
        let content = (response as any)?.response ?? (response as any)?.result ?? response;

        // If string contains markdown fences or needs trimming
        if (typeof content === 'string') {
          const trimmed = content.trim();
          const jsonMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/) ?? [null, trimmed];
          content = JSON.parse((jsonMatch[1] || trimmed).trim());
        }

        parsedJson = content;

        // Defensive unwrapping if model wrapped output in response, result or data property
        if (parsedJson && typeof parsedJson === 'object' && !parsedJson.company) {
          if (parsedJson.response && typeof parsedJson.response === 'object' && parsedJson.response.company) {
            parsedJson = parsedJson.response;
          } else if (parsedJson.result && typeof parsedJson.result === 'object' && parsedJson.result.company) {
            parsedJson = parsedJson.result;
          } else if (parsedJson.data && typeof parsedJson.data === 'object' && parsedJson.data.company) {
            parsedJson = parsedJson.data;
          }
        }

        logger.debug('Workers AI parsed JSON before schema validation', {
          model: deps.aiModel,
          parsedJson: typeof parsedJson === 'object' ? JSON.stringify(parsedJson) : String(parsedJson),
        });

        const parsed = extractedPolicySchema.parse(parsedJson);

        logger.info('Workers AI structured output normalized successfully in {durationMs}ms', {
          durationMs,
          model: deps.aiModel,
          policyNumber: parsed.policy?.policyNumber || (parsed as any).policyNumber,
        });

        return parsed;
      } catch (parseErr: any) {
        logger.error('Failed to parse or validate schema against Workers AI response in {durationMs}ms: {error}', {
          durationMs,
          model: deps.aiModel,
          error: parseErr?.message ?? String(parseErr),
          rawResponse: typeof response === 'object' ? JSON.stringify(response) : String(response),
          parsedJson: typeof parsedJson !== 'undefined' ? (typeof parsedJson === 'object' ? JSON.stringify(parsedJson) : String(parsedJson)) : undefined,
        });
        throw parseErr;
      }
    },
  };
};

export type StructuredOutputService = ReturnType<typeof createStructuredOutputService>;
