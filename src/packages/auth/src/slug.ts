export function sanitizeSlug(input: string): string {
  if (!input) return ''

  return input
    .replace(/\./g, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function generateSlug(input: string): string {
  return sanitizeSlug(input)
}
