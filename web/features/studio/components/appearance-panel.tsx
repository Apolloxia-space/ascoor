'use client';

import { Focus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import type { SelectedNode } from './three-viewer';
import type { StructureTreeNode } from '../lib/structure-tree';
import { StructureTree } from './structure-tree';
import { StudioSidePanel } from './studio-side-panel';
import { Button } from '@shared/components/ui/button';
import { Input } from '@shared/components/ui/input';
import { Slider } from '@shared/components/ui/slider';

type AppearancePanelProps = {
  open: boolean;
  structureTree: Array<StructureTreeNode>;
  selectedNodes?: Array<SelectedNode>;
  activeSelectedNode?: SelectedNode | null;
  activeSelectedNodeId?: string | null;
  selectedNodeIds?: ReadonlySet<string>;
  variant?: 'desktop' | 'mobile';
  onToggle?: () => void;
  onFocusStructureNode?: (nodeId: string, options?: { additive?: boolean }) => void;
  onSetStructureNodeHidden?: (nodeId: string, hidden: boolean) => void;
  onSetSelectedNodeColor?: (hex: string) => void;
  onResetSelectedNodeColor?: () => void;
  onSetSelectedNodeEmissiveColor?: (hex: string) => void;
  onSetSelectedNodeEmissiveIntensity?: (value: number) => void;
  onResetSelectedNodeEmissive?: () => void;
  onSetSelectedNodeRoughness?: (value: number) => void;
  onResetSelectedNodeRoughness?: () => void;
};

const DEFAULT_COLOR = '#94a3b8';
const DEFAULT_EMISSIVE_COLOR = '#000000';
const DEFAULT_EMISSIVE_INTENSITY = 1;
const MAX_EMISSIVE_INTENSITY = 3;
const DEFAULT_ROUGHNESS = 0.8;

const normalizeHexColor = (value: string) => {
  const trimmed = value.trim();
  if (!/^#?[0-9a-f]{6}$/i.test(trimmed)) return null;
  return trimmed.startsWith('#') ? trimmed.toLowerCase() : `#${trimmed.toLowerCase()}`;
};

const clampEmissiveIntensity = (value: number) =>
  Math.min(Math.max(value, 0), MAX_EMISSIVE_INTENSITY);

const formatIntensityInput = (value: number) => {
  const rounded = Number(value.toFixed(2));
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
};

type AggregatedAppearanceState = {
  editable: boolean;
  mixed: boolean;
  hex: string | null;
};

type AggregatedAppearanceIntensityState = AggregatedAppearanceState & {
  intensity: number | null;
  intensityMixed: boolean;
};

type AggregatedAppearanceRoughnessState = {
  editable: boolean;
  mixed: boolean;
  roughness: number | null;
};

const getDistinctValues = (values: Array<string | number | null>) => {
  return Array.from(new Set(values.map((value) => String(value ?? '__null__'))));
};

const aggregateColorState = (selectedNodes: Array<SelectedNode>): AggregatedAppearanceState => {
  const editableNodes = selectedNodes.filter((node) => node.colorEditable);
  if (editableNodes.length === 0) {
    return { editable: false, mixed: false, hex: null };
  }

  const distinctHexValues = getDistinctValues(editableNodes.map((node) => node.colorHex));
  return {
    editable: true,
    mixed: editableNodes.some((node) => node.colorMixed) || distinctHexValues.length > 1,
    hex: editableNodes[0]?.colorHex ?? null,
  };
};

const aggregateEmissiveState = (
  selectedNodes: Array<SelectedNode>,
): AggregatedAppearanceIntensityState => {
  const editableNodes = selectedNodes.filter((node) => node.emissiveEditable);
  if (editableNodes.length === 0) {
    return {
      editable: false,
      mixed: false,
      hex: null,
      intensity: null,
      intensityMixed: false,
    };
  }

  const distinctHexValues = getDistinctValues(editableNodes.map((node) => node.emissiveHex));
  const distinctIntensityValues = getDistinctValues(
    editableNodes.map((node) => node.emissiveIntensity),
  );

  return {
    editable: true,
    mixed: editableNodes.some((node) => node.emissiveMixed) || distinctHexValues.length > 1,
    hex: editableNodes[0]?.emissiveHex ?? null,
    intensity: editableNodes[0]?.emissiveIntensity ?? null,
    intensityMixed:
      editableNodes.some((node) => node.emissiveIntensityMixed) ||
      distinctIntensityValues.length > 1,
  };
};

const aggregateRoughnessState = (
  selectedNodes: Array<SelectedNode>,
): AggregatedAppearanceRoughnessState => {
  const editableNodes = selectedNodes.filter((node) => node.roughnessEditable);
  if (editableNodes.length === 0) {
    return { editable: false, mixed: false, roughness: null };
  }

  const distinctRoughnessValues = getDistinctValues(editableNodes.map((node) => node.roughness));
  return {
    editable: true,
    mixed: editableNodes.some((node) => node.roughnessMixed) || distinctRoughnessValues.length > 1,
    roughness: editableNodes[0]?.roughness ?? null,
  };
};

export function AppearancePanel({
  open,
  structureTree,
  selectedNodes = [],
  activeSelectedNode = null,
  activeSelectedNodeId = null,
  selectedNodeIds = new Set<string>(),
  variant = 'desktop',
  onToggle,
  onFocusStructureNode,
  onSetStructureNodeHidden,
  onSetSelectedNodeColor,
  onResetSelectedNodeColor,
  onSetSelectedNodeEmissiveColor,
  onSetSelectedNodeEmissiveIntensity,
  onResetSelectedNodeEmissive,
  onSetSelectedNodeRoughness,
  onResetSelectedNodeRoughness,
}: AppearancePanelProps) {
  return (
    <StudioSidePanel
      open={open}
      variant={variant}
      resizeAriaLabel="Resize appearance panel"
      title="Appearance"
      description="Adjust part colors for the selected nodes."
      onToggle={onToggle}
    >
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
    </StudioSidePanel>
  );
}

type AppearancePanelContentProps = Omit<AppearancePanelProps, 'open' | 'variant' | 'onToggle'>;

export function AppearancePanelContent({
  structureTree,
  selectedNodes = [],
  activeSelectedNode = null,
  activeSelectedNodeId = null,
  selectedNodeIds = new Set<string>(),
  onFocusStructureNode,
  onSetStructureNodeHidden,
  onSetSelectedNodeColor,
  onResetSelectedNodeColor,
  onSetSelectedNodeEmissiveColor,
  onSetSelectedNodeEmissiveIntensity,
  onResetSelectedNodeEmissive,
  onSetSelectedNodeRoughness,
  onResetSelectedNodeRoughness,
}: AppearancePanelContentProps) {
  const rootNodeId = structureTree[0]?.id ?? null;
  const selectedCount = selectedNodes.length;
  const selectionLabel =
    selectedCount === 0
      ? 'No selection'
      : selectedCount === 1 && activeSelectedNode
        ? `${activeSelectedNode.name} · ${activeSelectedNode.nodeType}`
        : `${selectedCount} nodes selected`;
  const colorState = useMemo(() => aggregateColorState(selectedNodes), [selectedNodes]);
  const emissiveState = useMemo(() => aggregateEmissiveState(selectedNodes), [selectedNodes]);
  const roughnessState = useMemo(() => aggregateRoughnessState(selectedNodes), [selectedNodes]);
  const [colorDraft, setColorDraft] = useState(DEFAULT_COLOR);
  const [hexInputValue, setHexInputValue] = useState(DEFAULT_COLOR);
  const [emissiveColorDraft, setEmissiveColorDraft] = useState(DEFAULT_EMISSIVE_COLOR);
  const [emissiveHexInputValue, setEmissiveHexInputValue] = useState(DEFAULT_EMISSIVE_COLOR);
  const [emissiveIntensityDraft, setEmissiveIntensityDraft] = useState(DEFAULT_EMISSIVE_INTENSITY);
  const [emissiveIntensityInputValue, setEmissiveIntensityInputValue] = useState(
    formatIntensityInput(DEFAULT_EMISSIVE_INTENSITY),
  );
  const [roughnessDraft, setRoughnessDraft] = useState(DEFAULT_ROUGHNESS);
  const [roughnessInputValue, setRoughnessInputValue] = useState(
    formatIntensityInput(DEFAULT_ROUGHNESS),
  );

  useEffect(() => {
    const nextColor = activeSelectedNode?.colorHex ?? colorState.hex ?? DEFAULT_COLOR;
    setColorDraft(nextColor);
    setHexInputValue(colorState.mixed ? '' : nextColor);
  }, [activeSelectedNode?.colorHex, activeSelectedNode?.id, colorState.hex, colorState.mixed]);

  useEffect(() => {
    const nextEmissiveColor =
      activeSelectedNode?.emissiveHex ?? emissiveState.hex ?? DEFAULT_EMISSIVE_COLOR;
    const nextEmissiveIntensity = clampEmissiveIntensity(
      activeSelectedNode?.emissiveIntensity ??
        emissiveState.intensity ??
        DEFAULT_EMISSIVE_INTENSITY,
    );
    setEmissiveColorDraft(nextEmissiveColor);
    setEmissiveHexInputValue(emissiveState.mixed ? '' : nextEmissiveColor);
    setEmissiveIntensityDraft(nextEmissiveIntensity);
    setEmissiveIntensityInputValue(
      emissiveState.intensityMixed ? '' : formatIntensityInput(nextEmissiveIntensity),
    );
  }, [
    activeSelectedNode?.emissiveHex,
    activeSelectedNode?.emissiveIntensity,
    activeSelectedNode?.id,
    emissiveState.hex,
    emissiveState.intensity,
    emissiveState.intensityMixed,
    emissiveState.mixed,
  ]);

  useEffect(() => {
    const nextRoughness = Math.min(
      Math.max(activeSelectedNode?.roughness ?? roughnessState.roughness ?? DEFAULT_ROUGHNESS, 0),
      1,
    );
    setRoughnessDraft(nextRoughness);
    setRoughnessInputValue(roughnessState.mixed ? '' : formatIntensityInput(nextRoughness));
  }, [
    activeSelectedNode?.id,
    activeSelectedNode?.roughness,
    roughnessState.mixed,
    roughnessState.roughness,
  ]);

  const canEditColor = colorState.editable;
  const canEditEmissive = emissiveState.editable;
  const canEditRoughness = roughnessState.editable;

  const applyDraftColor = () => {
    if (!canEditColor) return;
    const rawValue = hexInputValue.trim();
    if (!rawValue) {
      const fallback = activeSelectedNode?.colorHex ?? colorState.hex ?? DEFAULT_COLOR;
      setColorDraft(fallback);
      setHexInputValue(colorState.mixed ? '' : fallback);
      return;
    }
    const normalized = normalizeHexColor(rawValue);
    if (!normalized) {
      const fallback = activeSelectedNode?.colorHex ?? colorState.hex ?? DEFAULT_COLOR;
      setColorDraft(fallback);
      setHexInputValue(colorState.mixed ? '' : fallback);
      return;
    }
    setColorDraft(normalized);
    setHexInputValue(normalized);
    onSetSelectedNodeColor?.(normalized);
  };

  const applyDraftEmissiveColor = () => {
    if (!canEditEmissive) return;
    const rawValue = emissiveHexInputValue.trim();
    if (!rawValue) {
      const fallback =
        activeSelectedNode?.emissiveHex ?? emissiveState.hex ?? DEFAULT_EMISSIVE_COLOR;
      setEmissiveColorDraft(fallback);
      setEmissiveHexInputValue(emissiveState.mixed ? '' : fallback);
      return;
    }
    const normalized = normalizeHexColor(rawValue);
    if (!normalized) {
      const fallback =
        activeSelectedNode?.emissiveHex ?? emissiveState.hex ?? DEFAULT_EMISSIVE_COLOR;
      setEmissiveColorDraft(fallback);
      setEmissiveHexInputValue(emissiveState.mixed ? '' : fallback);
      return;
    }
    setEmissiveColorDraft(normalized);
    setEmissiveHexInputValue(normalized);
    onSetSelectedNodeEmissiveColor?.(normalized);
  };

  const applyDraftEmissiveIntensity = () => {
    if (!canEditEmissive) return;
    const rawValue = emissiveIntensityInputValue.trim();
    if (!rawValue) {
      const fallback = clampEmissiveIntensity(
        activeSelectedNode?.emissiveIntensity ??
          emissiveState.intensity ??
          DEFAULT_EMISSIVE_INTENSITY,
      );
      setEmissiveIntensityDraft(fallback);
      setEmissiveIntensityInputValue(
        emissiveState.intensityMixed ? '' : formatIntensityInput(fallback),
      );
      return;
    }
    const parsed = Number(rawValue);
    if (!Number.isFinite(parsed)) {
      const fallback = clampEmissiveIntensity(
        activeSelectedNode?.emissiveIntensity ??
          emissiveState.intensity ??
          DEFAULT_EMISSIVE_INTENSITY,
      );
      setEmissiveIntensityDraft(fallback);
      setEmissiveIntensityInputValue(
        emissiveState.intensityMixed ? '' : formatIntensityInput(fallback),
      );
      return;
    }
    const normalized = clampEmissiveIntensity(parsed);
    setEmissiveIntensityDraft(normalized);
    setEmissiveIntensityInputValue(formatIntensityInput(normalized));
    onSetSelectedNodeEmissiveIntensity?.(normalized);
  };

  const applyDraftRoughness = () => {
    if (!canEditRoughness) return;
    const rawValue = roughnessInputValue.trim();
    if (!rawValue) {
      const fallback = Math.min(
        Math.max(activeSelectedNode?.roughness ?? roughnessState.roughness ?? DEFAULT_ROUGHNESS, 0),
        1,
      );
      setRoughnessDraft(fallback);
      setRoughnessInputValue(roughnessState.mixed ? '' : formatIntensityInput(fallback));
      return;
    }
    const parsed = Number(rawValue);
    if (!Number.isFinite(parsed)) {
      const fallback = Math.min(
        Math.max(activeSelectedNode?.roughness ?? roughnessState.roughness ?? DEFAULT_ROUGHNESS, 0),
        1,
      );
      setRoughnessDraft(fallback);
      setRoughnessInputValue(roughnessState.mixed ? '' : formatIntensityInput(fallback));
      return;
    }
    const normalized = Math.min(Math.max(parsed, 0), 1);
    setRoughnessDraft(normalized);
    setRoughnessInputValue(formatIntensityInput(normalized));
    onSetSelectedNodeRoughness?.(normalized);
  };

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
            <Focus className="size-4" />
            Focus Full Model
          </Button>
        </div>
      </section>

      <div className="border-t border-border/70 pt-4">
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Color
            </p>
            <p className="text-xs text-muted-foreground">{selectionLabel}</p>
          </div>
          {!activeSelectedNode ? (
            <p className="text-sm text-muted-foreground">
              Select one or more structure nodes to adjust colors.
            </p>
          ) : !canEditColor ? (
            <p className="text-sm text-muted-foreground">
              None of the selected nodes contain color-editable materials.
            </p>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <label
                  className="flex h-10 w-14 shrink-0 cursor-pointer items-center justify-center rounded-md border border-border bg-background/70"
                  aria-label="Choose color"
                >
                  <input
                    type="color"
                    value={colorDraft}
                    className="h-8 w-10 cursor-pointer appearance-none border-0 bg-transparent p-0"
                    onChange={(event) => {
                      const next = event.target.value.toLowerCase();
                      setColorDraft(next);
                      onSetSelectedNodeColor?.(next);
                    }}
                  />
                </label>
                <div className="min-w-0 flex-1 space-y-2">
                  <Input
                    value={hexInputValue}
                    inputMode="text"
                    className="h-10 bg-background/70 font-mono text-sm"
                    placeholder={colorState.mixed ? 'Mixed' : undefined}
                    onChange={(event) => {
                      setHexInputValue(event.target.value);
                    }}
                    onBlur={applyDraftColor}
                    onKeyDown={(event) => {
                      if (event.key !== 'Enter') return;
                      event.preventDefault();
                      event.currentTarget.blur();
                    }}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    const fallback = activeSelectedNode.colorHex ?? colorState.hex ?? DEFAULT_COLOR;
                    setColorDraft(fallback);
                    setHexInputValue(colorState.mixed ? '' : fallback);
                    onResetSelectedNodeColor?.();
                  }}
                >
                  Reset color
                </Button>
              </div>
            </div>
          )}
        </section>
      </div>

      {activeSelectedNode ? (
        <div className="border-t border-border/70 pt-4">
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Emission
              </p>
            </div>
            {!canEditEmissive ? (
              <p className="text-sm text-muted-foreground">
                None of the selected nodes contain emissive materials.
              </p>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <label
                    className="flex h-10 w-14 shrink-0 cursor-pointer items-center justify-center rounded-md border border-border bg-background/70"
                    aria-label="Choose emissive color"
                  >
                    <input
                      type="color"
                      value={emissiveColorDraft}
                      className="h-8 w-10 cursor-pointer appearance-none border-0 bg-transparent p-0"
                      onChange={(event) => {
                        const next = event.target.value.toLowerCase();
                        setEmissiveColorDraft(next);
                        setEmissiveHexInputValue(next);
                        onSetSelectedNodeEmissiveColor?.(next);
                      }}
                    />
                  </label>
                  <div className="min-w-0 flex-1 space-y-2">
                    <Input
                      value={emissiveHexInputValue}
                      inputMode="text"
                      className="h-10 bg-background/70 font-mono text-sm"
                      placeholder={emissiveState.mixed ? 'Mixed' : undefined}
                      onChange={(event) => {
                        setEmissiveHexInputValue(event.target.value);
                      }}
                      onBlur={applyDraftEmissiveColor}
                      onKeyDown={(event) => {
                        if (event.key !== 'Enter') return;
                        event.preventDefault();
                        event.currentTarget.blur();
                      }}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Slider
                    value={[emissiveIntensityDraft]}
                    min={0}
                    max={MAX_EMISSIVE_INTENSITY}
                    step={0.05}
                    onValueChange={(values) => {
                      const next = clampEmissiveIntensity(values[0] ?? 0);
                      setEmissiveIntensityDraft(next);
                      setEmissiveIntensityInputValue(formatIntensityInput(next));
                      onSetSelectedNodeEmissiveIntensity?.(next);
                    }}
                  />
                  <Input
                    value={emissiveIntensityInputValue}
                    inputMode="decimal"
                    className="h-10 w-24 shrink-0 bg-background/70 font-mono text-sm"
                    placeholder={emissiveState.intensityMixed ? 'Mixed' : undefined}
                    onChange={(event) => {
                      setEmissiveIntensityInputValue(event.target.value);
                    }}
                    onBlur={applyDraftEmissiveIntensity}
                    onKeyDown={(event) => {
                      if (event.key !== 'Enter') return;
                      event.preventDefault();
                      event.currentTarget.blur();
                    }}
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      const fallbackColor =
                        activeSelectedNode.emissiveHex ??
                        emissiveState.hex ??
                        DEFAULT_EMISSIVE_COLOR;
                      const fallbackIntensity = clampEmissiveIntensity(
                        activeSelectedNode.emissiveIntensity ??
                          emissiveState.intensity ??
                          DEFAULT_EMISSIVE_INTENSITY,
                      );
                      setEmissiveColorDraft(fallbackColor);
                      setEmissiveHexInputValue(emissiveState.mixed ? '' : fallbackColor);
                      setEmissiveIntensityDraft(fallbackIntensity);
                      setEmissiveIntensityInputValue(
                        emissiveState.intensityMixed ? '' : formatIntensityInput(fallbackIntensity),
                      );
                      onResetSelectedNodeEmissive?.();
                    }}
                  >
                    Reset emission
                  </Button>
                </div>
              </div>
            )}
          </section>
        </div>
      ) : null}

      {activeSelectedNode ? (
        <div className="border-t border-border/70 pt-4">
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Roughness
              </p>
            </div>
            {!canEditRoughness ? (
              <p className="text-sm text-muted-foreground">
                None of the selected nodes contain roughness-editable materials.
              </p>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Slider
                    value={[roughnessDraft]}
                    min={0}
                    max={1}
                    step={0.01}
                    onValueChange={(values) => {
                      const next = Math.min(Math.max(values[0] ?? 0, 0), 1);
                      setRoughnessDraft(next);
                      setRoughnessInputValue(formatIntensityInput(next));
                      onSetSelectedNodeRoughness?.(next);
                    }}
                  />
                  <Input
                    value={roughnessInputValue}
                    inputMode="decimal"
                    className="h-10 w-24 shrink-0 bg-background/70 font-mono text-sm"
                    placeholder={roughnessState.mixed ? 'Mixed' : undefined}
                    onChange={(event) => {
                      setRoughnessInputValue(event.target.value);
                    }}
                    onBlur={applyDraftRoughness}
                    onKeyDown={(event) => {
                      if (event.key !== 'Enter') return;
                      event.preventDefault();
                      event.currentTarget.blur();
                    }}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      const fallback = Math.min(
                        Math.max(
                          activeSelectedNode.roughness ??
                            roughnessState.roughness ??
                            DEFAULT_ROUGHNESS,
                          0,
                        ),
                        1,
                      );
                      setRoughnessDraft(fallback);
                      setRoughnessInputValue(
                        roughnessState.mixed ? '' : formatIntensityInput(fallback),
                      );
                      onResetSelectedNodeRoughness?.();
                    }}
                  >
                    Reset roughness
                  </Button>
                </div>
              </div>
            )}
          </section>
        </div>
      ) : null}

      <div className="border-t border-border/70 pt-4">
        <StructureTree
          nodes={structureTree}
          selectedNodeIds={selectedNodeIds}
          activeNodeId={activeSelectedNodeId}
          onFocusNode={onFocusStructureNode}
          onSetNodeHidden={onSetStructureNodeHidden}
        />
      </div>
    </div>
  );
}
