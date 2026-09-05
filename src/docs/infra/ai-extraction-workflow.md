---
type: convention
producer: agent/gemini-3.8-flash
status: active
created: 2026-09-04
updated:
expires: 2027-09-04
deprecatedReason: ""
supersededBy: ""
---

# AI Extraction Workflow

Durable execution pipeline for insurance policy extraction using Cloudflare Workflows (`cloudflare:workflows`).

```mermaid
sequenceDiagram
    autonumber

    actor pas as PAS
    participant api as API
    participant r2 as Storage (R2)
    participant q_in as Queue: copas-ai-extraction
    participant extractor as Extractor (Queue Consumer)
    participant wf as PolicyExtractionWorkflow
    participant mistral as Mistral OCR
    participant llm as Workers AI (Gemma)
    participant q_out as Queue: copas-ai-result
    participant db as D1 (DB)

    pas->>api: POST /policies/upload-url
    api-->>pas: 200 { uploadUrl, policyAssetKey }
    pas->>r2: PUT document binary
    r2-->>pas: 200 OK

    r2-)api: object-create
    api->>db: INSERT ai_extraction_results (status: pending) -> aiExtractionResultId
    api->>r2: Generate presigned read URL (5 min TTL)
    r2-->>api: documentUrl
    api-)q_in: Envelope { type: 'ai-extraction', payload: { aiExtractionResultId, documentUrl } }

    q_in->>extractor: Consume message
    extractor->>wf: env.EXTRACTION_WORKFLOW.create({ id: aiExtractionResultId, params })
    extractor->>q_in: ack()

    Note over wf,mistral: Step 1: step.do('mistral-ocr')
    wf->>mistral: POST /v1/ocr (documentUrl)
    mistral-->>wf: markdownText (memoized)

    Note over wf,llm: Step 2: step.do('workers-ai-structuring')
    wf->>llm: run(AI_MODEL, { json_schema, content: markdownText })
    llm-->>wf: structuredPayload (ExtractedPolicy)

    Note over wf,q_out: Step 3: step.do('dispatch-ai-result')
    wf-)q_out: Envelope { type: 'ai-result', payload: { aiExtractionResultId, structuredPayload } }

    q_out->>api: Consume result
    api->>db: UPDATE ai_extraction_results (status: on_review) + INSERT policies
    db-->>api: commit
```

## Workflow Steps

### 1. `mistral-ocr`
- **Action**: Sends `documentUrl` to Mistral OCR API (`mistral-ocr-latest`).
- **Output**: Full document in Markdown format (`markdownText`).
- **Retry Policy**: 3 retries, exponential backoff (base delay 10s), timeout 5m.
- **Memoization**: Result is durably persisted by Cloudflare Workflows. Downstream step retries never re-invoke Mistral OCR.

### 2. `workers-ai-structuring`
- **Action**: Invokes Cloudflare Workers AI model (`@cf/google/gemma-4-26b-a4b-it`) with `json_schema` constrained to `extractedPolicySchema`.
- **Input**: `markdownText` from Step 1.
- **Output**: Validated `ExtractedPolicy` JSON structure.
- **Retry Policy**: 3 retries, linear backoff (base delay 5s), timeout 2m.

### 3. `dispatch-ai-result`
- **Action**: Enqueues result message into `AI_RESULT_QUEUE` (`copas-ai-result`).
- **Payload**: `{ aiExtractionResultId, structuredPayload }`.
- **Metadata**: `{ organizationId, idempotencyKey: aiExtractionResultId, requestId }`.
- **Retry Policy**: 3 retries, constant backoff (5s), timeout 30s.

## Idempotency Rules

- **Deterministic Instance ID**: Workflows are initiated using `id = payload.aiExtractionResultId`.
- **At-Least-Once Delivery**: Duplicate queue deliveries from `copas-ai-extraction` resolve to the existing workflow instance via `create()` deduplication, preventing duplicate processing runs.
- **Result Idempotency**: `api` validates `aiExtractionResultId` prior to database writes in `policies.service.ts`.

## See also

- [AI Service](/docs/servicios/ai-service.md)
- [Queues](/src/docs/infra/queues.md)
- [Worker Boundaries](/src/docs/infra/worker-boundaries.md)
