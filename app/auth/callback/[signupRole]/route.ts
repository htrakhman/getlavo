import { NextRequest } from 'next/server';
import { handleOAuthCallback } from '@/lib/auth/oauth-callback';

export async function GET(
  request: NextRequest,
  { params }: { params: { signupRole: string } }
) {
  return handleOAuthCallback(request, { roleFromPath: params.signupRole });
}
