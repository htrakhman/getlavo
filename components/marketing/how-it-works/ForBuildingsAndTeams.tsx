import Link from 'next/link';

export function ForBuildingsAndTeams() {
  return (
    <section className="mx-auto max-w-2xl px-6 py-14 text-center">
      <h2 className="font-display text-2xl font-semibold tracking-tight text-ink-100">
        For buildings and wash teams
      </h2>
      <div className="mt-8 space-y-6 text-sm leading-relaxed text-ink-300">
        <p>
          <span className="font-medium text-ink-200">For buildings:</span> Offer a resident amenity
          without managing bookings or wash day coordination.
        </p>
        <p>
          <span className="font-medium text-ink-200">For wash teams:</span> Get connected with
          buildings that want recurring on-site wash days.
        </p>
      </div>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
        <Link href="/buildings" className="font-medium text-gleam hover:underline">
          For properties
        </Link>
        <Link href="/operators" className="font-medium text-gleam hover:underline">
          For operators
        </Link>
      </div>
    </section>
  );
}
