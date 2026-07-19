/**
 * Validates a post-auth redirect target from a query param.
 * Only same-origin path redirects are allowed (e.g. "/schedule?b=gomes-halsey-st");
 * absolute URLs, protocol-relative "//host", and backslash tricks are rejected.
 * Safe to use from both client and server code.
 */
export function safeInternalPath(value: string | null | undefined): string | null {
  if (!value) return null;
  if (!value.startsWith('/')) return null;
  if (value.startsWith('//')) return null;
  if (value.includes('\\')) return null;
  // Control characters can smuggle a scheme past naive parsers.
  // eslint-disable-next-line no-control-regex
  if (/[\x00-\x1f\x7f]/.test(value)) return null;
  return value;
}
