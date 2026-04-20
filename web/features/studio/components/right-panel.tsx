'use client';

import { CreatePanelContent } from './chat-panel';
import { PartsPanelContent } from './parts-panel';
import { StudioSidePanel } from './studio-side-panel';
import type { PartNode } from '../lib/model-parts';
import type { RightPanelMode } from '../types';

type RightPanelProps = {
  open: boolean;
  mode: RightPanelMode;
  parts: Array<PartNode>;
  activePartIds?: ReadonlySet<string>;
  activePartId?: string | null;
  onToggle?: () => void;
  onPreviewPart?: (nodeId: string) => void;
};

const PANEL_COPY: Record<
  RightPanelMode,
  { title: string; description?: string; resizeLabel: string }
> = {
  create: {
    title: 'Create',
    description: 'Generate an asset pack from a prompt.',
    resizeLabel: 'Resize create panel',
  },
  parts: {
    title: 'Parts',
    description: 'Preview one part at a time.',
    resizeLabel: 'Resize parts panel',
  },
};

export function RightPanel({
  open,
  mode,
  parts,
  activePartIds = new Set<string>(),
  activePartId = null,
  onToggle,
  onPreviewPart,
}: RightPanelProps) {
  const panelCopy = PANEL_COPY[mode] ?? PANEL_COPY.create;
  const content =
    mode === 'parts' ? (
      <PartsPanelContent
        parts={parts}
        activePartIds={activePartIds}
        activePartId={activePartId}
        onPreviewPart={onPreviewPart}
      />
    ) : (
      <CreatePanelContent open={open} />
    );

  return (
    <StudioSidePanel
      open={open}
      title={panelCopy.title}
      description={panelCopy.description}
      resizeAriaLabel={panelCopy.resizeLabel}
      onToggle={onToggle}
      bodyClassName="relative overflow-hidden p-0"
    >
      <div
        key={mode}
        className="h-full min-h-0 overflow-y-auto p-4 animate-in fade-in-0 slide-in-from-right-2 duration-200"
      >
        {content}
      </div>
    </StudioSidePanel>
  );
}
