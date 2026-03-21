'use client';

import { useRouter } from 'next/navigation';

import { useAuthStore } from '@/features/auth/use-auth-store';
import { paths } from '@shared/constants/paths';
import { Button } from '@shared/components/ui/button';
import { scrollToLogin } from './scroll-to-login';

export function LandingHeaderActions() {
  const router = useRouter();
  const { status, user } = useAuthStore();
  const isBusy = status === 'loading';

  const handleCTA = () => {
    if (isBusy) return;
    if (user) {
      router.push(paths.studio);
      return;
    }
    if (!scrollToLogin({ emphasize: true })) {
      router.push(paths.home);
    }
  };

  return (
    <Button
      className="h-auto rounded-full bg-primary px-4 py-1.5 font-medium text-primary-foreground shadow-[var(--shadow-card-active)] hover:bg-[color:var(--brand-600)]"
      type="button"
      onClick={handleCTA}
      disabled={isBusy}
      aria-busy={isBusy}
    >
      Try Ascoor
    </Button>
  );
}
