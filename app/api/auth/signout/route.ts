import { supabaseServer } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST() {
  const sb = supabaseServer();
  await sb.auth.signOut();
  return NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'));
}
