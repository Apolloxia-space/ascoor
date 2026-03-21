'use client';

import { useRouter } from 'next/navigation';

import { useAuthStore } from '@/features/auth/use-auth-store';
import { paths } from '@shared/constants/paths';
import { cn } from '@shared/lib/utils';
import { Button } from '@shared/components/ui/button';
import { scrollToLogin } from './scroll-to-login';

type PlanCTAButtonProps = {
  label: string;
  authedPath: string;
  className?: string;
};

export function PlanCTAButton({ label, authedPath, className }: PlanCTAButtonProps) {
  const router = useRouter();
  const { status, user } = useAuthStore();
  const isBusy = status === 'loading';

  return (
    <Button
      variant="ghost"
      className={cn(className, isBusy && 'cursor-not-allowed opacity-60')}
      type="button"
      onClick={() => {
        if (isBusy) return;
        if (user) {
          router.push(authedPath);
          return;
        }
        if (!scrollToLogin({ emphasize: true })) {
          router.push(paths.home);
        }
      }}
      disabled={isBusy}
      aria-busy={isBusy}
    >
      {label}
    </Button>
  );
}
