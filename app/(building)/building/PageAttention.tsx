import { getBuildingAttention } from '@/lib/building-attention';
import { AttentionPanel } from './AttentionPanel';

/**
 * The outstanding items for one page, rendered on that page.
 *
 * The nav dot says a page needs something; the page has to say what. Residents
 * showed a red dot in the sidebar and then an empty table reading "No residents
 * enrolled yet" — technically the answer, but it reads as a description of an
 * empty state, not as the thing the dot was pointing at, and it offers no sense
 * of whether this is the only gap or one of four. Following a dot to a page
 * that does not acknowledge it is the same failure as the dot that pointed at
 * an unmarked Contract tab: attention spent, nothing returned.
 *
 * So every destination a dot can point to renders the matching slice of the
 * same list Overview shows. One line per page, and it disappears on its own
 * once the item is resolved, because it is derived rather than hand-placed.
 */
export async function PageAttention({
  profileId,
  buildingId,
  navHref,
  className = 'mb-6',
}: {
  profileId: string;
  buildingId: string | null;
  /** The nav entry this page belongs to, e.g. '/building/residents'. */
  navHref: string;
  className?: string;
}) {
  const items = await getBuildingAttention(profileId, buildingId);
  const mine = items.filter((i) => i.navHref === navHref);
  return <AttentionPanel items={mine} className={className} />;
}
