'use client';

import { useEffect, useState } from 'react';

import type { ResetTransformTarget, SelectedNode, TransformAxis } from './three-viewer';
import { Button } from '@shared/components/ui/button';
import { Input } from '@shared/components/ui/input';

export const MOVE_STEP_OPTIONS = [0.01, 0.2, 0.5] as const;
export const ROTATE_STEP_OPTIONS = [5, 15, 45] as const;
export const SCALE_STEP_OPTIONS = [0.01, 0.1, 0.25] as const;

type TransformControlsProps = {
  selectedNodes?: Array<SelectedNode>;
  activeSelectedNode?: SelectedNode | null;
  emptyMessage: string;
  moveStep: number;
  onMoveStepChange?: (step: number) => void;
  rotateStep: number;
  onRotateStepChange?: (step: number) => void;
  scaleStep: number;
  onScaleStepChange?: (step: number) => void;
  onNudgeNode?: (axis: TransformAxis, delta: number) => void;
  onRotateNode?: (axis: TransformAxis, deltaRadians: number) => void;
  onSetNodeRotation?: (axis: TransformAxis, radians: number) => void;
  onNudgeNodeScale?: (axis: TransformAxis, delta: number) => void;
  onSetNodeScale?: (axis: TransformAxis, value: number) => void;
  onResetNode?: (target: ResetTransformTarget) => void;
  onHideSelectedNode?: () => void;
  onRestoreNode?: (nodeId: string) => void;
};

