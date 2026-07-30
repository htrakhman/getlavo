import { Logo } from '@/components/Logo';

/** Interstitial shown while an already-authenticated visitor is sent to their portal. */
export function AuthRedirectNotice({ message }: { message: string }) {
  return (
    <main className="relative mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 py-10 text-center">
      <Logo />
      <p className="mt-10 text-sm text-ink-300">{message}</p>
    </main>
  );
}
