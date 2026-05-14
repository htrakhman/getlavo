import type { SupabaseClient } from '@supabase/supabase-js';

export type OperatorWashContext = {
  washId: string;
  washDayId: string;
  operatorId: string;
  residentProfileId: string | null;
};

/**
 * Verifies the given profile owns the operator that owns the wash's wash_day.
 * Returns the wash context on success, or a discriminated failure with HTTP status.
 */
export async function loadWashForOperator(
  admin: SupabaseClient,
  washId: string,
  profileId: string
): Promise<
  | { ok: true; ctx: OperatorWashContext }
  | { ok: false; status: number; error: string }
> {
  const { data: wash } = await admin
    .from('washes')
    .select(`
      id,
      wash_day_id,
      resident:residents(profile_id),
      wash_day:wash_days(operator:operators(id, owner_id))
    `)
    .eq('id', washId)
    .maybeSingle();

  if (!wash) return { ok: false, status: 404, error: 'not found' };

  const op = (wash.wash_day as any)?.operator;
  if (!op || op.owner_id !== profileId) {
    return { ok: false, status: 403, error: 'forbidden' };
  }

  return {
    ok: true,
    ctx: {
      washId: wash.id,
      washDayId: (wash as any).wash_day_id,
      operatorId: op.id,
      residentProfileId: (wash.resident as any)?.profile_id ?? null,
    },
  };
}

/** Verifies the profile owns the operator that owns the wash_day. */
export async function loadWashDayForOperator(
  admin: SupabaseClient,
  washDayId: string,
  profileId: string
): Promise<
  | { ok: true; operatorId: string }
  | { ok: false; status: number; error: string }
> {
  const { data: wd } = await admin
    .from('wash_days')
    .select('id, operator:operators(id, owner_id)')
    .eq('id', washDayId)
    .maybeSingle();

  if (!wd) return { ok: false, status: 404, error: 'not found' };

  const op = (wd.operator as any);
  if (!op || op.owner_id !== profileId) {
    return { ok: false, status: 403, error: 'forbidden' };
  }
  return { ok: true, operatorId: op.id };
}