export function TransformControls({
  selectedNodes = [],
  activeSelectedNode = null,
  emptyMessage,
  moveStep,
  onMoveStepChange,
  rotateStep,
  onRotateStepChange,
  scaleStep,
  onScaleStepChange,
  onNudgeNode,
  onRotateNode,
  onSetNodeRotation,
  onNudgeNodeScale,
  onSetNodeScale,
  onResetNode,
  onHideSelectedNode,
  onRestoreNode,
}: TransformControlsProps) {
  const [positionDraft, setPositionDraft] = useState<Record<TransformAxis, string>>({
    x: '0.00',
    y: '0.00',
    z: '0.00',
  });
  const [rotationDraft, setRotationDraft] = useState<Record<TransformAxis, string>>({
    x: '0.0',
    y: '0.0',
    z: '0.0',
  });
  const [scaleDraft, setScaleDraft] = useState<Record<TransformAxis, string>>({
    x: '1.00',
    y: '1.00',
    z: '1.00',
  });
  const selectionCount = selectedNodes.length;
  const allSelectedHidden = selectionCount > 0 && selectedNodes.every((node) => node.hidden);
  const selectionLabel =
    selectionCount === 0
      ? 'No selection'
      : selectionCount === 1 && activeSelectedNode
        ? `${activeSelectedNode.name} · ${activeSelectedNode.nodeType}`
        : `${selectionCount} nodes selected`;

  const formatCoordinate = (value: number) => value.toFixed(2);
  const formatDegreesValue = (value: number) => ((value * 180) / Math.PI).toFixed(1);
  const formatScaleValue = (value: number) => value.toFixed(2);

  useEffect(() => {
    if (!activeSelectedNode) {
      setPositionDraft({ x: '0.00', y: '0.00', z: '0.00' });
      setRotationDraft({ x: '0.0', y: '0.0', z: '0.0' });
      setScaleDraft({ x: '1.00', y: '1.00', z: '1.00' });
      return;
    }
    setPositionDraft({
      x: formatCoordinate(activeSelectedNode.position.x),
      y: formatCoordinate(activeSelectedNode.position.y),
      z: formatCoordinate(activeSelectedNode.position.z),
    });
    setRotationDraft({
      x: formatDegreesValue(activeSelectedNode.rotation.x),
      y: formatDegreesValue(activeSelectedNode.rotation.y),
      z: formatDegreesValue(activeSelectedNode.rotation.z),
    });
    setScaleDraft({
      x: formatScaleValue(activeSelectedNode.scale.x),
      y: formatScaleValue(activeSelectedNode.scale.y),
      z: formatScaleValue(activeSelectedNode.scale.z),
    });
  }, [
    activeSelectedNode?.id,
    activeSelectedNode?.position.x,
    activeSelectedNode?.position.y,
    activeSelectedNode?.position.z,
    activeSelectedNode?.rotation.x,
    activeSelectedNode?.rotation.y,
    activeSelectedNode?.rotation.z,
    activeSelectedNode?.scale.x,
    activeSelectedNode?.scale.y,
    activeSelectedNode?.scale.z,
  ]);

  const commitPositionInput = (axis: TransformAxis) => {
    if (!activeSelectedNode) return;
    const nextValue = Number(positionDraft[axis]);
    if (!Number.isFinite(nextValue)) {
      setPositionDraft((current) => ({
        ...current,
        [axis]: formatCoordinate(activeSelectedNode.position[axis]),
      }));
      return;
    }
    const delta = nextValue - activeSelectedNode.position[axis];
    if (Math.abs(delta) > Number.EPSILON) {
      onNudgeNode?.(axis, delta);
      return;
    }
    setPositionDraft((current) => ({
      ...current,
      [axis]: formatCoordinate(activeSelectedNode.position[axis]),
    }));
  };

  const commitRotationInput = (axis: TransformAxis) => {
    if (!activeSelectedNode) return;
    const nextDegrees = Number(rotationDraft[axis]);
    if (!Number.isFinite(nextDegrees)) {
      setRotationDraft((current) => ({
        ...current,
        [axis]: formatDegreesValue(activeSelectedNode.rotation[axis]),
      }));
      return;
    }
    const nextRadians = (nextDegrees * Math.PI) / 180;
    if (Math.abs(nextRadians - activeSelectedNode.rotation[axis]) > Number.EPSILON) {
      onSetNodeRotation?.(axis, nextRadians);
      return;
    }
    setRotationDraft((current) => ({
      ...current,
      [axis]: formatDegreesValue(activeSelectedNode.rotation[axis]),
    }));
  };

  const commitScaleInput = (axis: TransformAxis) => {
    if (!activeSelectedNode) return;
    const nextValue = Number(scaleDraft[axis]);
    if (!Number.isFinite(nextValue) || nextValue <= 0) {
      setScaleDraft((current) => ({
        ...current,
        [axis]: formatScaleValue(activeSelectedNode.scale[axis]),
      }));
      return;
    }
    if (Math.abs(nextValue - activeSelectedNode.scale[axis]) > Number.EPSILON) {
      onSetNodeScale?.(axis, nextValue);
      return;
    }
    setScaleDraft((current) => ({
      ...current,
      [axis]: formatScaleValue(activeSelectedNode.scale[axis]),
    }));
  };

  const handleTransformInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    event.currentTarget.blur();
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Transform
        </p>
        <p className="text-xs text-muted-foreground">{selectionLabel}</p>
      </div>
      {!activeSelectedNode ? (
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      ) : (
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-foreground">Move</p>
              <div className="flex gap-1">
                {MOVE_STEP_OPTIONS.map((step) => (
                  <Button
                    key={step}
                    type="button"
                    size="sm"
                    variant={moveStep === step ? 'default' : 'outline'}
                    className="h-7 px-2 text-xs"
                    onClick={() => onMoveStepChange?.(step)}
                  >
                    {step}
                  </Button>
                ))}
              </div>
            </div>
            {(['x', 'y', 'z'] as Array<TransformAxis>).map((axis) => (
              <div key={`move-${axis}`} className="flex items-center gap-2">
                <span className="w-5 text-xs font-semibold uppercase text-muted-foreground">
                  {axis}
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 w-8 px-0"
                  onClick={() => onNudgeNode?.(axis, -moveStep)}
                >
                  -
                </Button>
                <Input
                  value={positionDraft[axis]}
                  inputMode="decimal"
                  className="h-8 flex-1 bg-background/70 text-sm"
                  onChange={(event) =>
                    setPositionDraft((current) => ({
                      ...current,
                      [axis]: event.target.value,
                    }))
                  }
                  onBlur={() => commitPositionInput(axis)}
                  onKeyDown={handleTransformInputKeyDown}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 w-8 px-0"
                  onClick={() => onNudgeNode?.(axis, moveStep)}
                >
                  +
                </Button>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-foreground">Rotate</p>
              <div className="flex gap-1">
                {ROTATE_STEP_OPTIONS.map((step) => (
                  <Button
                    key={step}
                    type="button"
                    size="sm"
                    variant={rotateStep === step ? 'default' : 'outline'}
                    className="h-7 px-2 text-xs"
                    onClick={() => onRotateStepChange?.(step)}
                  >
                    {step}deg
                  </Button>
                ))}
              </div>
            </div>
            {(['x', 'y', 'z'] as Array<TransformAxis>).map((axis) => (
              <div key={`rotate-${axis}`} className="flex items-center gap-2">
                <span className="w-5 text-xs font-semibold uppercase text-muted-foreground">
                  {axis}
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 w-8 px-0"
                  onClick={() => onRotateNode?.(axis, (-rotateStep * Math.PI) / 180)}
                >
                  -
                </Button>
                <Input
                  value={rotationDraft[axis]}
                  inputMode="decimal"
                  className="h-8 flex-1 bg-background/70 text-sm"
                  onChange={(event) =>
                    setRotationDraft((current) => ({
                      ...current,
                      [axis]: event.target.value,
                    }))
                  }
                  onBlur={() => commitRotationInput(axis)}
                  onKeyDown={handleTransformInputKeyDown}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 w-8 px-0"
                  onClick={() => onRotateNode?.(axis, (rotateStep * Math.PI) / 180)}
                >
                  +
                </Button>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-foreground">Scale</p>
              <div className="flex gap-1">
                {SCALE_STEP_OPTIONS.map((step) => (
                  <Button
                    key={step}
                    type="button"
                    size="sm"
                    variant={scaleStep === step ? 'default' : 'outline'}
                    className="h-7 px-2 text-xs"
                    onClick={() => onScaleStepChange?.(step)}
                  >
                    {step}
                  </Button>
                ))}
              </div>
            </div>
            {(['x', 'y', 'z'] as Array<TransformAxis>).map((axis) => (
              <div key={`scale-${axis}`} className="flex items-center gap-2">
                <span className="w-5 text-xs font-semibold uppercase text-muted-foreground">
                  {axis}
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 w-8 px-0"
                  onClick={() => onNudgeNodeScale?.(axis, -scaleStep)}
                >
                  -
                </Button>
                <Input
                  value={scaleDraft[axis]}
                  inputMode="decimal"
                  className="h-8 flex-1 bg-background/70 text-sm"
                  onChange={(event) =>
                    setScaleDraft((current) => ({
                      ...current,
                      [axis]: event.target.value,
                    }))
                  }
                  onBlur={() => commitScaleInput(axis)}
                  onKeyDown={handleTransformInputKeyDown}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 w-8 px-0"
                  onClick={() => onNudgeNodeScale?.(axis, scaleStep)}
                >
                  +
                </Button>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onResetNode?.('position')}
            >
              Reset Pos
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onResetNode?.('rotation')}
            >
              Reset Rot
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onResetNode?.('scale')}
            >
              Reset Scale
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => onResetNode?.('all')}>
              Reset All
            </Button>
          </div>

          {allSelectedHidden ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                selectedNodes.forEach((node) => {
                  onRestoreNode?.(node.id);
                });
              }}
            >
              {selectionCount > 1
                ? 'Show Nodes'
                : activeSelectedNode.selectionKind === 'structure-node'
                  ? 'Show Node'
                  : 'Restore Part'}
            </Button>
          ) : (
            <Button type="button" size="sm" variant="destructive" onClick={onHideSelectedNode}>
              {selectionCount > 1
                ? 'Hide Nodes'
                : activeSelectedNode.selectionKind === 'structure-node'
                  ? 'Hide Node'
                  : 'Hide Part'}
            </Button>
          )}
        </div>
      )}
    </section>
  );
}
