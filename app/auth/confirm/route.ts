import { NextRequest } from 'next/server';
import { confirmOtp } from '@/lib/auth/confirm-otp';

// Query-string confirmation endpoint: /auth/confirm?token_hash=…&type=…
// This is the target of Supabase-generated signup and invite emails.
//
// NOTE: our own password-reset email uses the path form
// (/auth/confirm/<type>/<token_hash>) instead — a `token_hash=<hex>` query
// string is mangled in email transit because `=` + two hex digits is a valid
// quoted-printable escape. See lib/auth/confirm-otp.ts.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  return confirmOtp(request, {
    token_hash: searchParams.get('token_hash'),
    type: searchParams.get('type') as 'email' | 'recovery' | 'invite' | null,
    role: searchParams.get('role'),
    next: searchParams.get('next'),
  });
}
