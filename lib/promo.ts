import type { SupabaseClient } from '@supabase/supabase-js';

export type PromoRow = {
  id: string;
  code: string;
  discount_kind: 'percent' | 'fixed_cents' | 'free_first_wash' | 'free_upgrade';
  discount_percent: number | null;
  discount_amount_cents: number | null;
  applies_first_booking_only: boolean;
  max_redemptions: number | null;
  redemption_count: number;
  expires_at: string | null;
  active: boolean;
};

export type PromoApplyResult =
  | { ok: true; promo: PromoRow | null; discountCents: number; finalGrossCents: number }
  | { ok: false; error: string };

function normalizeCode(raw: string | undefined | null): string | null {
  const t = raw?.trim();
  if (!t) return null;
  return t.toUpperCase();
}

export async function applyPromoToBooking(
  admin: SupabaseClient,
  opts: {
    rawCode?: string | null;
    profileId: string;
    residentId: string;
    baseGrossCents: number;
  },
): Promise<PromoApplyResult> {
  const code = normalizeCode(opts.rawCode);
  if (!code) {
    return { ok: true, promo: null, discountCents: 0, finalGrossCents: opts.baseGrossCents };
  }

  const { data: promo, error } = await admin
    .from('promo_codes')
    .select('*')
    .eq('code', code)
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!promo || !promo.active) return { ok: false, error: 'Invalid or inactive promo code' };

  const row = promo as PromoRow;
  if (row.expires_at && new Date(row.expires_at) < new Date()) {
    return { ok: false, error: 'This promo code has expired' };
  }
  if (row.max_redemptions != null && row.redemption_count >= row.max_redemptions) {
    return { ok: false, error: 'This promo code is no longer available' };
  }

  if (row.applies_first_booking_only) {
    const { count, error: cErr } = await admin
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('resident_id', opts.residentId)
      .in('status', ['confirmed', 'in_progress', 'completed']);
    if (cErr) return { ok: false, error: cErr.message };
    if ((count ?? 0) > 0) {
      return { ok: false, error: 'This offer is only valid on your first wash' };
    }
  }

  let discount = 0;
  switch (row.discount_kind) {
    case 'percent': {
      const p = row.discount_percent ?? 0;
      discount = Math.floor((opts.baseGrossCents * p) / 100);
      break;
    }
    case 'fixed_cents':
      discount = Math.min(row.discount_amount_cents ?? 0, opts.baseGrossCents);
      break;
    case 'free_first_wash':
    case 'free_upgrade':
      discount = opts.baseGrossCents;
      break;
    default:
      discount = 0;
  }

  discount = Math.min(discount, opts.baseGrossCents);
  const finalGross = Math.max(0, opts.baseGrossCents - discount);
  return { ok: true, promo: row, discountCents: discount, finalGrossCents: finalGross };
}

export async function recordPromoRedemption(
  admin: SupabaseClient,
  opts: { promoId: string; profileId: string; bookingId: string },
) {
  const { data: existing } = await admin
    .from('promo_redemptions')
    .select('id')
    .eq('booking_id', opts.bookingId)
    .maybeSingle();
  if (existing) return;

  await admin.from('promo_redemptions').insert({
    promo_code_id: opts.promoId,
    profile_id: opts.profileId,
    booking_id: opts.bookingId,
  });
  const { data: row } = await admin.from('promo_codes').select('redemption_count').eq('id', opts.promoId).maybeSingle();
  const next = (row?.redemption_count ?? 0) + 1;
  await admin.from('promo_codes').update({ redemption_count: next }).eq('id', opts.promoId);
}
