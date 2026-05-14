import { Logo } from '@/components/Logo';

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <Logo />
      <h1 className="mt-10 font-display text-3xl">About Lavo</h1>
      <p className="mt-4 text-sm text-ink-300">
        We help apartment residents keep a clean car without losing a Saturday. We help operators fill routes with trusted building demand. We help buildings ship a real amenity at zero cost.
      </p>
    </main>
  );
}
