/**
 * Guard that keeps QA and test fixture rows off public, indexable surfaces.
 *
 * QA runs against the production Supabase project and creates fixtures through
 * the real signup and partnership flows, so those rows end up with legitimate
 * statuses ("active" buildings, "approved" operators). A status filter alone
 * therefore does not separate them from real prospects — the tell is the name
 * ("QA Test Towers", "Isolation Test Towers", "Test Detailing Co Two").
 *
 * Anything that renders on an indexable page — city page copy, FAQ answers,
 * Service/LocalBusiness JSON-LD — must run through here before it reaches a
 * component. Marking a row `is_seed` in the database opts it out explicitly and
 * is preferred over relying on the name heuristic for new fixtures.
 */

/** Building statuses that represent a real prospect, pilot, or live property. */
export const PUBLIC_BUILDING_STATUSES = ['prospect', 'pilot', 'active'] as const;

/** Only fully approved operators may be named on public pages. */
export const PUBLIC_OPERATOR_STATUSES = ['approved'] as const;

/**
 * Whole-word markers that identify a QA fixture. Word boundaries matter:
 * "Retest" and "Testa Auto Spa" are not fixtures, "QA Stripe Retest" is.
 */
const TEST_NAME_PATTERN =
  /\b(qa|test|tests|testing|isolation|staging|sandbox|demo|dummy|sample|seed|fixture|placeholder|e2e|smoke|foobar|lorem|ignore ?me|delete ?me|do ?not ?use)\b/i;

function isProductionDeployment(): boolean {
  if (process.env.VERCEL_ENV) return process.env.VERCEL_ENV === 'production';
  return process.env.NODE_ENV === 'production';
}

/**
 * Escape hatch for local and preview environments where QA fixtures are the
 * only data available. Never honored on the production deployment.
 */
export function testDataAllowed(): boolean {
  return !isProductionDeployment() && process.env.LAVO_INCLUDE_TEST_DATA === 'true';
}

/** True when a name looks like a QA fixture rather than a real property or business. */
export function isTestEntityName(name: string | null | undefined): boolean {
  if (!name) return false;
  return TEST_NAME_PATTERN.test(name);
}

export type PublicEntityRow = {
  name?: string | null;
  is_seed?: boolean | null;
};

/** True when a row is safe to name on a public, indexable page. */
export function isPubliclyListable(row: PublicEntityRow): boolean {
  if (testDataAllowed()) return true;
  const name = (row.name ?? '').trim();
  if (!name) return false;
  if (row.is_seed) return false;
  return !isTestEntityName(name);
}

/** Drop every QA fixture from a set of rows headed for a public page. */
export function filterPublicEntities<T extends PublicEntityRow>(rows: readonly T[]): T[] {
  return rows.filter(isPubliclyListable);
}
