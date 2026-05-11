import { supabaseServer } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? 'sk_test_placeholder', { apiVersion: '2024-06-20' as any });

export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  const addonId = url.searchParams.get('addon');
  if (!addonId) return NextResponse.json({ error: 'missing addon' }, { status: 400 });

  const sb = supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const { data: addon } = await sb.from('operator_addons')
    .select('*, operator:operators(stripe_account_id, name)')
    .eq('id', addonId).single();
  if (!addon) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [{
      price_data: {
        currency: 'usd',
        product_data: { name: `${addon.label} — ${(addon.operator as any).name}` },
        unit_amount: addon.price_cents,
      },
      quantity: 1,
    }],
    payment_intent_data: (addon.operator as any).stripe_account_id
      ? { transfer_data: { destination: (addon.operator as any).stripe_account_id } }
      : undefined,
    success_url: `${url.origin}/resident?addon=success`,
    cancel_url: `${url.origin}/resident/addons`,
    metadata: { addon_id: addonId, user_id: user.id },
  });

  return NextResponse.redirect(session.url!);
}

export const GET = POST;
