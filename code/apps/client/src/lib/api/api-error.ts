export class ApiError extends Error {
  readonly status: number
  readonly statusText: string
  readonly details: unknown

  constructor(status: number, statusText: string, message: string, details: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.statusText = statusText
    this.details = details
  }

  static async fromResponse(response: Response): Promise<ApiError> {
    const details = await parseDetails(response)

    return new ApiError(
      response.status,
      response.statusText,
      extractMessage(details) ?? response.statusText,
      details,
    )
  }
}

async function parseDetails(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') ?? ''

  if (contentType.includes('application/json')) {
    try {
      return await response.json()
    } catch {
      return null
    }
  }

  const text = await response.text()
  return text || null
}

function extractMessage(details: unknown): string | null {
  if (
    typeof details === 'object' &&
    details !== null &&
    'message' in details &&
    typeof (details as { message: unknown }).message === 'string'
  ) {
    return (details as { message: string }).message
  }

  return null
}
