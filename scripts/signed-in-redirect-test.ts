/**
 * Regression guard for the stale signup page on back-navigation.
 * Run: npx tsx --tsconfig tsconfig.scripts.json scripts/signed-in-redirect-test.ts
 *
 * A back-navigation mid-onboarding restores `/signup` from the bfcache with the
 * empty "Create your account" form, which reads as a lost account. The fix bounces
 * an authenticated visitor through `/auth/landing`, so two invariants have to hold:
 *
 *  1. The bounce must never strand a real user: every portal/role combination has
 *     to resolve to a portal home (which forwards to the right onboarding step),
 *     the admin console, or pick-role — never to nothing.
 *  2. The bounce must not loop. When the server rejects the browser's session,
 *     `/auth/landing` sends the visitor to `/login` with a marker, and the client
 *     hook has to recognize that marker and stop bouncing.
 */

import { landingPathForPortals } from '../lib/portal-routing';
import { expiredSessionLoginHref, hasExpiredSessionMarker, landingHref } from '../lib/auth/landing';

function fail(msg: string): never {
  console.error(`FAIL: ${msg}`);
  process.exit(1);
}

function eq(actual: string, expected: string, what: string) {
  if (actual !== expected) fail(`${what}: expected ${expected}, got ${actual}`);
}

function main() {
  // 1. Every authenticated visitor resolves somewhere useful.
  eq(landingPathForPortals(['resident'], 'resident'), '/resident', 'resident portal');
  eq(landingPathForPortals(['building'], 'building_manager'), '/building', 'manager portal');
  eq(landingPathForPortals(['operator'], 'operator'), '/operator', 'operator portal');
  // Multi-portal accounts follow the role hint, not DB row order.
  eq(landingPathForPortals(['building', 'resident'], 'resident'), '/resident', 'role hint wins');
  eq(landingPathForPortals(['resident', 'building'], null), '/building', 'stable priority without a hint');
  // profile_portals can still be empty right after signup (trigger timing).
  eq(landingPathForPortals([], 'resident'), '/resident', 'role-only resident');
  eq(landingPathForPortals([], 'admin'), '/admin', 'admin console');
  eq(landingPathForPortals([], null), '/auth/pick-role', 'unknown role falls back to pick-role');

  for (const portals of [[], ['resident'], ['building'], ['operator'], ['building', 'operator', 'resident']]) {
    for (const role of [null, 'resident', 'building_manager', 'operator', 'admin', 'garbage']) {
      const dest = landingPathForPortals(portals, role);
      if (!dest.startsWith('/')) fail(`landing path is not an internal path: ${dest}`);
    }
  }

  // 2. The loop guard: the URL /auth/landing bounces to must trip the hook's check.
  const bounced = expiredSessionLoginHref('/schedule?b=gomes-halsey-st');
  if (!bounced.startsWith('/login?')) fail(`expired-session bounce is not a login URL: ${bounced}`);
  if (!hasExpiredSessionMarker(bounced.slice(bounced.indexOf('?')))) {
    fail(`expired-session bounce is not recognized by the loop guard: ${bounced}`);
  }
  if (!bounced.includes('next=')) fail(`expired-session bounce dropped the deep link: ${bounced}`);
  if (hasExpiredSessionMarker('?role=resident')) fail('loop guard fired on an ordinary signup URL');
  if (hasExpiredSessionMarker('')) fail('loop guard fired on an empty query string');

  // The bounce target only carries validated internal paths.
  eq(landingHref(null), '/auth/landing', 'landing without a next');
  eq(landingHref('/schedule'), '/auth/landing?next=%2Fschedule', 'landing with a next');
  eq(landingHref('https://evil.example.com'), '/auth/landing', 'absolute URL rejected');
  eq(landingHref('//evil.example.com'), '/auth/landing', 'protocol-relative URL rejected');
  eq(expiredSessionLoginHref('https://evil.example.com'), '/login?session=expired', 'bounce rejects offsite next');

  console.log('PASS: signed-in redirect (signup/login bfcache) invariants hold');
}

main();
