import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Add-ons (wax, interior, tire shine…) an operator sells on top of a wash.
 *
 * They existed as operator profile data and as a resident browse page, but
 * nothing ever wrote an addon_orders row: choosing one charged the card and
 * left no record, so the crew tool — which reads add-ons off the wash — never
 * showed the work that had been paid for (QA, July 2026).
 *
 * The order of operations is the same as the booking's: record the intent
 * first, take the money second, stamp it paid third. An add-on order is
 * created alongside the booking, marked paid when Stripe confirms, and picks
 * up its wash_id when the paid booking lands on the wash-day roster.
 */

export type BookableAddon = {
  id: string;
  label: string;
  price_cents: number;
  /**
   * Optional per-vehicle-type prices (see lib/vehicle-sizes). When set,
   * price_cents is the lowest of them — the "from" price the menu quotes and
   * the amount charged, since a booking has no vehicle size to price against.
   */
  size_prices?: unknown;
};

/** Active add-ons an operator offers, for the booking form. */
export async function listBookableAddons(
  admin: SupabaseClient,
  operatorId: string,
): Promise<BookableAddon[]> {
  const { data, error } = await admin
    .from('operator_addons')
    .select('id, label, price_cents, size_prices')
    .eq('operator_id', operatorId)
    .eq('active', true)
    .order('price_cents');
  if (error) {
    console.error('listBookableAddons: query failed:', error.message);
    return [];
  }
  return (data ?? []) as BookableAddon[];
}

/**
 * The add-ons this resident asked for on every wash. Used to pre-tick the
 * booking form so a standing "on every wash" choice actually reaches the
 * checkout the resident is about to complete.
 */
export async function listRecurringAddonIds(
  admin: SupabaseClient,
  residentId: string,
  operatorId: string,
): Promise<string[]> {
  const { data, error } = await admin
    .from('resident_addons')
    .select('operator_addon:operator_addons(id, operator_id, active)')
    .eq('resident_id', residentId)
    .eq('active', true);
  if (error) {
    console.error('listRecurringAddonIds: query failed:', error.message);
    return [];
  }
  return (data ?? [])
    .map((r: any) => r.operator_addon)
    .filter((a: any) => a && a.active && a.operator_id === operatorId)
    .map((a: any) => a.id as string);
}

export type AddonSelection =
  | { ok: true; addons: BookableAddon[]; totalCents: number }
  | { ok: false; error: string };

/**
 * Price a resident's add-on selection against the operator's live catalogue.
 * Ids are re-read server side — the client is never trusted for price, and an
 * id belonging to another operator (or since deactivated) is rejected rather
 * than silently dropped, so the resident never pays a total they didn't see.
 */
export async function priceAddonSelection(
  admin: SupabaseClient,
  operatorId: string,
  addonIds: string[] | undefined,
): Promise<AddonSelection> {
  const ids = Array.from(new Set(addonIds ?? [])).filter(Boolean);
  if (!ids.length) return { ok: true, addons: [], totalCents: 0 };

  const { data, error } = await admin
    .from('operator_addons')
    .select('id, label, price_cents')
    .eq('operator_id', operatorId)
    .eq('active', true)
    .in('id', ids);
  if (error) return { ok: false, error: error.message };

  const addons = (data ?? []) as BookableAddon[];
  if (addons.length !== ids.length) {
    return { ok: false, error: 'One of the add-ons you picked is no longer available' };
  }

  const totalCents = addons.reduce((sum, a) => sum + (a.price_cents ?? 0), 0);
  return { ok: true, addons, totalCents };
}

/**
 * Write the unpaid add-on orders for a booking. Returns false when the rows
 * can't be written — the caller releases the booking rather than sending the
 * resident to a checkout whose add-ons nobody would ever be told to perform.
 */
