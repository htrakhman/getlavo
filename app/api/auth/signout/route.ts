import { supabaseServer } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const sb = supabaseServer();
  await sb.auth.signOut();
  return NextResponse.redirect(new URL('/login', request.url), { status: 303 });
}
