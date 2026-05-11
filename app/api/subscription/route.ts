import { NextResponse } from 'next/server';
import { getSessionUser, supabaseServer } from '@/lib/supabase/server';
import { audit } from '@/lib/audit';

type Action = 'pause' | 'resume' | 'cancel' | 'reactivate';

export async function POST(req: Request) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { action, until } = (await req.json()) as { action: Action; until?: string };

  const sb = supabaseServer();
  const { data: resident } = await sb.from('residents').select('id').eq('profile_id', session.user.id).maybeSingle();
  if (!resident) return NextResponse.json({ error: 'no resident' }, { status: 404 });

  const updates: any = {};
  switch (action) {
    case 'pause':
      updates.subscription_state = 'paused';
      updates.subscription_paused_until = until ?? null;
      updates.is_subscribed = false;
      break;
    case 'resume':
      updates.subscription_state = 'active';
      updates.subscription_paused_until = null;
      updates.is_subscribed = true;
      break;
    case 'cancel':
      updates.subscription_state = 'cancelled';
      updates.subscription_cancelled_at = new Date().toISOString();
      updates.is_subscribed = false;
      break;
    case 'reactivate':
      updates.subscription_state = 'active';
      updates.subscription_cancelled_at = null;
      updates.is_subscribed = true;
      break;
    default:
      return NextResponse.json({ error: 'invalid action' }, { status: 400 });
  }

  await sb.from('residents').update(updates).eq('id', resident.id);
  await audit({
    actorId: session.user.id,
    actorRole: session.profile.role,
    action: `subscription.${action}`,
    entityType: 'resident',
    entityId: resident.id,
    metadata: { until },
  });

  return NextResponse.json({ success: true });
}
