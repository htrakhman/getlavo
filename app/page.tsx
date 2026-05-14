import Link from 'next/link';
import { Suspense } from 'react';
import { MarketingNav, MarketingFooter } from '@/components/MarketingNav';
import { CheckBuildingFlow } from '@/components/CheckBuildingFlow';
import { getPublicWashPriceRangeCents } from '@/lib/marketing-pricing';
import { money } from '@/lib/format';
import { getSessionUser } from '@/lib/supabase/server';
import { pickLandingPortal } from '@/lib/portal-routing';
import { redirect } from 'next/navigation';

export default async function Home({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  // Supabase may redirect to SITE_URL (this page) instead of /auth/callback when
  // the callback URL isn't in its allowlist. Forward the params so the session
  // gets established correctly.
  const code = typeof searchParams.code === 'string' ? searchParams.code : null;
  const tokenHash = typeof searchParams.token_hash === 'string' ? searchParams.token_hash : null;
  const type = typeof searchParams.type === 'string' ? searchParams.type : null;
  const role = typeof searchParams.role === 'string' ? searchParams.role : null;

  if (code) {
    const qs = new URLSearchParams({ code });
    if (role) qs.set('role', role);
    redirect(`/auth/callback?${qs.toString()}`);
  }

  if (tokenHash && type) {
    const qs = new URLSearchParams({ token_hash: tokenHash, type });
    if (role) qs.set('role', role);
    redirect(`/auth/confirm?${qs.toString()}`);
  }

  const session = await getSessionUser();
  if (session) {
    const portal = pickLandingPortal(session.portals, session.profile.role);
    if (portal === 'building') redirect('/building');
    if (portal === 'operator') redirect('/operator');
    if (portal === 'resident') redirect('/resident');
    if (session.profile.role === 'admin') redirect('/admin');
    redirect('/auth/pick-role');
  }
  const priceRange = await getPublicWashPriceRangeCents();
  return (
    <main className="relative">
      <div className="absolute inset-x-0 top-0 h-[600px] bg-gleam-fade" />
      <MarketingNav />

      {/* Hero */}
      <section className="relative pt-16 pb-24 text-center px-6">
        <div className="mx-auto max-w-4xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-gleam/30 bg-gleam/5 px-4 py-1.5 text-xs font-medium text-gleam mb-8">
            Mobile car wash · For apartment residents
          </div>
          <h1 className="font-display text-5xl font-semibold leading-[1.05] tracking-tight md:text-6xl lg:text-7xl">
            Wash your car without<br />
            <span className="gleam-text">thinking about it.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-ink-300">
            Book from your phone. Operators are vetted and insured. Buildings pay nothing.
          </p>
          <div className="mt-10 mx-auto w-full max-w-xl text-center">
            <p className="mb-3 text-sm font-medium text-ink-200">See if your building is on Lavo.</p>
            <Suspense fallback={<div className="text-sm text-ink-500">Loading address search…</div>}>
              <CheckBuildingFlow />
            </Suspense>
          </div>
          <div className="mt-12 border-t border-white/10 pt-10">
            <p className="text-xs uppercase tracking-[0.18em] text-ink-300 mb-5">Operators and property teams</p>
            <div className="mx-auto flex max-w-lg flex-col gap-3 sm:flex-row sm:justify-center">
              <Link href="/signup?role=operator" className="w-full sm:flex-1 rounded-full border border-white/25 bg-white/5 px-5 py-3 text-center text-sm text-ink-100 transition-colors hover:border-white/40 hover:bg-white/10">
                I run a wash crew
              </Link>
              <Link href="/signup?role=building_manager" className="w-full sm:flex-1 rounded-full border border-white/25 bg-white/5 px-5 py-3 text-center text-sm text-ink-100 transition-colors hover:border-white/40 hover:bg-white/10">
                I manage a property
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="relative mx-auto max-w-6xl px-6 py-14">
        <div className="grid gap-5 md:grid-cols-3 md:gap-6">
          <div className="card p-7 text-left ring-1 ring-inset ring-white/[0.04] transition-colors hover:border-white/10">
            <div className="text-xs font-medium uppercase tracking-widest text-ink-500">Pricing</div>
            <p className="mt-4 font-display text-2xl text-gleam leading-tight">
              {money(priceRange?.min ?? 3500)} to {money(priceRange?.max ?? 6500)}
            </p>
            <p className="mt-4 text-sm leading-relaxed text-ink-400">
              Typical wash before add-ons. Your price is always confirmed before payment.
            </p>
          </div>
          <div className="card p-7 text-left ring-1 ring-inset ring-white/[0.04] transition-colors hover:border-white/10">
            <div className="text-xs font-medium uppercase tracking-widest text-ink-500">Coverage</div>
            <p className="mt-4 font-display text-2xl text-gleam leading-tight">Nationwide</p>
            <p className="mt-4 text-sm leading-relaxed text-ink-400">
              We onboard buildings across the U.S. Search your address above—if yours is not live yet, we use it to route demand to operators in your market.
            </p>
          </div>
          <div className="card p-7 text-left ring-1 ring-inset ring-white/[0.04] transition-colors hover:border-white/10">
            <div className="text-xs font-medium uppercase tracking-widest text-ink-500">Trust</div>
            <ul className="mt-4 space-y-3 text-sm text-ink-300">
              {[
                'Background-checked operators',
                'Insured crews',
                'Photo proof on every wash',
                'Stripe secure payments',
              ].map((line) => (
                <li key={line} className="flex gap-3">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gleam/70" aria-hidden />
                  <span className="leading-relaxed">{line}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* How it works — 3 actors */}
      <section className="relative mx-auto max-w-6xl px-6 py-20">
        <div className="text-center mb-14">
          <div className="text-xs uppercase tracking-[0.18em] text-gleam mb-2">Simple by design</div>
          <h2 className="font-display text-4xl">Three sides, one platform</h2>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="card p-8">
            <div className="mb-4">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="4" y="3" width="24" height="26" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                <rect x="9" y="8" width="4" height="4" rx="0.5" stroke="currentColor" strokeWidth="1.25" fill="none"/>
                <rect x="19" y="8" width="4" height="4" rx="0.5" stroke="currentColor" strokeWidth="1.25" fill="none"/>
                <rect x="9" y="16" width="4" height="4" rx="0.5" stroke="currentColor" strokeWidth="1.25" fill="none"/>
                <rect x="19" y="16" width="4" height="4" rx="0.5" stroke="currentColor" strokeWidth="1.25" fill="none"/>
                <rect x="13" y="23" width="6" height="6" rx="0.5" stroke="currentColor" strokeWidth="1.25" fill="none"/>
              </svg>
            </div>
            <h3 className="font-display text-2xl mb-2">Apartment buildings</h3>
            <p className="text-ink-300 text-sm leading-relaxed">
              Add a premium amenity for free. Share a QR code, watch your residents book washes. Zero cost, zero work — just a monthly stat to show leadership.
            </p>
            <Link href="/buildings" className="mt-6 inline-block text-sm text-gleam hover:underline">
              Property managers →
            </Link>
          </div>
          <div className="card p-8">
            <div className="mb-4">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 10 Q6 6 10 6 L18 6 Q20 6 21 8 L26 18 Q27 20 26 22 L26 26 Q26 27 25 27 L7 27 Q6 27 6 26 Z" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinejoin="round"/>
                <circle cx="10" cy="27" r="3" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                <circle cx="22" cy="27" r="3" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                <path d="M6 18 L26 18" stroke="currentColor" strokeWidth="1.25"/>
                <path d="M18 6 L22 18" stroke="currentColor" strokeWidth="1.25"/>
                <path d="M21 9 L26 9 Q28 9 28 11 L28 14 Q28 15 27 15 L26 15" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
              </svg>
            </div>
            <h3 className="font-display text-2xl mb-2">Car wash operators</h3>
            <p className="text-ink-300 text-sm leading-relaxed">
              Get recurring local demand without marketing spend. Partner with buildings in your radius, run scheduled wash days, and take individual bookings between visits.
            </p>
            <Link href="/operators" className="mt-6 inline-block text-sm text-gleam hover:underline">
              Car wash operators →
            </Link>
          </div>
          <div className="card p-8">
            <div className="mb-4">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="16" cy="16" r="13" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                <circle cx="16" cy="12" r="4" stroke="currentColor" strokeWidth="1.25" fill="none"/>
                <path d="M7 25 Q8 20 16 20 Q24 20 25 25" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" fill="none"/>
              </svg>
            </div>
            <h3 className="font-display text-2xl mb-2">Residents</h3>
            <p className="text-ink-300 text-sm leading-relaxed">
              Scan your building's QR, pick a date, pay. Your car gets washed at the building wash day rate, or book an on-demand slot any day the operator is available.
            </p>
          </div>
        </div>
      </section>

      {/* Resident features */}
      <section className="relative mx-auto max-w-6xl px-6 py-20">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 items-center">
          <div>
            <div className="text-xs uppercase tracking-[0.18em] text-gleam mb-3">For residents</div>
            <h2 className="font-display text-4xl font-semibold tracking-tight leading-[1.1] md:text-5xl mb-3">
              Clean car, <span className="gleam-text">zero effort</span>
            </h2>
            <p className="text-ink-400 text-sm leading-relaxed max-w-md mb-8">
              Book and pay from your phone. Operators your building already trusts, with prices shown before you confirm.
            </p>
            <ul className="space-y-5 text-sm text-ink-300">
              {[
                'Only see operators within your building\'s radius — no browsing random Yelp listings',
                'Book a building wash day slot (cheaper) or an on-demand open slot any available day',
                'Pay securely in-app. No cash, no Venmo, no awkward conversations',
                'Get a photo when your wash is done. Leave a review from your phone',
                'Add wax, interior detail, or tire shine as a one-tap upgrade',
              ].map((text) => (
                <li key={text} className="flex gap-3.5">
                  <span
                    className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gleam/70"
                    aria-hidden
                  />
                  <span className="leading-relaxed">{text}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-white/15 bg-ink-900/85 p-8 shadow-card backdrop-blur-xl ring-1 ring-inset ring-white/[0.06] space-y-5">
            <div>
              <div className="text-xs font-medium uppercase tracking-[0.18em] text-gleam">Building wash day</div>
              <p className="mt-2 text-sm leading-relaxed text-ink-200">
                Scheduled visit — operators set their own rate for partnered buildings. Residents always see the exact price before booking.
              </p>
            </div>
            <div className="border-t border-white/15 pt-5">
              <div className="text-xs font-medium uppercase tracking-[0.18em] text-gleam">On-demand slot</div>
              <p className="mt-2 text-sm leading-relaxed text-ink-200">
                Book any available date. Price is set by the operator and shown upfront.
              </p>
            </div>
            <p className="text-xs leading-relaxed text-ink-400">
              No surprises. Every operator sets their own rates.
            </p>
          </div>
        </div>
      </section>

      <section className="relative mx-auto max-w-3xl px-6 py-16">
        <div className="text-center mb-10">
          <div className="text-xs uppercase tracking-[0.18em] text-gleam mb-2">FAQ</div>
          <h2 className="font-display text-3xl">Questions we hear a lot</h2>
        </div>
        <dl className="space-y-6 text-sm text-ink-300">
          <div>
            <dt className="font-medium text-ink-100">Do I need to be home?</dt>
            <dd className="mt-1 leading-relaxed">
              Usually not. You tell us how to access your garage or spot. Many residents leave keys with concierge or use building protocols your operator already knows.
            </dd>
          </div>
          <div>
            <dt className="font-medium text-ink-100">How do I know the wash happened?</dt>
            <dd className="mt-1 leading-relaxed">
              Operators upload before-and-after photos to your booking. You get a notification when the wash is marked complete.
            </dd>
          </div>
          <div>
            <dt className="font-medium text-ink-100">What if my building is not listed yet?</dt>
            <dd className="mt-1 leading-relaxed">
              Use the checker at the top of this page. We track demand by address and notify you when an operator activates your building.
            </dd>
          </div>
          <div>
            <dt className="font-medium text-ink-100">Can I cancel?</dt>
            <dd className="mt-1 leading-relaxed">
              Yes — cancel from your resident portal up to 24 hours before your scheduled slot, per our terms.
            </dd>
          </div>
        </dl>
      </section>

      {/* Operator pitch */}
      {/* CTA strip */}
      <section className="relative mx-auto max-w-6xl px-6 py-20">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="card p-8">
            <h3 className="font-display text-2xl mb-2">Manage a building?</h3>
            <p className="text-sm text-ink-300 mb-6">Add Lavo as a free amenity. Takes 5 minutes. No credit card. Ever.</p>
            <Link href="/signup?role=building_manager" className="btn-primary">Get your building link →</Link>
          </div>
          <div className="card p-8">
            <h3 className="font-display text-2xl mb-2">Run a car wash?</h3>
            <p className="text-sm text-ink-300 mb-6">Apply to join our operator network and start receiving building partnerships.</p>
            <Link href="/signup?role=operator" className="btn-ghost">Apply as an operator →</Link>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </main>
  );
}
