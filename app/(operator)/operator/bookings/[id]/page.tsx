import { PageHeader } from '@/components/PortalShell';
import { getSessionUser, supabaseServer } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import { OperatorBookingDetail } from './OperatorBookingDetail';

export default async function OperatorBookingPage({ params }: { params: { id: string } }) {
  const session = await getSessionUser();
  if (!session) redirect('/login');

  const sb = supabaseServer();
  const { data: op } = await sb.from('operators').select('id').eq('owner_id', session.user.id).maybeSingle();
  if (!op) redirect('/operator/onboarding');

  const { data: booking } = await sb
    .from('bookings')
    .select(
      'id, scheduled_for, time_slot, status, gross_cents, pre_wash_photo_urls, post_wash_photo_urls, building:buildings(name), resident:residents(profile:profiles(full_name)), vehicle:vehicles(make, model, color, license_plate)',
    )
    .eq('id', params.id)
    .eq('operator_id', op.id)
    .maybeSingle();

  if (!booking) notFound();

  return (
    <>
      <PageHeader eyebrow="Operator" title="Booking detail" />
      <OperatorBookingDetail booking={booking as any} />
    </>
  );
}
