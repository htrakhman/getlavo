import { supabaseAdmin } from '@/lib/supabase/admin';

/** Min and max active package prices across approved operators for homepage copy. */
export async function getPublicWashPriceRangeCents(): Promise<{ min: number; max: number } | null> {
  try {
    const admin = supabaseAdmin();
    const { data: ops } = await admin.from('operators').select('id').eq('status', 'approved');
    const ids = (ops ?? []).map((o: { id: string }) => o.id);
    if (!ids.length) return { min: 3500, max: 6500 };
    const { data: rows } = await admin.from('service_packages').select('price_cents').eq('active', true).in('operator_id', ids);
    const prices = (rows ?? []).map((r: { price_cents: number }) => r.price_cents).filter((n) => typeof n === 'number');
    if (!prices.length) return { min: 3500, max: 6500 };
    return { min: Math.min(...prices), max: Math.max(...prices) };
  } catch {
    return { min: 3500, max: 6500 };
  }
}
