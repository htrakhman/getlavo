/**
 * Builds the password-recovery confirmation URL that goes into the reset email.
 *
 * WHY A PATH, NOT A QUERY STRING — this is the crux of a bug that was "fixed"
 * three times before it actually stuck:
 *
 * The whole email body is quoted-printable encoded in transit. In QP, `=`
 * followed by two hex digits is an escape sequence that decodes to a single
 * byte (`=05` -> 0x05, `=de` -> 0xDE). A `?token_hash=<hex>` query string puts
 * a literal `=` immediately in front of the hex token, so a mail hop decodes
 * `=` + the first two token chars into one (usually non-printable) byte. The
 * separator AND two token characters are silently eaten, /auth/confirm never
 * receives a valid `token_hash`, and the reset dies on ?error=missing_token.
 * (The same corruption visibly mangles the static `width=device-width` viewport
 * meta in every branded email — proof it is generic, not token-specific.)
 *
 * A path form carries no `=` and no `&`, so there is nothing for quoted-printable
 * to misread. `encodeURIComponent` percent-escapes any `=`/`&`/`/` a token could
 * theoretically contain, keeping that guarantee total. The invariant — the
 * emitted URL contains no `=` and no `&` — is enforced by
 * scripts/reset-url-test.ts so a future refactor cannot quietly reintroduce the
 * query form and, with it, the bug.
 */
export function buildRecoveryUrl(origin: string, hashedToken: string): string {
  const base = origin.replace(/\/$/, '');
  return `${base}/auth/confirm/recovery/${encodeURIComponent(hashedToken)}`;
}