export async function recordBookingAddonOrders(
  admin: SupabaseClient,
  opts: { bookingId: string; residentId: string; addons: BookableAddon[] },
): Promise<boolean> {
  if (!opts.addons.length) return true;

  const { error } = await admin.from('addon_orders').insert(
    opts.addons.map((a) => ({
      booking_id: opts.bookingId,
      resident_id: opts.residentId,
      operator_addon_id: a.id,
      amount_cents: a.price_cents,
    })),
  );
  if (error) {
    console.error('recordBookingAddonOrders: insert failed:', {
      bookingId: opts.bookingId,
      message: error.message,
    });
    return false;
  }
  return true;
}

/** Drop a released booking's add-on orders, so a retry starts clean. */
export async function releaseBookingAddonOrders(admin: SupabaseClient, bookingId: string) {
  const { error } = await admin.from('addon_orders').delete().eq('booking_id', bookingId).is('paid_at', null);
  if (error) {
    console.error('releaseBookingAddonOrders: delete failed:', { bookingId, message: error.message });
  }
}

/**
 * Mark a booking's add-ons paid and point them at the wash the crew will see.
 * Idempotent: re-running (webhook retry, redirect fallback) rewrites the same
 * values rather than duplicating rows.
 */
export async function settleBookingAddonOrders(
  admin: SupabaseClient,
  opts: { bookingId: string; washId?: string | null; paymentIntentId?: string | null },
) {
  const { error } = await admin
    .from('addon_orders')
    .update({
      paid_at: new Date().toISOString(),
      ...(opts.washId ? { wash_id: opts.washId } : {}),
      ...(opts.paymentIntentId ? { stripe_payment_intent_id: opts.paymentIntentId } : {}),
    })
    .eq('booking_id', opts.bookingId);
  if (error) {
    console.error('settleBookingAddonOrders: update failed:', {
      bookingId: opts.bookingId,
      message: error.message,
    });
  }

  // What the resident ticked at checkout is the final word for this wash: drop
  // any standing "on every wash" rows they left unticked, so the crew is never
  // shown work that nothing is going to pay for.
  if (opts.washId) {
    const { error: cleanupError } = await admin
      .from('addon_orders')
      .delete()
      .eq('wash_id', opts.washId)
      .is('booking_id', null)
      .is('paid_at', null);
    if (cleanupError) {
      console.error('settleBookingAddonOrders: superseded cleanup failed:', {
        washId: opts.washId,
        message: cleanupError.message,
      });
    }
  }
}

/**
 * Put each rostered resident's standing add-ons on the wash day, unpaid, so
 * the crew tool shows them on the morning of the wash rather than only after
 * the charge goes through. Safe to re-run — rows dedupe per (wash, add-on).
 */
export async function syncWashDayAddonOrders(admin: SupabaseClient, washDayId: string) {
  const { data: day } = await admin
    .from('wash_days')
    .select('id, operator_id')
    .eq('id', washDayId)
    .maybeSingle();
  if (!day?.operator_id) return;

  const { data: washes, error } = await admin
    .from('washes')
    .select('id, resident_id')
    .eq('wash_day_id', washDayId);
  if (error) {
    console.error('syncWashDayAddonOrders: washes query failed:', error.message);
    return;
  }
  if (!washes?.length) return;

  const residentIds = Array.from(new Set(washes.map((w: any) => w.resident_id as string)));
  const washIds = washes.map((w: any) => w.id as string);

  // Three queries for the whole day rather than two per resident: this runs on
  // every roster sync, and a large building would otherwise fan out badly.
  const [{ data: standing }, { data: already }] = await Promise.all([
    admin
      .from('resident_addons')
      .select('resident_id, operator_addon:operator_addons(id, label, price_cents, operator_id, active)')
      .in('resident_id', residentIds)
      .eq('active', true),
    admin.from('addon_orders').select('wash_id, operator_addon_id').in('wash_id', washIds),
  ]);

  const wanted = new Map<string, BookableAddon[]>();
  for (const row of standing ?? []) {
    const a = (row as any).operator_addon;
    if (!a || !a.active || a.operator_id !== day.operator_id) continue;
    const list = wanted.get((row as any).resident_id) ?? [];
    list.push({ id: a.id, label: a.label, price_cents: a.price_cents });
    wanted.set((row as any).resident_id, list);
  }
  if (!wanted.size) return;

  const have = new Set((already ?? []).map((r: any) => `${r.wash_id}:${r.operator_addon_id}`));

  const rows = washes.flatMap((w: any) =>
    (wanted.get(w.resident_id) ?? [])
      .filter((a) => !have.has(`${w.id}:${a.id}`))
      .map((a) => ({
        wash_id: w.id,
        resident_id: w.resident_id,
        operator_addon_id: a.id,
        amount_cents: a.price_cents,
      })),
  );
  if (!rows.length) return;

  const { error: insertError } = await admin.from('addon_orders').insert(rows);
  if (insertError) {
    console.error('syncWashDayAddonOrders: insert failed:', { washDayId, message: insertError.message });
  }
}

