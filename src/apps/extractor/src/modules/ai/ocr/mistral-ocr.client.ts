export const createMistralOcrClient = (deps: { mistralApiKey: string }) => ({
  process: async (documentUrl: string): Promise<string> => {
    if (!deps.mistralApiKey) {
      throw new Error('Missing mistralApiKey');
    }

    const res = await fetch('https://api.mistral.ai/v1/ocr', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${deps.mistralApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'mistral-ocr-latest',
        document: { type: 'document_url', document_url: documentUrl },
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText);
      throw new Error(`Mistral OCR failed: ${res.status} ${res.statusText} - ${errText}`);
    }

    const data: any = await res.json();
    if (Array.isArray(data?.pages)) {
      return data.pages.map((p: any) => p.markdown).join('\n\n');
    }
    // Justified fallback: Mistral OCR may return top-level markdown/text in non-paged responses or mocks
    if (typeof data?.markdown === 'string' && data.markdown.trim()) return data.markdown;
    if (typeof data?.text === 'string' && data.text.trim()) return data.text;
    throw new Error('Unexpected Mistral OCR response: missing pages array and markdown/text');

  },
});

export type MistralOcrClient = ReturnType<typeof createMistralOcrClient>;
