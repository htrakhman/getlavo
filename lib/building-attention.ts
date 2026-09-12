// Everything in the building portal that is waiting on the manager, in one
// place, so every surface that nags about it agrees on what it is nagging about.
//
// The red dot used to be computed twice from two different scopes. The sidebar
// flagged "My operator" from getPendingAgreementsForManager(), which counts
// EVERY building the manager owns. The Contract tab inside that page computed
// its own dot from a query scoped to the SELECTED building. So a manager who
// had signed the building they were looking at, with offers still open on two
// others, got a red dot in the nav and a page with nothing marked on it — the
// dot said "something is wrong in here" and then the page refused to say what.
// That is worse than no dot, because it spends the user's attention and
// returns nothing for it.
//
// So: one function, one list, every surface reads it. Each item knows the page
// that fixes it (href), the nav entry that should carry a dot (navHref), and
// which building it belongs to, so "2 other buildings need your signature" and
// the dots and the Overview checklist can never drift apart again.
import { supabaseAdmin } from '@/lib/supabase/server';
import { getPendingAgreementsForManager } from '@/lib/pending-agreements';

export type AttentionItem = {
  /** Stable id; `signature:<buildingId>` for per-building signature rows. */
  key: string;
  /** Short imperative label for a checklist row. */
  label: string;
  /** One line saying why it matters / what happens next. */
  detail: string;
  /** Where the manager goes to resolve it. */
  href: string;
  /** Which sidebar nav entry should carry the dot. */
  navHref: string;
  /** Null for account-wide items. */
  buildingId: string | null;
  /** True when the item belongs to a building other than the selected one. */
  otherBuilding: boolean;
};

/** Nav hrefs, for PortalShell's `alerts` prop. */
export function attentionNavHrefs(items: AttentionItem[]): string[] {
  return Array.from(new Set(items.map((i) => i.navHref)));
}

/**
 * Everything outstanding for this manager, most blocking first.
 *
 * `currentBuildingId` only decides how an item is phrased and linked — items
 * for other buildings are still returned, because hiding them is precisely
 * the bug this replaces.
 */
export async function getBuildingAttention(
  profileId: string,
  currentBuildingId: string | null,
): Promise<AttentionItem[]> {
  const sb = supabaseAdmin();
  const items: AttentionItem[] = [];

  // 1. Signatures — the only item that is genuinely blocking. Nothing can be
  //    booked or washed under an agreement nobody has signed.
  const pending = await getPendingAgreementsForManager(profileId);
  for (const p of pending) {
    const isCurrent = p.buildingId === currentBuildingId;
    items.push({
      key: `signature:${p.buildingId}`,
      label: isCurrent ? 'Sign the service agreement' : `Sign the agreement for ${p.buildingName}`,
      detail: p.operatorName
        ? `${p.operatorName} is waiting on your signature. Service can't start until it's signed.`
        : "Service can't start until this agreement is signed.",
      href: isCurrent
        ? '/building/contract#sign'
        : `/api/building/select?buildingId=${p.buildingId}&next=${encodeURIComponent('/building/contract#sign')}`,
      navHref: '/building/marketplace',
      buildingId: p.buildingId,
      otherBuilding: !isCurrent,
    });
  }

  if (!currentBuildingId) return items;

  // The remaining items are all about the selected building being ready to
  // actually run washes. Queried together — each is a count, not a payload.
  const today = new Date().toISOString().slice(0, 10);
  const [{ data: partnership }, { data: anyContract }, { count: residentCount }, { count: washDayCount }] =
    await Promise.all([
      sb.from('partnerships').select('id').eq('building_id', currentBuildingId).eq('status', 'active').limit(1).maybeSingle(),
      sb.from('contracts').select('id').eq('building_id', currentBuildingId).limit(1).maybeSingle(),
      sb.from('residents').select('*', { count: 'exact', head: true }).eq('building_id', currentBuildingId).eq('active', true),
      sb.from('wash_days').select('*', { count: 'exact', head: true })
        .eq('building_id', currentBuildingId)
        .gte('scheduled_for', today)
        .neq('confirmation', 'declined')
        .is('cancelled_at', null),
    ]);

  const hasSignatureItemHere = items.some((i) => i.buildingId === currentBuildingId);

  // 2. No operator at all. Suppressed while an agreement for this building is
  //    already open — an offer in hand is not "no operator", and showing both
  //    would tell the manager to go find a crew they have already been sent.
  if (!partnership && !anyContract && !hasSignatureItemHere) {
    items.push({
      key: 'operator',
      label: 'Choose an operator',
      detail: 'No operator is serving this building yet. Pick one from the marketplace or let Lavo match you.',
      href: '/building/marketplace',
      navHref: '/building/marketplace',
      buildingId: currentBuildingId,
      otherBuilding: false,
    });
  }

  // 3. Nobody to book. A building with no residents invited will never produce
  //    a wash however well the rest is set up.
  if (!residentCount) {
    items.push({
      key: 'residents',
      label: 'Invite your residents',
      detail: 'Nobody at this building can book yet. Share the booking link to get the first wash on the calendar.',
      href: '/building/residents',
      navHref: '/building/residents',
      buildingId: currentBuildingId,
      otherBuilding: false,
    });
  }

  // 4. Nothing on the calendar. Only worth raising once there is somebody to
  //    serve and somebody to serve them.
  if (!washDayCount && partnership && residentCount) {
    items.push({
      key: 'wash-days',
      label: 'Schedule a wash day',
      detail: 'No upcoming wash days. Request a date so residents have something to book.',
      href: '/building/wash-days',
      navHref: '/building/wash-days',
      buildingId: currentBuildingId,
      otherBuilding: false,
    });
  }

  return items;
}
