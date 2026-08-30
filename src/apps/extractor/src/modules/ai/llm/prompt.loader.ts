import { DEFAULT_SYSTEM_PROMPT } from './system-prompt.js';

export const loadSystemPrompt = async (bucket: any, promptR2Key: string): Promise<string> => {
  if (!bucket || typeof bucket.get !== 'function') {
    return DEFAULT_SYSTEM_PROMPT;
  }
  if (!promptR2Key?.trim()) {
    console.warn('prompt.loader: empty promptR2Key, using default system prompt');
    return DEFAULT_SYSTEM_PROMPT;
  }
  try {
    const obj = await bucket.get(promptR2Key);
    if (!obj) {
      console.warn('prompt.loader: R2 object not found, using default system prompt', { promptR2Key });
      return DEFAULT_SYSTEM_PROMPT;
    }
    const text = await obj.text();
    if (!text?.trim()) {
      console.warn('prompt.loader: R2 object empty, using default system prompt', { promptR2Key });
      return DEFAULT_SYSTEM_PROMPT;
    }
    return text.trim();
  } catch (err) {
    console.warn('prompt.loader: failed to load prompt from R2, using default system prompt', {
      promptR2Key,
      error: err instanceof Error ? err.message : String(err),
    });
    return DEFAULT_SYSTEM_PROMPT;
  }
};
