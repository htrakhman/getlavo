import { PageHeader } from '@/components/PortalShell';
import { getSessionUser, supabaseServer } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Stripe from 'stripe';
import { PaymentMethodPanel } from './PaymentMethodPanel';

export default async function PaymentPage() {
  const session = await getSessionUser();
  if (!session) redirect('/login');

  const sb = supabaseServer();
  const { data: resident } = await sb
    .from('residents')
    .select('id, stripe_customer_id, stripe_payment_method_id')
    .eq('profile_id', session.user.id)
    .maybeSingle();
  if (!resident) redirect('/resident/onboarding');

  let card: { brand: string; last4: string; exp: string } | null = null;
  if (resident.stripe_payment_method_id && process.env.STRIPE_SECRET_KEY) {
    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });
      const pm = await stripe.paymentMethods.retrieve(resident.stripe_payment_method_id);
      if (pm.card) {
        card = {
          brand: pm.card.brand,
          last4: pm.card.last4,
          exp: `${String(pm.card.exp_month).padStart(2, '0')}/${String(pm.card.exp_year).slice(-2)}`,
        };
      }
    } catch {
      // ignore — card may have been removed in Stripe
    }
  }

  return (
    <>
      <PageHeader eyebrow="Account" title="Payment method" />
      <PaymentMethodPanel card={card} />
    </>
  );
}
