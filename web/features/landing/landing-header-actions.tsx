'use client';

import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { useAuthStore } from '@/features/auth/use-auth-store';
import { signInWithGoogle } from '@/features/auth/use-auth-init';
import { cn } from '@/shared/lib/utils';
import { paths } from '@shared/constants/paths';
import { Button } from '@shared/components/ui/button';

export function LandingHeaderActions() {
  return <LandingHeaderActionButton syncLabelWithAuth />;
}

type LandingHeaderActionButtonProps = {
  syncLabelWithAuth?: boolean;
  shine?: boolean;
};

export function LandingHeaderActionButton({
  syncLabelWithAuth = false,
  shine = false,
}: LandingHeaderActionButtonProps) {
  const router = useRouter();
  const { status, user } = useAuthStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isResolvingAuth = status === 'idle' || status === 'loading';
  const isBusy = (syncLabelWithAuth && isResolvingAuth) || isSubmitting;

  const handleCTA = async () => {
    if (isBusy) return;
    if (user) {
      router.push(paths.studio);
      return;
    }
    setIsSubmitting(true);
    try {
      await signInWithGoogle();
      router.push(paths.studio);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Button
      className={cn(
        'h-auto min-w-[104px] rounded-md bg-[#e7a8b0] px-4 py-1.5 font-medium text-[#233226] shadow-[0_12px_24px_rgba(35,50,38,0.08)] hover:bg-[#de959f]',
        shine && !isBusy && 'relative overflow-hidden',
      )}
      type="button"
      onClick={handleCTA}
      disabled={isBusy}
      aria-busy={isBusy}
    >
      {shine && !isBusy ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 -left-2/3 z-0 w-1/2 animate-[studio-cta-shine_2.2s_ease-in-out_infinite] skew-x-[-18deg] bg-white/80"
        />
      ) : null}
      {syncLabelWithAuth && isResolvingAuth ? (
        <Loader2 className="relative z-10 size-4 animate-spin" />
      ) : user ? (
        <span className="relative z-10">{syncLabelWithAuth ? 'Home' : 'Try Ascoor'}</span>
      ) : (
        <span className="relative z-10">Try Ascoor</span>
      )}
    </Button>
  );
}
