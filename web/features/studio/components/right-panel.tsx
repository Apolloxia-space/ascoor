'use client';

import { CreatePanelContent } from './chat-panel';
import { StudioSidePanel } from './studio-side-panel';
import type { PartNode } from '../lib/model-parts';

type RightPanelProps = {
  open: boolean;
  parts: Array<PartNode>;
  activePartId?: string | null;
  onToggle?: () => void;
  onPreviewPart?: (nodeId: string) => void;
  hasSelectedPack?: boolean;
  showJavaScriptDownload?: boolean;
  onDownloadZip?: () => void;
  onDownloadJavaScript?: () => void;
};

export function RightPanel({
  open,
  parts,
  activePartId = null,
  onToggle,
  onPreviewPart,
  hasSelectedPack = false,
  showJavaScriptDownload = false,
  onDownloadZip,
  onDownloadJavaScript,
}: RightPanelProps) {
  return (
    <StudioSidePanel
      open={open}
      title="Activity"
      description="Track pack generation."
      showHeader={false}
      resizeAriaLabel="Resize activity panel"
      onToggle={onToggle}
      bodyClassName="relative overflow-hidden p-0"
    >
      <div className="h-full min-h-0 overflow-y-auto p-4 animate-in fade-in-0 slide-in-from-right-2 duration-200">
        <CreatePanelContent
          open={open}
          hasSelectedPack={hasSelectedPack}
          showJavaScriptDownload={showJavaScriptDownload}
          parts={parts}
          activePartId={activePartId}
          onDownloadZip={onDownloadZip}
          onDownloadJavaScript={onDownloadJavaScript}
          onPreviewPart={onPreviewPart}
        />
      </div>
    </StudioSidePanel>
  );
}
