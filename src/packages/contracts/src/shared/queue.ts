export type Envelope<T = unknown> = {
  type: string
  payload: T
  metadata?: {
    organizationId: string
    idempotencyKey: string
    requestId?: string
  }
}
