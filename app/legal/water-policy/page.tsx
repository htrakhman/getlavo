import { Logo } from '@/components/Logo';

export default function WaterPolicyPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <Logo />
      <h1 className="mt-10 font-display text-3xl">Water and environmental compliance</h1>
      <p className="mt-4 text-sm text-ink-300">
        All Lavo operators use waterless or water-reclaim systems that follow local stormwater rules. Buildings should still confirm garage rules with their operator before go-live.
      </p>
    </main>
  );
}
