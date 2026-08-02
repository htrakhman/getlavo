import type { SupabaseClient } from '@supabase/supabase-js';
import { syncWashDayRoster } from '@/lib/wash-roster';

/**
 * The wash_days row a building-day booking on `scheduledFor` belongs to, so
 * the crew roster and prep views can count this resident.
 *
 * Availability can offer manager-set weekly days that have no wash_days row
 * yet, so a missing day is materialized against the building's active
 * partnership rather than dropping the link. Returns null when there is no
 * such partnership — the booking still stands, it just isn't tied to a day.
 *
 * Shared by booking creation and rescheduling so a moved booking lands on the
 * new day exactly the way a fresh one would.
 */
export async function washDayForBooking(
  admin: SupabaseClient,
  {
    buildingId,
    operatorId,
    scheduledFor,
  }: { buildingId: string | null; operatorId: string; scheduledFor: string },
): Promise<string | null> {
  if (!buildingId) return null;

  const { data: existingDay } = await admin
    .from('wash_days')
    .select('id')
    .eq('building_id', buildingId)
    .eq('scheduled_for', scheduledFor)
    .neq('confirmation', 'declined')
    .limit(1)
    .maybeSingle();
  if (existingDay?.id) return existingDay.id;

  const { data: partnership } = await admin
    .from('partnerships')
    .select('id')
    .eq('building_id', buildingId)
    .eq('operator_id', operatorId)
    .eq('status', 'active')
    .maybeSingle();
  if (!partnership) return null;

  const { data: newDay, error: dayError } = await admin
    .from('wash_days')
    .insert({
      building_id: buildingId,
      operator_id: operatorId,
      partnership_id: partnership.id,
      scheduled_for: scheduledFor,
      confirmation: 'auto',
    })
    .select('id')
    .single();
  if (dayError || !newDay) {
    console.error('[wash-day-for-booking] failed to create wash day', {
      buildingId,
      scheduledFor,
      message: dayError?.message,
    });
    return null;
  }

  // Packaged residents join every new wash day, same as the propose flow.
  await syncWashDayRoster(admin, newDay.id);
  return newDay.id;
}
