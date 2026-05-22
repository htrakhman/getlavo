import Link from 'next/link';

const CTAS = [
  {
    role: 'I manage a property',
    href: '/signup?role=building_manager',
    label: 'Add your building',
    variant: 'primary' as const,
  },
  {
    role: 'I live in a building',
    href: '/#request-lavo',
    label: 'Request Lavo',
    variant: 'primary' as const,
  },
  {
    role: 'I run a mobile car wash',
    href: '/signup?role=operator',
    label: 'Apply as an operator',
    variant: 'ghost' as const,
  },
] as const;

export function FinalCtaGrid() {
  return (
    <section className="mx-auto max-w-4xl px-6 py-12">
      <h2 className="font-display text-center text-3xl font-semibold tracking-tight md:text-4xl">
        Bring Lavo to your building
      </h2>
      <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
        {CTAS.map((cta) => (
          <div key={cta.role} className="card flex flex-col p-6 text-center">
            <p className="text-sm text-ink-400">{cta.role}</p>
            <Link
              href={cta.href}
              className={`mt-6 w-full ${cta.variant === 'primary' ? 'btn-primary' : 'btn-ghost'}`}
            >
              {cta.label}
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}
