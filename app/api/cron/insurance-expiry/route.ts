import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { notify } from '@/lib/notify';
import { logJobRun, logError } from '@/lib/error-log';

// Daily job: flip lapsed policies to 'expired' and send one reminder when a
// verified policy enters the 30 day expiration window.
export async function POST(req: Request) {
  const start = Date.now();

  const auth = req.headers.get('authorization');
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const sb = supabaseAdmin();
    const today = new Date().toISOString().slice(0, 10);
    const windowEnd = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

    const { data: lapsed } = await sb
      .from('operators')
      .select('id, name, owner_id, insurance_expires_at')
      .lt('insurance_expires_at', today)
      .in('insurance_review_status', ['approved', 'pending_review']);

    let expired = 0;
    for (const op of lapsed ?? []) {
      await sb.from('operators').update({ insurance_review_status: 'expired' }).eq('id', op.id);
      if (op.owner_id) {
        await notify(op.owner_id, 'coi_expired', {
          operatorName: op.name,
          expiresAt: op.insurance_expires_at,
          link: '/operator/compliance',
          cta: 'Upload a new certificate',
        });
      }
      expired++;
    }

    const { data: expiring } = await sb
      .from('operators')
      .select('id, name, owner_id, insurance_expires_at')
      .gte('insurance_expires_at', today)
      .lte('insurance_expires_at', windowEnd)
      .eq('insurance_review_status', 'approved')
      .is('insurance_expiry_notified_at', null);

    let reminded = 0;
    for (const op of expiring ?? []) {
      if (op.owner_id) {
        await notify(op.owner_id, 'coi_expiring', {
          operatorName: op.name,
          expiresAt: op.insurance_expires_at,
          link: '/operator/compliance',
          cta: 'Renew your certificate',
        });
      }
      await sb.from('operators').update({ insurance_expiry_notified_at: new Date().toISOString() }).eq('id', op.id);
      reminded++;
    }

    await logJobRun({ jobName: 'insurance_expiry', status: 'ok', durationMs: Date.now() - start, detail: { expired, reminded } });
    return NextResponse.json({ expired, reminded });
  } catch (e: any) {
    await logError({ source: 'insurance_expiry', message: e?.message ?? 'unknown', stack: e?.stack });
    await logJobRun({ jobName: 'insurance_expiry', status: 'error', durationMs: Date.now() - start });
    return NextResponse.json({ error: 'job failed' }, { status: 500 });
  }
}

// Allow GET for Vercel cron compatibility
export const GET = POST;
