import { supabaseServer } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { parseSizePrices } from '@/lib/vehicle-sizes';
import { SizePriceList } from '@/components/SizePriceList';
import { PackageDescription } from '@/components/PackageDescription';

export default async function PublicOperatorPage({ params }: { params: { slug: string } }) {
  const sb = supabaseServer();
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.slug);
  // Public, indexable page: keep the stricter gate in the query. RLS no longer
  // requires stripe onboarding (operators are listed to buildings while they
  // finish setup), but an unfinished account shouldn't get a marketing page.
  let req = sb
    .from('operators')
    .select('id, name, description, base_price_cents, open_slot_price_cents, seo_slug')
    .eq('status', 'approved')
    .eq('stripe_onboarding_complete', true);
  req = isUuid ? req.eq('id', params.slug) : req.eq('seo_slug', params.slug);
  const { data: op } = await req.maybeSingle();
  if (!op) notFound();

  const { data: pkgs } = await sb
    .from('service_packages')
    .select('name, price_cents, description, size_prices')
    .eq('operator_id', op.id)
    .eq('active', true)
    .order('price_cents', { ascending: true });

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="font-display text-4xl">{op.name}</h1>
      {op.description && <p className="mt-3 text-ink-300">{op.description}</p>}
      {(op.base_price_cents ?? 0) > 0 && (
        <p className="mt-4 text-sm text-ink-500">
          From {((op.base_price_cents as number) / 100).toFixed(0)} dollars on building wash days when partnered.
        </p>
      )}
      <div className="mt-8 space-y-3">
        {(pkgs ?? []).map((p) => {
          const sizePrices = parseSizePrices(p.size_prices);
          return (
            <div key={p.name} className="card p-4">
              <div className="flex justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium">{p.name}</div>
                  <PackageDescription text={p.description} className="mt-1 text-xs text-ink-500" />
                </div>
                <div className="text-gleam font-display whitespace-nowrap">
                  {sizePrices.length > 0 ? 'from ' : ''}${((p.price_cents ?? 0) / 100).toFixed(0)}
                </div>
              </div>
              {/* Full card width, not the header's left column — that column is
                  narrowed by the headline price, which differs per package. */}
              <SizePriceList raw={p.size_prices} description={p.description} className="mt-2 text-xs text-ink-500" />
            </div>
          );
        })}
      </div>
    </main>
  );
}
