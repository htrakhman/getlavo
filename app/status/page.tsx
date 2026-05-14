import { Logo } from '@/components/Logo';

export default function StatusPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <Logo />
      <h1 className="mt-10 font-display text-3xl">System status</h1>
      <p className="mt-4 text-sm text-ink-300">All systems operational. Connect Better Stack or Atlassian Statuspage for live checks.</p>
    </main>
  );
}
