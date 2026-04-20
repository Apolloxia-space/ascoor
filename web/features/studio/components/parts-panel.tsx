'use client';

import type { PartNode } from '../lib/model-parts';
import { cn } from '@shared/lib/utils';

type PartsPanelContentProps = {
  parts: Array<PartNode>;
  activePartIds?: ReadonlySet<string>;
  activePartId?: string | null;
  onPreviewPart?: (nodeId: string) => void;
};

export function PartsPanelContent({
  parts,
  activePartIds = new Set<string>(),
  activePartId = null,
  onPreviewPart,
}: PartsPanelContentProps) {
  if (parts.length === 0) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Parts
          </p>
          <p className="text-xs text-muted-foreground">0 parts</p>
        </div>
        <p className="text-sm text-muted-foreground">
          Parts appear here after the generated pack is loaded.
        </p>
      </div>
    );
  }

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Parts
        </p>
        <p className="text-xs text-muted-foreground">
          {parts.length} {parts.length === 1 ? 'part' : 'parts'}
        </p>
      </div>
      <div className="space-y-1">
        {parts.map((node) => {
          const isActive = activePartId === node.id || activePartIds.has(node.id);
          return (
            <button
              key={node.id}
              type="button"
              className={cn(
                'flex w-full items-center justify-between gap-3 rounded-md border px-3 py-2 text-left transition-colors',
                isActive
                  ? 'border-primary/60 bg-primary/10 text-foreground'
                  : 'border-transparent text-foreground hover:border-border hover:bg-muted/60',
              )}
              onClick={() => onPreviewPart?.(node.id)}
            >
              <span className="min-w-0 flex-1 truncate text-sm font-medium">
                {node.displayName}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
