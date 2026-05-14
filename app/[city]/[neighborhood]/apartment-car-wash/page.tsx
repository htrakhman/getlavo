import neighborhoods from '@/lib/launch-neighborhoods.json';
import Link from 'next/link';

export function generateStaticParams() {
  return neighborhoods.map((n) => ({ city: n.city, neighborhood: n.neighborhood }));
}

export default function NeighborhoodSeoPage({ params }: { params: { city: string; neighborhood: string } }) {
  const row = neighborhoods.find((n) => n.city === params.city && n.neighborhood === params.neighborhood);
  const title = row?.title ?? `${params.neighborhood}`;
  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="font-display text-4xl">Apartment car wash in {title}</h1>
      <p className="mt-4 text-ink-300">
        Lavo brings vetted mobile crews to apartment garages. Residents book on their phone. Buildings pay nothing.
      </p>
      <Link href="/" className="btn-primary mt-8 inline-block">
        See if your building is on Lavo
      </Link>
    </main>
  );
}
