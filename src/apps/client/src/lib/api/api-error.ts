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
  if (typeof details === 'object' && details !== null) {
    const d = details as Record<string, unknown>

    if (typeof d.message === 'string') {
      return d.message
    }

    if (typeof d.error === 'object' && d.error !== null) {
      const err = d.error as Record<string, unknown>
      if (typeof err.message === 'string') {
        return err.message
      }
    }

    if (Array.isArray(d.errors)) {
      const firstError = d.errors[0]
      if (typeof firstError === 'object' && firstError !== null) {
        const fe = firstError as Record<string, unknown>
        if (typeof fe.message === 'string') {
          return fe.message
        }
      }
      if (typeof firstError === 'string') {
        return firstError
      }
    }

    if (Array.isArray(d.issues)) {
      const firstIssue = d.issues[0]
      if (typeof firstIssue === 'object' && firstIssue !== null) {
        const fi = firstIssue as Record<string, unknown>
        if (typeof fi.message === 'string') {
          return fi.message
        }
      }
    }
  }

  if (typeof details === 'string') {
    return details
  }

  return null
}
