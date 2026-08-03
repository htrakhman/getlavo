import { JsonLd } from '@/components/seo/JsonLd';
import { serviceSchema } from '@/lib/seo/schema';
import { getServedAreas } from '@/lib/seo/served-areas';

type ServiceJsonLdProps = {
  path: string;
  name: string;
  serviceType: string;
  description: string;
  audience: string;
  /**
   * A single city/state, or omit to inherit the sitewide served-city list from
   * Supabase. Pass an explicit value only on pages scoped to one place.
   */
  areaServed?: { city: string; state: string; county?: string } | string;
  offerCatalog?: { name: string; items: string[] };
  price?: number;
  priceCurrency?: string;
};

/**
 * Service schema.
 *
 * With no `areaServed`, the component resolves coverage from the buildings
 * table rather than defaulting to "United States" — a nationwide claim on a
 * service that runs in two NJ counties reads as spam to review systems. When
 * the lookup returns nothing it falls back to the single state Lavo is
 * incorporated to serve only if that state is unambiguous in the data.
 */
export async function ServiceJsonLd({
  path,
  name,
  serviceType,
  description,
  audience,
  areaServed,
  offerCatalog,
  price,
  priceCurrency,
}: ServiceJsonLdProps) {
  const resolved = areaServed ?? (await resolveDefaultArea());

  return (
    <JsonLd
      data={serviceSchema({
        path,
        name,
        serviceType,
        description,
        audience,
        ...(resolved ? { areaServed: resolved } : {}),
        offerCatalog,
        price,
        priceCurrency,
      })}
    />
  );
}

/**
 * Widest honest area for an unscoped Service.
 *
 * One served state collapses to that state's name; several stay as a list is
 * not expressible on `serviceSchema`, so the caller gets nothing and
 * `serviceSchema` applies its own default.
 */
async function resolveDefaultArea(): Promise<string | undefined> {
  const areas = await getServedAreas();
  if (!areas?.length) return undefined;

  const states = [...new Set(areas.map((area) => area.state))];
  return states.length === 1 ? states[0] : undefined;
}
