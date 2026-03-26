'use client';

import { Boxes } from 'lucide-react';

import type { ResetTransformTarget, SelectedNode, TransformAxis } from './three-viewer';
import type { StructureTreeNode } from '../lib/structure-tree';
import { StructureTree } from './structure-tree';
import { StudioSidePanel } from './studio-side-panel';
import { TransformControls } from './transform-controls';
import { Button } from '@shared/components/ui/button';

type EditPanelProps = {
  open: boolean;
  structureTree: Array<StructureTreeNode>;
  selectedNode?: SelectedNode | null;
  variant?: 'desktop' | 'mobile';
  moveStep: number;
  onMoveStepChange?: (step: number) => void;
  rotateStep: number;
  onRotateStepChange?: (step: number) => void;
  scaleStep: number;
  onScaleStepChange?: (step: number) => void;
  onToggle?: () => void;
  onFocusStructureNode?: (nodeId: string) => void;
  onSetStructureNodeHidden?: (nodeId: string, hidden: boolean) => void;
  onNudgeNode?: (axis: TransformAxis, delta: number) => void;
  onRotateNode?: (axis: TransformAxis, deltaRadians: number) => void;
  onSetNodeRotation?: (axis: TransformAxis, radians: number) => void;
  onNudgeNodeScale?: (axis: TransformAxis, delta: number) => void;
  onSetNodeScale?: (axis: TransformAxis, value: number) => void;
  onResetNode?: (target: ResetTransformTarget) => void;
  onHideSelectedNode?: () => void;
  onRestoreNode?: (nodeId: string) => void;
};

export function EditPanel({
  open,
  structureTree,
  selectedNode = null,
  variant = 'desktop',
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
}: EditPanelProps) {
  return (
    <StudioSidePanel
      open={open}
      variant={variant}
      resizeAriaLabel="Resize edit panel"
      title="Edit"
      onToggle={onToggle}
    >
      <EditPanelContent
        structureTree={structureTree}
        selectedNode={selectedNode}
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
    </StudioSidePanel>
  );
}

type EditPanelContentProps = Omit<EditPanelProps, 'open' | 'variant' | 'onToggle'>;

export function EditPanelContent({
  structureTree,
  selectedNode = null,
  moveStep,
  onMoveStepChange,
  rotateStep,
  onRotateStepChange,
  scaleStep,
  onScaleStepChange,
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
}: EditPanelContentProps) {
  const rootNodeId = structureTree[0]?.id ?? null;

  return (
    <div className="space-y-4">
      <section className="space-y-3">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Workspace
          </p>
        </div>
        <div className="grid grid-cols-1 gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!rootNodeId}
            onClick={() => {
              if (!rootNodeId) return;
              onFocusStructureNode?.(rootNodeId);
            }}
          >
            <Boxes className="size-4" />
            Focus Full Model
          </Button>
        </div>
      </section>

      <div className="border-t border-border/70 pt-4">
        <TransformControls
          selectedNode={selectedNode}
          emptyMessage="Select the full model or a structure node to adjust."
          moveStep={moveStep}
          onMoveStepChange={onMoveStepChange}
          rotateStep={rotateStep}
          onRotateStepChange={onRotateStepChange}
          scaleStep={scaleStep}
          onScaleStepChange={onScaleStepChange}
          onNudgeNode={onNudgeNode}
          onRotateNode={onRotateNode}
          onSetNodeRotation={onSetNodeRotation}
          onNudgeNodeScale={onNudgeNodeScale}
          onSetNodeScale={onSetNodeScale}
          onResetNode={onResetNode}
          onHideSelectedNode={onHideSelectedNode}
          onRestoreNode={onRestoreNode}
        />
      </div>

      <div className="border-t border-border/70 pt-4">
        <StructureTree
          nodes={structureTree}
          selectedNodeId={selectedNode?.id ?? null}
          onFocusNode={onFocusStructureNode}
          onSetNodeHidden={onSetStructureNodeHidden}
        />
      </div>
    </div>
  );
}