/** Unpaid add-on orders sitting on a wash — what the per-wash charge bills. */
export async function unpaidWashAddons(
  admin: SupabaseClient,
  washId: string,
): Promise<{ id: string; amount_cents: number }[]> {
  const { data, error } = await admin
    .from('addon_orders')
    .select('id, amount_cents')
    .eq('wash_id', washId)
    .is('paid_at', null);
  if (error) {
    console.error('unpaidWashAddons: query failed:', error.message);
    return [];
  }
  return (data ?? []) as { id: string; amount_cents: number }[];
}

/** Mark a wash's outstanding add-on orders paid once the wash charge lands. */
export async function settleWashAddonOrders(
  admin: SupabaseClient,
  washId: string,
  paymentIntentId?: string | null,
) {
  const { error } = await admin
    .from('addon_orders')
    .update({
      paid_at: new Date().toISOString(),
      ...(paymentIntentId ? { stripe_payment_intent_id: paymentIntentId } : {}),
    })
    .eq('wash_id', washId)
    .is('paid_at', null);
  if (error) {
    console.error('settleWashAddonOrders: update failed:', { washId, message: error.message });
  }
}

/**
 * The add-ons a packaged resident has standing on every wash, priced against
 * the operator running that wash day. This is what the per-wash charge bills
 * on top of the package price.
 */
export async function recurringAddonsForWash(
  admin: SupabaseClient,
  residentId: string,
  operatorId: string | null,
): Promise<BookableAddon[]> {
  if (!operatorId) return [];
  const { data, error } = await admin
    .from('resident_addons')
    .select('operator_addon:operator_addons(id, label, price_cents, operator_id, active)')
    .eq('resident_id', residentId)
    .eq('active', true);
  if (error) {
    console.error('recurringAddonsForWash: query failed:', error.message);
    return [];
  }
  return (data ?? [])
    .map((r: any) => r.operator_addon)
    .filter((a: any) => a && a.active && a.operator_id === operatorId)
    .map((a: any) => ({ id: a.id, label: a.label, price_cents: a.price_cents }));
}

/**
 * Record the add-ons billed with a completed wash's package charge. Keyed on
 * (wash, add-on) so re-charging a wash never stacks duplicate orders.
 */
export async function recordWashAddonOrders(
  admin: SupabaseClient,
  opts: { washId: string; residentId: string; addons: BookableAddon[] },
) {
  if (!opts.addons.length) return;

  const { data: existing } = await admin
    .from('addon_orders')
    .select('operator_addon_id')
    .eq('wash_id', opts.washId);
  const have = new Set((existing ?? []).map((r: any) => r.operator_addon_id as string));

  const rows = opts.addons
    .filter((a) => !have.has(a.id))
    .map((a) => ({
      wash_id: opts.washId,
      resident_id: opts.residentId,
      operator_addon_id: a.id,
      amount_cents: a.price_cents,
    }));
  if (!rows.length) return;

  const { error } = await admin.from('addon_orders').insert(rows);
  if (error) {
    console.error('recordWashAddonOrders: insert failed:', { washId: opts.washId, message: error.message });
  }
}
