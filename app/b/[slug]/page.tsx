import { supabaseServer } from '@/lib/supabase/server';
import { money } from '@/lib/format';
import Link from 'next/link';
import { BuildingAttributor } from './BuildingAttributor';
import { Logo } from '@/components/Logo';
import { NotifyMeForm } from './NotifyMeForm';

export default async function BuildingLandingPage({ params }: { params: { slug: string } }) {
  const sb = supabaseServer();

  const { data: building } = await sb
    .from('buildings')
    .select('id, name, city, region, address_line1, status, wash_day, welcome_message, logo_url, brand_color')
    .eq('slug', params.slug)
    .in('status', ['prospect', 'pilot', 'active'])
    .maybeSingle();

  if (!building) {
    return (
      <main className="min-h-screen bg-ink-950">
        <div className="mx-auto max-w-xl px-6 py-16">
          <Logo />
          <div className="mt-12 card p-8 text-center">
            <h1 className="font-display text-2xl">Link not found</h1>
            <p className="mt-2 text-sm text-ink-400">
              This link doesn't match an active building. Contact your property manager for the correct link.
            </p>
          </div>
        </div>
      </main>
    );
  }

  const { data: partnership } = await sb
    .from('partnerships')
    .select('id, status, operator:operators(id, name, description)')
    .eq('building_id', building.id)
    .in('status', ['active', 'pilot'])
    .maybeSingle();

  const operator = (partnership?.operator as any) ?? null;

  let packages: any[] = [];
  if (operator) {
    const { data: pkgs } = await sb
      .from('service_packages')
      .select('id, name, description, price_cents, est_minutes')
      .eq('operator_id', operator.id)
      .eq('active', true)
      .order('price_cents', { ascending: true });
    packages = pkgs ?? [];
  }

  return (
    <>
      <BuildingAttributor slug={params.slug} />
      <main className="min-h-screen bg-ink-950">
        <div className="mx-auto max-w-2xl px-6 py-10">
          <div className="flex justify-center">
            <Logo />
          </div>

          <div className="mt-10 text-center">
            {building.logo_url && (
              <img src={building.logo_url} alt="" className="mx-auto mb-4 max-h-16" />
            )}
            <h1 className="font-display text-4xl tracking-tight">{building.name}</h1>
            <p className="mt-1 text-sm text-ink-400">
              {building.address_line1 ? `${building.address_line1} · ` : ''}
              {building.city}{building.region ? `, ${building.region}` : ''}
            </p>
            <p className="mt-4 text-base text-ink-200">
              {building.welcome_message ?? 'Your building offers in-garage car washing through Lavo.'}
            </p>
          </div>

          {operator && packages.length > 0 ? (
            <div className="mt-10 space-y-6">
              <div className="card p-5 text-center">
                <div className="text-xs uppercase tracking-widest text-ink-400">Wash day</div>
                <div className="mt-1 font-display text-xl">
                  {building.wash_day ? `Every ${building.wash_day}` : 'TBD'}
                </div>
              </div>

              <div>
                <div className="text-xs uppercase tracking-widest text-ink-400 mb-3">Available packages</div>
                <div className="space-y-3">
                  {packages.map((p) => (
                    <div key={p.id} className="card p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="font-display text-lg">{p.name}</div>
                          {p.description && (
                            <p className="mt-1 text-sm text-ink-300">{p.description}</p>
                          )}
                          {p.est_minutes && (
                            <div className="mt-1 text-xs text-ink-500">~{p.est_minutes} min</div>
                          )}
                        </div>
                        <div className="font-display text-xl text-gleam shrink-0">
                          {money(p.price_cents)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <Link
                  href={`/signup?role=resident&building=${params.slug}`}
                  className="btn-primary w-full text-center py-4 text-base"
                >
                  Sign up and get your first wash →
                </Link>
                <Link
                  href={`/login?building=${params.slug}`}
                  className="btn-quiet w-full text-center"
                >
                  Already have an account? Sign in
                </Link>
              </div>
            </div>
          ) : (
            <div className="mt-10 space-y-6">
              <div className="card p-8 text-center">
                <h2 className="font-display text-xl">Launching soon</h2>
                <p className="mt-2 text-sm text-ink-300 leading-relaxed">
                  The program is launching soon at {building.name}.
                </p>
                <p className="mt-1 text-sm text-ink-400">
                  Leave your email and we'll notify you when registration opens.
                </p>
                <NotifyMeForm buildingId={building.id} />
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
