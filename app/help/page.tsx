import { Logo } from '@/components/Logo';
import Link from 'next/link';

export default function HelpPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <Logo />
      <h1 className="mt-10 font-display text-3xl">Help center</h1>
      <p className="mt-3 text-sm text-ink-400">
        Articles for residents, operators, and buildings live in Notion for now.{' '}
        <Link href="https://notion.so" className="text-gleam hover:underline">
          Open the library
        </Link>
        . Email hello@getlavo.io for anything urgent.
      </p>
    </main>
  );
}
