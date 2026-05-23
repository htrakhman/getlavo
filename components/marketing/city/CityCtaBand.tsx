import Link from 'next/link';

type CityCtaBandProps = {
  label: string;
  href: string;
  description?: string;
  ctaType: string;
  citySlug: string;
  countySlug: string;
  variant?: 'primary' | 'secondary';
};

export function CityCtaBand({
  label,
  href,
  description,
  ctaType,
  citySlug,
  countySlug,
  variant = 'primary',
}: CityCtaBandProps) {
  const btnClass = variant === 'primary' ? 'btn-primary' : 'btn-ghost';
  return (
    <section
      className="card my-8 p-6 text-center sm:p-8"
      data-page-type="city"
      data-city={citySlug}
      data-county={countySlug}
      data-cta-type={ctaType}
    >
      {description ? (
        <p className="mb-4 text-sm leading-relaxed text-ink-300">{description}</p>
      ) : null}
      <Link href={href} className={`${btnClass} inline-block px-8 py-3`}>
        {label}
      </Link>
    </section>
  );
}
