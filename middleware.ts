import { postHogMiddleware } from '@posthog/next';
import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  const response = await updateSession(request);
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return response;
  return postHogMiddleware({ proxy: true, response })(request);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon|.*\..*).*)'],
};
