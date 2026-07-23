/**
 * Regression guard for the password-reset link corruption.
 * Run: npx tsx scripts/reset-url-test.ts
 *
 * The reset email was broken three times because each fix targeted the wrong
 * layer (HTML `&` escaping, href escaping) instead of the real invariant: the
 * reset URL must contain no `=` and no `&`, because the email body is
 * quoted-printable encoded and QP silently collapses any `=` + two hex digits
 * (`=05` -> 0x05, `=de` -> 0xDE) into one byte. A `?token_hash=<hex>` query
 * string puts a literal `=` in front of the hex token and is destroyed; the
 * path form has nothing for QP to misread. This test locks that invariant in.
 */

import { buildRecoveryUrl } from '../lib/auth/recovery-url';

function fail(msg: string): never {
  console.error(`FAIL: ${msg}`);
  process.exit(1);
}

/** Simulate the transit corruption: decode every `=` + two hex digits to a byte. */
function quotedPrintableMangle(s: string): string {
  return s.replace(/=([0-9a-fA-F]{2})/g, (_m, hex) => String.fromCharCode(parseInt(hex, 16)));
}

// Representative recovery tokens, including ones whose leading characters are
// hex pairs (`05...`, `de...`) — exactly the shape that was corrupted in the
// wild (the real broken token started `05bfbfe4...`).
const TOKENS = [
  '05bfbfe42ed2c6f70b8d0f08cc08aa1d8be80b217d13f78e65d2fb06',
  'deadbeefcafe0123456789abcdef00112233445566778899aabbccdd',
  'pkce_2b0f6c1e9a4d4f0e8c7b6a5d4e3f2a1b',
  '3d2641262b2f', // decodes to '=' '&' '+' '/' if ever mis-read — must stay escaped
  'AbCd1234EfGh',
];

const ORIGINS = ['https://getlavo.io', 'https://www.getlavo.io', 'https://getlavo.io/'];

function main() {
  for (const origin of ORIGINS) {
    for (const token of TOKENS) {
      const url = buildRecoveryUrl(origin, token);

      // Core invariant: nothing for quoted-printable to corrupt.
      if (url.includes('=')) fail(`reset URL contains '=' (QP-corruptible): ${url}`);
      if (url.includes('&')) fail(`reset URL contains '&' (QP-corruptible): ${url}`);

      // No double slash from a trailing-slash origin.
      if (/([^:])\/\//.test(url)) fail(`reset URL has a doubled slash: ${url}`);

      // Shape: /auth/confirm/recovery/<token> so the path route can read it.
      if (!url.includes('/auth/confirm/recovery/')) {
        fail(`reset URL is not the path form: ${url}`);
      }

      // The URL must survive the exact email-transit corruption untouched, and
      // the token must still be recoverable from the final path segment.
      const mangled = quotedPrintableMangle(url);
      if (mangled !== url) fail(`reset URL is altered by quoted-printable transit: ${url} -> ${mangled}`);
      const recovered = decodeURIComponent(mangled.split('/').pop()!);
      if (recovered !== token) fail(`token not recoverable after transit: ${token} -> ${recovered}`);
    }
  }

  // Sanity check the test itself: the OLD query form WOULD be corrupted, so the
  // guard above is actually meaningful and not vacuously passing.
  const legacy = 'https://getlavo.io/auth/confirm?token_hash=05bfbfe42ed2&type=recovery';
  if (quotedPrintableMangle(legacy) === legacy) {
    fail('QP simulation is inert — the query form should have been corrupted');
  }

  console.log(`OK: ${ORIGINS.length * TOKENS.length} reset URLs are free of '='/'&' and survive email transit intact`);
}

main();
