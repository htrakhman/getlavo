import { NextResponse } from 'next/server';
import { getSessionUser, supabaseAdmin } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Diagnostic for the persistent 503s on the sibling export routes
 * (/api/building/comms-kit, /api/building/report), which work locally and
 * cannot 503 from handler code. Bisects the failure:
 *   - this route 503s too      → the platform is failing the whole path/lambda
 *   - plain ping 200s          → the export handlers' own lambdas are the issue
 *   - ?probe=auth stages fail  → session/env trouble specific to production
 * Returns booleans only — no secrets, no user data.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const body: Record<string, unknown> = {
    ok: true,
    route: 'building/ping',
    hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
  };

  if (url.searchParams.get('probe') === 'auth') {
    try {
      const session = await getSessionUser();
      body.sessionResolved = !!session;
      if (session) {
        const { error } = await supabaseAdmin()
          .from('buildings')
          .select('id', { count: 'exact', head: true })
          .limit(1);
        body.adminQueryOk = !error;
        if (error) body.adminQueryError = error.message;
      }
    } catch (err: any) {
      if (err?.digest === 'DYNAMIC_SERVER_USAGE') throw err;
      body.probeError = err?.message ?? 'unknown';
    }
  }

  return NextResponse.json(body, { headers: { 'Cache-Control': 'no-store' } });
}
