import type { Envelope } from '../../shared/queue'
import type { ExtractedPolicy } from '../insurance/extraction.schema'

export type AiQueuePayload = {
  aiExtractionResultId: string
  documentUrl: string
  userId?: string
}

export type AiQueueMessage = Envelope<AiQueuePayload> & { type: 'ai-extraction' }

export type AiResultQueuePayload = {
  aiExtractionResultId: string
  structuredPayload: ExtractedPolicy
  userId?: string
}

export type AiResultQueueMessage = Envelope<AiResultQueuePayload> & { type: 'ai-result' }
