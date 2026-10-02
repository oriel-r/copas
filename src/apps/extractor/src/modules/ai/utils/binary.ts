/**
 * Binary and Base64 conversion utilities.
 */

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(buffer).toString('base64');
  }
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const chunkSize = 8192;
  for (let i = 0; i < bytes.byteLength; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

export function toDataUri(buffer: ArrayBuffer, mimeType: string = 'application/pdf'): string {
  const base64 = arrayBufferToBase64(buffer);
  return `data:${mimeType};base64,${base64}`;
}
