export const extractionStatus = [
  'pending',
  'processing',
  'on_review',
  'approved',
  'approved_with_corrections',
  'failed',
] as const
export type ExtractionStatus = (typeof extractionStatus)[number]
