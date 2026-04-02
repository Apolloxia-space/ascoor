'use client';

import { AppearancePanelContent } from './appearance-panel';
import { CreatePanelContent } from './chat-panel';
import { EditPanelContent } from './edit-panel';
import { StudioSidePanel } from './studio-side-panel';
import type { ResetTransformTarget, SelectedNode, TransformAxis } from './three-viewer';
import type { StructureTreeNode } from '../lib/structure-tree';
import type { RightPanelMode } from '../types';

type RightPanelProps = {
  open: boolean;
  mode: RightPanelMode;
  projectId: string | null;
  structureTree: Array<StructureTreeNode>;
  selectedNodes?: Array<SelectedNode>;
  activeSelectedNode?: SelectedNode | null;
  activeSelectedNodeId?: string | null;
  selectedNodeIds?: ReadonlySet<string>;
  moveStep: number;
  onMoveStepChange?: (step: number) => void;
  rotateStep: number;
  onRotateStepChange?: (step: number) => void;
  scaleStep: number;
  onScaleStepChange?: (step: number) => void;
  onToggle?: () => void;
  onFocusStructureNode?: (nodeId: string, options?: { additive?: boolean }) => void;
  onSetStructureNodeHidden?: (nodeId: string, hidden: boolean) => void;
  onNudgeNode?: (axis: TransformAxis, delta: number) => void;
  onRotateNode?: (axis: TransformAxis, deltaRadians: number) => void;
  onSetNodeRotation?: (axis: TransformAxis, radians: number) => void;
  onNudgeNodeScale?: (axis: TransformAxis, delta: number) => void;
  onSetNodeScale?: (axis: TransformAxis, value: number) => void;
  onResetNode?: (target: ResetTransformTarget) => void;
  onHideSelectedNode?: () => void;
  onRestoreNode?: (nodeId: string) => void;
  onSetSelectedNodeColor?: (hex: string) => void;
  onResetSelectedNodeColor?: () => void;
  onSetSelectedNodeEmissiveColor?: (hex: string) => void;
  onSetSelectedNodeEmissiveIntensity?: (value: number) => void;
  onResetSelectedNodeEmissive?: () => void;
  onSetSelectedNodeRoughness?: (value: number) => void;
  onResetSelectedNodeRoughness?: () => void;
};

const PANEL_COPY: Record<
  RightPanelMode,
  { title: string; description?: string; resizeLabel: string }
> = {
  create: {
    title: 'Create',
    description: 'Generate a design from a prompt.',
    resizeLabel: 'Resize create panel',
  },
  edit: {
    title: 'Edit',
    resizeLabel: 'Resize edit panel',
  },
  appearance: {
    title: 'Appearance',
    description: 'Adjust part colors.',
    resizeLabel: 'Resize appearance panel',
  },
};

export function RightPanel({
  open,
  mode,
  projectId,
  structureTree,
  selectedNodes = [],
  activeSelectedNode = null,
  activeSelectedNodeId = null,
  selectedNodeIds = new Set<string>(),
  moveStep,
  onMoveStepChange,
  rotateStep,
  onRotateStepChange,
  scaleStep,
  onScaleStepChange,
  onToggle,
  onFocusStructureNode,
  onSetStructureNodeHidden,
  onNudgeNode,
  onRotateNode,
  onSetNodeRotation,
  onNudgeNodeScale,
  onSetNodeScale,
  onResetNode,
  onHideSelectedNode,
  onRestoreNode,
  onSetSelectedNodeColor,
  onResetSelectedNodeColor,
  onSetSelectedNodeEmissiveColor,
  onSetSelectedNodeEmissiveIntensity,
  onResetSelectedNodeEmissive,
  onSetSelectedNodeRoughness,
  onResetSelectedNodeRoughness,
}: RightPanelProps) {
  const panelCopy = PANEL_COPY[mode];
  const content =
    mode === 'create' ? (
      <CreatePanelContent open={open} projectId={projectId} />
    ) : mode === 'edit' ? (
      <EditPanelContent
        structureTree={structureTree}
        selectedNodes={selectedNodes}
        activeSelectedNode={activeSelectedNode}
        activeSelectedNodeId={activeSelectedNodeId}
        selectedNodeIds={selectedNodeIds}
        moveStep={moveStep}
        onMoveStepChange={onMoveStepChange}
        rotateStep={rotateStep}
        onRotateStepChange={onRotateStepChange}
        scaleStep={scaleStep}
        onScaleStepChange={onScaleStepChange}
        onFocusStructureNode={onFocusStructureNode}
        onSetStructureNodeHidden={onSetStructureNodeHidden}
        onNudgeNode={onNudgeNode}
        onRotateNode={onRotateNode}
        onSetNodeRotation={onSetNodeRotation}
        onNudgeNodeScale={onNudgeNodeScale}
        onSetNodeScale={onSetNodeScale}
        onResetNode={onResetNode}
        onHideSelectedNode={onHideSelectedNode}
        onRestoreNode={onRestoreNode}
      />
    ) : (
      <AppearancePanelContent
        structureTree={structureTree}
        selectedNodes={selectedNodes}
        activeSelectedNode={activeSelectedNode}
        activeSelectedNodeId={activeSelectedNodeId}
        selectedNodeIds={selectedNodeIds}
        onFocusStructureNode={onFocusStructureNode}
        onSetStructureNodeHidden={onSetStructureNodeHidden}
        onSetSelectedNodeColor={onSetSelectedNodeColor}
        onResetSelectedNodeColor={onResetSelectedNodeColor}
        onSetSelectedNodeEmissiveColor={onSetSelectedNodeEmissiveColor}
        onSetSelectedNodeEmissiveIntensity={onSetSelectedNodeEmissiveIntensity}
        onResetSelectedNodeEmissive={onResetSelectedNodeEmissive}
        onSetSelectedNodeRoughness={onSetSelectedNodeRoughness}
        onResetSelectedNodeRoughness={onResetSelectedNodeRoughness}
      />
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
