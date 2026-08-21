export function requireEnvironmentValue(
  value: string | undefined,
  name: string,
): string {
  if (!value) {
    throw new Error(`Missing required environment value: ${name}`)
  }

  return value
}
