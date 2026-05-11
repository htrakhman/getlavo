import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(req: Request) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'stripe not configured' }, { status: 503 });
  }
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-11-20.acacia' as any });
  const sb = supabaseAdmin();

  const { residentId } = await req.json();
  const { data: resident } = await sb
    .from('residents')
    .select('id, stripe_customer_id, profile:profiles(email, full_name)')
    .eq('id', residentId)
    .maybeSingle();
  if (!resident) return NextResponse.json({ error: 'not found' }, { status: 404 });

  if (resident.stripe_customer_id) {
    return NextResponse.json({ customerId: resident.stripe_customer_id });
  }

  const profile = resident.profile as any;
  const customer = await stripe.customers.create({
    email: profile?.email,
    name: profile?.full_name,
    metadata: { resident_id: resident.id },
  });

  await sb.from('residents').update({ stripe_customer_id: customer.id }).eq('id', resident.id);
  return NextResponse.json({ customerId: customer.id });
}
