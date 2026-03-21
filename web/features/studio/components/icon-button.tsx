'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { cn } from '@shared/lib/utils';

type IconButtonProps = {
  children: ReactNode;
  label: string;
} & ButtonHTMLAttributes<HTMLButtonElement>;

export function IconButton({
  children,
  label,
  className,
  disabled,
  type,
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type ?? 'button'}
      className={cn(
        'relative grid place-items-center px-3 py-2 text-muted-foreground hover:bg-muted',
        disabled && 'pointer-events-none opacity-50',
        className,
      )}
      aria-label={label}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
