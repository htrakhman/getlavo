import Link from 'next/link';

export function ResidentHero() {
  return (
    <section className="relative px-6 pb-16 pt-16">
      <div className="mx-auto max-w-4xl text-center">
        <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-gleam/30 bg-gleam/5 px-4 py-1.5 text-xs font-medium text-gleam">
          How it works
        </div>
        <h1 className="font-display text-4xl font-semibold leading-[1.08] tracking-tight md:text-5xl lg:text-[3.25rem]">
          Car washes at your building, without leaving home.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-ink-300">
          Book from your phone. A vetted wash team comes to your building, washes your car, and
          lets you know when it&apos;s done.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-4">
          <Link href="#check-building" className="btn-primary px-8 py-3 text-base">
            Check My Building
          </Link>
          <Link
            href="#check-building"
            className="text-sm font-medium text-gleam hover:underline"
          >
            Request Lavo for my building
          </Link>
        </div>
      </div>
    </section>
  );
}
