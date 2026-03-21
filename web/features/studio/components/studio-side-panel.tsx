'use client';

import { useEffect, useRef, useState } from 'react';

import { Button } from '@shared/components/ui/button';
import { cn } from '@shared/lib/utils';

type StudioSidePanelProps = {
  open: boolean;
  title: string;
  description: string;
  variant?: 'desktop' | 'mobile';
  resizeAriaLabel: string;
  onToggle?: () => void;
  bodyClassName?: string;
  children: React.ReactNode;
};

const PANEL_MIN_WIDTH = 300;
const PANEL_MAX_WIDTH = 620;
const PANEL_DEFAULT_WIDTH = 380;

export function StudioSidePanel({
  open,
  title,
  description,
  variant = 'desktop',
  resizeAriaLabel,
  onToggle,
  bodyClassName,
  children,
}: StudioSidePanelProps) {
  const isMobileVariant = variant === 'mobile';
  const [panelWidth, setPanelWidth] = useState(PANEL_DEFAULT_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const resizeStateRef = useRef<{ startX: number; startWidth: number } | null>(null);

  useEffect(() => {
    if (!isResizing) return;
    const body = document.body;
    const previousCursor = body.style.cursor;
    const previousUserSelect = body.style.userSelect;
    body.style.cursor = 'col-resize';
    body.style.userSelect = 'none';
    return () => {
      body.style.cursor = previousCursor;
      body.style.userSelect = previousUserSelect;
    };
  }, [isResizing]);

  const clampPanelWidth = (value: number) => {
    const maxWidth = Math.min(PANEL_MAX_WIDTH, Math.max(PANEL_MIN_WIDTH, window.innerWidth - 320));
    return Math.min(Math.max(value, PANEL_MIN_WIDTH), maxWidth);
  };

  const handleResizeStart = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!open || isMobileVariant) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    resizeStateRef.current = { startX: event.clientX, startWidth: panelWidth };
    setIsResizing(true);
  };

  const handleResizeMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!resizeStateRef.current) return;
    const delta = resizeStateRef.current.startX - event.clientX;
    setPanelWidth(clampPanelWidth(resizeStateRef.current.startWidth + delta));
  };

  const handleResizeEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!resizeStateRef.current) return;
    resizeStateRef.current = null;
    setIsResizing(false);
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  return (
    <aside
      style={{ width: open ? (isMobileVariant ? '100%' : panelWidth) : 0 }}
      className={cn(
        'relative min-h-0 flex-none overflow-x-hidden overflow-y-visible border-l border-border/80 bg-background/80 backdrop-blur transition-all duration-300',
        isMobileVariant ? 'flex h-full w-full flex-col' : 'hidden md:flex md:flex-col',
        open ? 'opacity-100' : 'border-transparent opacity-0',
      )}
    >
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label={resizeAriaLabel}
        onPointerDown={handleResizeStart}
        onPointerMove={handleResizeMove}
        onPointerUp={handleResizeEnd}
        onPointerCancel={handleResizeEnd}
        className={cn(
          'absolute inset-y-0 left-0 z-20 w-3 cursor-col-resize',
          isMobileVariant && 'hidden',
          open ? 'opacity-0 hover:opacity-100' : 'pointer-events-none opacity-0',
        )}
      >
        <span className="absolute inset-y-0 left-1/2 w-[2px] -translate-x-1/2 rounded-full bg-border/80" />
      </div>

      <div className={cn('flex h-full min-h-0 flex-col', !open && 'pointer-events-none')}>
        <div className="flex items-center justify-between border-b border-border/70 px-4 py-3">
          <div className="space-y-0.5">
            <p className="text-sm font-semibold text-foreground">{title}</p>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
          {onToggle && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onToggle}>
              <span className="sr-only">Close panel</span>
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="size-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </Button>
          )}
        </div>

        <div className={cn('min-h-0 flex-1 space-y-4 overflow-y-auto p-4', bodyClassName)}>
          {children}
        </div>
      </div>
    </aside>
  );
}
