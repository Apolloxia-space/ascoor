'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { signInWithGoogle } from '@/features/auth/use-auth-init';
import { useAuthStore } from '@/features/auth/use-auth-store';
import { cn } from '@/shared/lib/utils';
import { paths } from '@shared/constants/paths';
import { Button } from '@shared/components/ui/button';

type HeroSignupCardProps = {
  className?: string;
  overlay?: boolean;
};

export function HeroSignupCard({ className, overlay = false }: HeroSignupCardProps) {
  const { status } = useAuthStore();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEmphasis, setIsEmphasis] = useState(false);
  const isLoading = status === 'loading';
  const isBusy = isLoading || isSubmitting;

  useEffect(() => {
    if (status !== 'unauthenticated') return;
    setIsEmphasis(true);
    const timer = window.setTimeout(() => setIsEmphasis(false), 2400);
    return () => window.clearTimeout(timer);
  }, [status]);

  useEffect(() => {
    let timer: number | null = null;
    const handleEmphasis = () => {
      if (timer) window.clearTimeout(timer);
      setIsEmphasis(true);
      timer = window.setTimeout(() => setIsEmphasis(false), 2400);
    };
    window.addEventListener('landing-login-emphasis', handleEmphasis);
    return () => {
      window.removeEventListener('landing-login-emphasis', handleEmphasis);
      if (timer) window.clearTimeout(timer);
    };
  }, []);

  return (
    <div
      className={cn(
        'transition',
        overlay
          ? 'rounded-[28px] border border-white/20 bg-background/10 p-4 shadow-[0_18px_80px_rgba(15,23,42,0.18)] backdrop-blur-[10px] sm:p-5'
          : 'rounded-2xl border border-border/70 bg-card/80 p-6 shadow-[var(--shadow-card-active)] backdrop-blur',
        isEmphasis
          ? 'ring-2 ring-primary/40 shadow-[0_0_0_6px_rgba(99,102,241,0.12),var(--shadow-card-active)] animate-pulse'
          : '',
        className,
      )}
    >
      {overlay ? (
        <div className="mb-3 text-center text-foreground [text-shadow:0_2px_16px_rgba(255,255,255,0.28),0_10px_30px_rgba(15,23,42,0.18)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-foreground/82">
            For 3D Printing
          </p>
          <h1 className="mt-2 text-2xl font-semibold leading-tight md:text-3xl">
            Turn prompts into <span className="text-primary">printable drafts.</span>
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-foreground/84">
            Generate a first model, fix the surfaces that matter, and export STL without
            leaving the browser.
          </p>
          <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-foreground/72">
            Prompt - Edit - STL - Print
          </p>
        </div>
      ) : null}
      <Button
        className={cn(
          'h-auto w-full justify-center gap-3 rounded-xl py-2.5 text-sm font-medium text-foreground',
          overlay
            ? 'border border-white/35 bg-background/85 shadow-[0_10px_30px_rgba(15,23,42,0.12)] hover:bg-background'
            : 'border border-border/70 bg-background/80 hover:bg-muted/60',
        )}
        type="button"
        onClick={async () => {
          if (isBusy) {
            return;
          }
          setIsSubmitting(true);
          try {
            await signInWithGoogle();
            router.push(paths.studio);
          } finally {
            setIsSubmitting(false);
          }
        }}
        disabled={isBusy}
        aria-busy={isBusy}
      >
        <GoogleMark />
        Continue with Google
      </Button>
      <p className={cn('mt-2 text-xs text-muted-foreground', overlay && 'text-foreground/78')}>
        By continuing, you acknowledge our{' '}
        <a
          className={cn(
            'text-foreground underline-offset-4 hover:underline',
            overlay && 'text-foreground',
          )}
          href={paths.privacy}
        >
          privacy policy
        </a>
        .
      </p>
    </div>
  );
}

function GoogleMark() {
  return (
    <span className="inline-flex size-6 items-center justify-center rounded-full bg-white">
      <svg viewBox="0 0 533.5 544.3" className="h-5 w-5" aria-hidden="true">
        <path
          fill="#EA4335"
          d="M533.5 278.4c0-17.4-1.6-34.1-4.7-50.4H272v95.4h146.9c-6.3 34-25.1 62.8-53.5 82v68.2h86.5c50.6-46.6 81.6-115.3 81.6-195.2z"
        />
        <path
          fill="#34A853"
          d="M272 544.3c72.6 0 133.5-24 178-65.1l-86.5-68.2c-24 16.1-54.8 25.5-91.5 25.5-70.4 0-130-47.5-151.2-111.3H31v69.9c44.7 88.5 136.6 149.2 241 149.2z"
        />
        <path
          fill="#4A90E2"
          d="M120.8 325.2c-10.3-30.6-10.3-63.5 0-94.1V161.2H31c-42.6 84.6-42.6 185 0 269.6l89.8-69.1z"
        />
        <path
          fill="#FBBC05"
          d="M272 107.7c39.5-.6 77.3 14 106.1 40.9l79.1-79.1C432.5 24.6 373 0 311 0 206.6 0 114.7 60.7 70 149.2l89.8 69.9C142 155.2 201.6 107.7 272 107.7z"
        />
      </svg>
    </span>
  );
}
