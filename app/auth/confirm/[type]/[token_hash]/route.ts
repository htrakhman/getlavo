import { NextRequest } from 'next/server';
import { confirmOtp } from '@/lib/auth/confirm-otp';

const VALID_TYPES = new Set(['email', 'recovery', 'invite']);

// Path-based confirmation endpoint: /auth/confirm/<type>/<token_hash>
//
// This is the target of our own password-reset email. Unlike the query form,
// the link carries no `=` or `&`, so it cannot be mangled by quoted-printable
// email encoding (where `=` + two hex digits is an escape sequence that swallows
// the separator between `token_hash` and its hex value). See lib/auth/confirm-otp.ts.
export async function GET(
  request: NextRequest,
  { params }: { params: { type: string; token_hash: string } }
) {
  const { searchParams } = new URL(request.url);
  const type = VALID_TYPES.has(params.type)
    ? (params.type as 'email' | 'recovery' | 'invite')
    : null;
  return confirmOtp(request, {
    token_hash: params.token_hash || null,
    type,
    role: searchParams.get('role'),
    next: searchParams.get('next'),
  });
}
