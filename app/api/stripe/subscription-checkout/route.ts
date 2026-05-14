import { NextResponse } from 'next/server';
import { getSessionUser, supabaseServer } from '@/lib/supabase/server';
import Stripe from 'stripe';
import { z } from 'zod';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', { apiVersion: '2024-06-20' });

const Body = z.object({
  tier: z.enum(['lite', 'plus']),
});

export async function POST(req: Request) {
  const session = await getSessionUser();
  if (!session || !session.portals.includes('resident')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
  const { tier } = parsed.data;

  const priceId =
    tier === 'lite'
      ? process.env.STRIPE_PRICE_LAVO_LITE
      : process.env.STRIPE_PRICE_LAVO_PLUS;
  if (!priceId) {
    return NextResponse.json({ error: 'Subscription products are not configured' }, { status: 503 });
  }

  const sb = supabaseServer();
  const { data: resident } = await sb.from('residents').select('id').eq('profile_id', session.user.id).maybeSingle();
  if (!resident) return NextResponse.json({ error: 'Resident record not found' }, { status: 404 });

  const { data: profile } = await sb.from('profiles').select('email').eq('id', session.user.id).maybeSingle();
  const email = profile?.email as string | undefined;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    customer_email: email,
    metadata: {
      resident_id: resident.id,
      subscription_tier: tier,
    },
    success_url: `${appUrl}/resident/account?subscription=success`,
    cancel_url: `${appUrl}/resident/account?subscription=cancel`,
  });

  return NextResponse.json({ checkoutUrl: checkoutSession.url });
}
