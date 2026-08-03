import { JsonLd } from '@/components/seo/JsonLd';
import { organizationSchema, siteLocalBusinessSchema, websiteSchema } from '@/lib/seo/schema';
import { getServedAreas } from '@/lib/seo/served-areas';

/**
 * Sitewide LocalBusiness + WebSite graph. Mount once, in the root layout.
 *
 * `areaServed` comes from the buildings table via `getServedAreas()`, so the
 * cities Lavo claims to serve track the cities Lavo actually serves. Adding a
 * city is a database change, not a code change.
 *
 * The result is cached (`unstable_cache`, 1h) and falls back to `null` when
 * Supabase is unreachable, so a database blip degrades to a schema without
 * `areaServed` rather than a failed render.
 */
export async function LocalBusinessJsonLd() {
  const areaServed = await getServedAreas();

  return (
    <JsonLd
      data={[
        siteLocalBusinessSchema({ areaServed }),
        websiteSchema(),
      ]}
    />
  );
}

/**
 * Synchronous fallback for any surface that cannot await — emits the plain
 * Organization node with no `areaServed`. Prefer `LocalBusinessJsonLd`.
 */
export function OrganizationJsonLd() {
  return <JsonLd data={[organizationSchema(), websiteSchema()]} />;
}
