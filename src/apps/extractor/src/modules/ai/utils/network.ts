/**
 * Network and URL reachability utilities.
 */

const LOCAL_HOSTNAMES = new Set([
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
  '[::1]',
]);

const PRIVATE_IP_PREFIXES = /^(10\.|192\.168\.|169\.254\.)/;
const RFC1918_172_REGEX = /^172\.(\d+)\./;

/**
 * Evaluates whether a URL is publicly routable on the open internet.
 * Returns false for loopback, local DNS domains, and RFC 1918 / link-local private IP ranges.
 */
export function isPublicWebUrl(urlStr: string): boolean {
  try {
    const parsed = new URL(urlStr);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }

    const hostname = parsed.hostname.toLowerCase();

    if (
      LOCAL_HOSTNAMES.has(hostname) ||
      hostname.endsWith('.local') ||
      hostname.endsWith('.internal') ||
      hostname.endsWith('.localhost')
    ) {
      return false;
    }

    if (PRIVATE_IP_PREFIXES.test(hostname)) {
      return false;
    }

    const match172 = hostname.match(RFC1918_172_REGEX);
    if (match172) {
      const octet = parseInt(match172[1], 10);
      if (octet >= 16 && octet <= 31) {
        return false;
      }
    }

    return true;
  } catch {
    return false;
  }
}
