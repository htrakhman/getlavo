import { supabaseServer } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';

export default async function PublicOperatorPage({ params }: { params: { slug: string } }) {
  const sb = supabaseServer();
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.slug);
  let req = sb
    .from('operators')
    .select('id, name, description, base_price_cents, open_slot_price_cents, seo_slug')
    .eq('status', 'approved');
  req = isUuid ? req.eq('id', params.slug) : req.eq('seo_slug', params.slug);
  const { data: op } = await req.maybeSingle();
  if (!op) notFound();

  const { data: pkgs } = await sb
    .from('service_packages')
    .select('name, price_cents, description')
    .eq('operator_id', op.id)
    .eq('active', true)
    .order('price_cents', { ascending: true });

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="font-display text-4xl">{op.name}</h1>
      {op.description && <p className="mt-3 text-ink-300">{op.description}</p>}
      <p className="mt-4 text-sm text-ink-500">
        From {((op.base_price_cents ?? 0) / 100).toFixed(0)} dollars on building wash days when partnered.
      </p>
      <div className="mt-8 space-y-3">
        {(pkgs ?? []).map((p) => (
          <div key={p.name} className="card p-4 flex justify-between gap-3">
            <div>
              <div className="font-medium">{p.name}</div>
              {p.description && <div className="text-xs text-ink-500 mt-1">{p.description}</div>}
            </div>
            <div className="text-gleam font-display">${((p.price_cents ?? 0) / 100).toFixed(0)}</div>
          </div>
        ))}
      </div>
    </main>
  );
}
