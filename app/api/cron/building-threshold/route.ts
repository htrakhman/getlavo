import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { wrapEmail, paragraph } from '@/lib/email/template';

const THRESHOLD = 5;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const admin = supabaseAdmin();
  const { data: rows, error } = await admin
    .from('building_requests')
    .select('building_candidate_key, formatted_address, building_display_name, mgmt_email, resident_email, created_at')
    .order('created_at', { ascending: false })
    .limit(8000);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const counts = new Map<string, { n: number; sample: Record<string, unknown> }>();
  for (const r of rows ?? []) {
    const k = r.building_candidate_key as string;
    if (!k) continue;
    const cur = counts.get(k);
    if (!cur) counts.set(k, { n: 1, sample: r as Record<string, unknown> });
    else cur.n += 1;
  }

  const opsEmail = process.env.OPS_ALERT_EMAIL || process.env.ADMIN_EMAIL;
  let alerted = 0;

  for (const [key, { n, sample }] of counts) {
    if (n < THRESHOLD) continue;
    const { data: existing } = await admin
      .from('building_request_threshold_events')
      .select('id')
      .eq('building_candidate_key', key)
      .eq('threshold', THRESHOLD)
      .maybeSingle();
    if (existing) continue;

    await admin.from('building_request_threshold_events').insert({
      building_candidate_key: key,
      threshold: THRESHOLD,
      request_count: n,
      notified_at: new Date().toISOString(),
    });

    if (opsEmail && process.env.RESEND_API_KEY) {
      const { Resend } = await import('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);
      const inner = [
        paragraph(`Building demand crossed ${THRESHOLD} requests.`),
        paragraph(`<strong>Key:</strong> ${key}`),
        paragraph(`<strong>Approx address:</strong> ${sample.formatted_address ?? sample.building_display_name ?? 'unknown'}`),
        paragraph(`<strong>Total rows:</strong> ${n}`),
      ].join('');
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'Lavo <hello@getlavo.io>',
        to: opsEmail,
        subject: `Lavo ops: ${THRESHOLD}+ requests for a building`,
        html: wrapEmail({ preheader: `Demand alert ${key}`, content: inner }),
      });
    }
    alerted++;
  }

  return NextResponse.json({ ok: true, alerted });
}
