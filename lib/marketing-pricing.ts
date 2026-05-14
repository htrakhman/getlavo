import { supabaseAdmin } from '@/lib/supabase/server';

export async function getPublicWashPriceRangeCents(): Promise<{ min: number; max: number } | null> {
  try {
    const { data } = await supabaseAdmin
      .from('operators')
      .select('base_price_cents')
      .eq('live_ok', true)
      .not('base_price_cents', 'is', null);

    if (!data || data.length === 0) return null;

    const prices = data.map((o) => o.base_price_cents as number);
    return { min: Math.min(...prices), max: Math.max(...prices) };
  } catch {
    return null;
  }
}
