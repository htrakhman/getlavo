import Link from 'next/link';
import { Logo } from '@/components/Logo';

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 py-10 text-center">
      <Logo />
      <div className="mt-12">
        <div className="font-display text-6xl text-gleam">404</div>
        <h1 className="mt-3 font-display text-2xl">We couldn't find that page.</h1>
        <p className="mt-2 text-sm text-ink-400">The link may be broken or the page may have moved.</p>
        <div className="mt-6 flex flex-col gap-2">
          <Link href="/" className="btn-primary">Back home</Link>
          <Link href="/login" className="btn-quiet">Sign in</Link>
        </div>
      </div>
    </main>
  );
}
