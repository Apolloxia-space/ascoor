'use client';

import type { ReactNode } from 'react';

import { Button } from '@shared/components/ui/button';
import { cn } from '@shared/lib/utils';

type IconTileProps = {
  children: ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
  asChild?: boolean;
};

export function IconTile({
  children,
  label,
  active = false,
  onClick,
  asChild = false,
}: IconTileProps) {
  return (
    <Button
      type={asChild ? undefined : 'button'}
      variant="ghost"
      className={cn(
        'rounded-lg',
        active
          ? 'bg-primary/15 text-primary hover:bg-primary/15'
          : 'text-muted-foreground hover:bg-muted',
      )}
      size="icon-lg"
      onClick={onClick}
      aria-label={label}
      asChild={asChild}
    >
      {children}
    </Button>
  );
}
