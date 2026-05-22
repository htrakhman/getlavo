'use client';

import Script from 'next/script';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { generateGoogleNonce } from '@/lib/auth/google-nonce';
import type { SignupRole } from '@/lib/portal-routing';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: Record<string, unknown>) => void;
          renderButton: (parent: HTMLElement, config: Record<string, unknown>) => void;
          prompt: () => void;
        };
      };
    };
  }
}

type GoogleSignInButtonProps = {
  label?: string;
  className?: string;
  disabled?: boolean;
  /** Sign-up role (also stored via oauth-signup-intent cookie when set). */
  signupRole?: SignupRole | null;
  /** Login deep-link target (`/resident`, `/building`, `/operator`). */
  nextPath?: string | null;
  onError?: (message: string) => void;
  onBusyChange?: (busy: boolean) => void;
};

/**
 * Google Identity Services sign-in (ID token → Supabase).
 * Shows getlavo.io on Google's consent screen instead of *.supabase.co.
 */
export function GoogleSignInButton({
  label = 'Continue with Google',
  className,
  disabled,
  signupRole,
  nextPath,
  onError,
  onBusyChange,
}: GoogleSignInButtonProps) {
  const containerId = useId().replace(/:/g, '');
  const containerRef = useRef<HTMLDivElement>(null);
  const [scriptReady, setScriptReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  const setBusyState = useCallback(
    (v: boolean) => {
      setBusy(v);
      onBusyChange?.(v);
    },
    [onBusyChange]
  );

  const completeUrl = useCallback(() => {
    const params = new URLSearchParams();
    if (signupRole) params.set('role', signupRole);
    if (nextPath) params.set('next', nextPath);
    const qs = params.toString();
    return `${window.location.origin}/auth/google-complete${qs ? `?${qs}` : ''}`;
  }, [signupRole, nextPath]);

  const handleCredential = useCallback(
    async (credential: string, nonce: string) => {
      setBusyState(true);
      try {
        if (signupRole) {
          const intent = await fetch('/api/auth/oauth-signup-intent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role: signupRole }),
          });
          if (!intent.ok) {
            onError?.('Could not start sign-up — try again.');
            return;
          }
        }

        const sb = supabaseBrowser();
        const { error } = await sb.auth.signInWithIdToken({
          provider: 'google',
          token: credential,
          nonce,
        });
        if (error) {
          onError?.(error.message);
          return;
        }
        window.location.href = completeUrl();
      } catch {
        onError?.('Google sign-in failed — try again.');
      } finally {
        setBusyState(false);
      }
    },
    [signupRole, completeUrl, onError, setBusyState]
  );

  const renderButton = useCallback(async () => {
    if (!clientId || !scriptReady || !containerRef.current || !window.google?.accounts?.id) return;

    const [nonce, hashedNonce] = await generateGoogleNonce();
    containerRef.current.innerHTML = '';

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: (response: { credential?: string }) => {
        if (!response.credential) {
          onError?.('Google sign-in was cancelled.');
          return;
        }
        void handleCredential(response.credential, nonce);
      },
      nonce: hashedNonce,
      use_fedcm_for_prompt: true,
    });

    window.google.accounts.id.renderButton(containerRef.current, {
      type: 'standard',
      theme: 'filled_black',
      size: 'large',
      text: 'continue_with',
      width: containerRef.current.offsetWidth || 360,
    });
  }, [clientId, scriptReady, handleCredential, onError]);

  useEffect(() => {
    void renderButton();
  }, [renderButton]);

  if (!clientId) {
    return (
      <p className="text-xs text-amber-400/90">
        Google sign-in is not configured (missing NEXT_PUBLIC_GOOGLE_CLIENT_ID).
      </p>
    );
  }

  return (
    <>
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onReady={() => setScriptReady(true)}
      />
      <div className={className ?? 'relative w-full'}>
        <div
          id={containerId}
          ref={containerRef}
          className={`flex min-h-[48px] w-full items-center justify-center ${disabled || busy ? 'pointer-events-none opacity-50' : ''}`}
          aria-busy={busy}
          aria-label={label}
        />
        {busy && (
          <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-ink-950/60 text-sm text-ink-300">
            Signing in…
          </div>
        )}
      </div>
    </>
  );
}

export function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
    </svg>
  );
}
