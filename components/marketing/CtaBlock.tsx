import Link from 'next/link';

type CtaBlockProps = {
  label: string;
  href: string;
  description?: string;
};

export function CtaBlock({ label, href, description }: CtaBlockProps) {
  return (
    <section className="card p-8 text-center">
      {description ? (
        <p className="mb-4 text-sm leading-relaxed text-ink-300">{description}</p>
      ) : null}
      <Link href={href} className="btn-primary inline-block px-8 py-3">
        {label}
      </Link>
    </section>
  );
}
