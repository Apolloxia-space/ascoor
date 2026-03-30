'use client';

import { Focus } from 'lucide-react';
import { useEffect, useState } from 'react';

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
  selectedNode?: SelectedNode | null;
  variant?: 'desktop' | 'mobile';
  onToggle?: () => void;
  onFocusStructureNode?: (nodeId: string) => void;
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

export function AppearancePanel({
  open,
  structureTree,
  selectedNode = null,
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
      description="Adjust part colors for the selected structure node."
      onToggle={onToggle}
    >
      <AppearancePanelContent
        structureTree={structureTree}
        selectedNode={selectedNode}
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
  selectedNode = null,
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
    setColorDraft(selectedNode?.colorHex ?? DEFAULT_COLOR);
    setHexInputValue(selectedNode?.colorMixed ? '' : (selectedNode?.colorHex ?? DEFAULT_COLOR));
  }, [selectedNode?.colorHex, selectedNode?.colorMixed, selectedNode?.id]);

  useEffect(() => {
    const nextEmissiveColor = selectedNode?.emissiveHex ?? DEFAULT_EMISSIVE_COLOR;
    const nextEmissiveIntensity = clampEmissiveIntensity(
      selectedNode?.emissiveIntensity ?? DEFAULT_EMISSIVE_INTENSITY,
    );
    setEmissiveColorDraft(nextEmissiveColor);
    setEmissiveHexInputValue(selectedNode?.emissiveMixed ? '' : nextEmissiveColor);
    setEmissiveIntensityDraft(nextEmissiveIntensity);
    setEmissiveIntensityInputValue(
      selectedNode?.emissiveIntensityMixed ? '' : formatIntensityInput(nextEmissiveIntensity),
    );
  }, [
    selectedNode?.emissiveHex,
    selectedNode?.emissiveIntensity,
    selectedNode?.emissiveIntensityMixed,
    selectedNode?.emissiveMixed,
    selectedNode?.id,
  ]);

  useEffect(() => {
    const nextRoughness = Math.min(Math.max(selectedNode?.roughness ?? DEFAULT_ROUGHNESS, 0), 1);
    setRoughnessDraft(nextRoughness);
    setRoughnessInputValue(
      selectedNode?.roughnessMixed ? '' : formatIntensityInput(nextRoughness),
    );
  }, [selectedNode?.id, selectedNode?.roughness, selectedNode?.roughnessMixed]);

  const canEditColor = Boolean(selectedNode?.colorEditable);
  const canEditEmissive = Boolean(selectedNode?.emissiveEditable);
  const canEditRoughness = Boolean(selectedNode?.roughnessEditable);

  const applyDraftColor = () => {
    if (!canEditColor) return;
    const rawValue = hexInputValue.trim();
    if (!rawValue) {
      const fallback = selectedNode?.colorHex ?? DEFAULT_COLOR;
      setColorDraft(fallback);
      setHexInputValue(selectedNode?.colorMixed ? '' : fallback);
      return;
    }
    const normalized = normalizeHexColor(rawValue);
    if (!normalized) {
      const fallback = selectedNode?.colorHex ?? DEFAULT_COLOR;
      setColorDraft(fallback);
      setHexInputValue(selectedNode?.colorMixed ? '' : fallback);
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
      const fallback = selectedNode?.emissiveHex ?? DEFAULT_EMISSIVE_COLOR;
      setEmissiveColorDraft(fallback);
      setEmissiveHexInputValue(selectedNode?.emissiveMixed ? '' : fallback);
      return;
    }
    const normalized = normalizeHexColor(rawValue);
    if (!normalized) {
      const fallback = selectedNode?.emissiveHex ?? DEFAULT_EMISSIVE_COLOR;
      setEmissiveColorDraft(fallback);
      setEmissiveHexInputValue(selectedNode?.emissiveMixed ? '' : fallback);
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
        selectedNode?.emissiveIntensity ?? DEFAULT_EMISSIVE_INTENSITY,
      );
      setEmissiveIntensityDraft(fallback);
      setEmissiveIntensityInputValue(
        selectedNode?.emissiveIntensityMixed ? '' : formatIntensityInput(fallback),
      );
      return;
    }
    const parsed = Number(rawValue);
    if (!Number.isFinite(parsed)) {
      const fallback = clampEmissiveIntensity(
        selectedNode?.emissiveIntensity ?? DEFAULT_EMISSIVE_INTENSITY,
      );
      setEmissiveIntensityDraft(fallback);
      setEmissiveIntensityInputValue(
        selectedNode?.emissiveIntensityMixed ? '' : formatIntensityInput(fallback),
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
      const fallback = Math.min(Math.max(selectedNode?.roughness ?? DEFAULT_ROUGHNESS, 0), 1);
      setRoughnessDraft(fallback);
      setRoughnessInputValue(selectedNode?.roughnessMixed ? '' : formatIntensityInput(fallback));
      return;
    }
    const parsed = Number(rawValue);
    if (!Number.isFinite(parsed)) {
      const fallback = Math.min(Math.max(selectedNode?.roughness ?? DEFAULT_ROUGHNESS, 0), 1);
      setRoughnessDraft(fallback);
      setRoughnessInputValue(selectedNode?.roughnessMixed ? '' : formatIntensityInput(fallback));
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
            <p className="text-xs text-muted-foreground">
              {selectedNode ? `${selectedNode.name} · ${selectedNode.nodeType}` : 'No selection'}
            </p>
          </div>
          {!selectedNode ? (
            <p className="text-sm text-muted-foreground">
              Select the full model or a structure node to adjust colors.
            </p>
          ) : !canEditColor ? (
            <p className="text-sm text-muted-foreground">
              The selected node does not contain any color-editable materials.
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
                    placeholder={selectedNode.colorMixed ? 'Mixed' : undefined}
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
                    const fallback = selectedNode.colorHex ?? DEFAULT_COLOR;
                    setColorDraft(fallback);
                    setHexInputValue(selectedNode.colorMixed ? '' : fallback);
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

      {selectedNode ? (
        <div className="border-t border-border/70 pt-4">
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Emission
              </p>
            </div>
            {!canEditEmissive ? (
              <p className="text-sm text-muted-foreground">
                The selected node does not contain emissive materials.
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
                      placeholder={selectedNode.emissiveMixed ? 'Mixed' : undefined}
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
                    placeholder={selectedNode.emissiveIntensityMixed ? 'Mixed' : undefined}
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
                      const fallbackColor = selectedNode.emissiveHex ?? DEFAULT_EMISSIVE_COLOR;
                      const fallbackIntensity = clampEmissiveIntensity(
                        selectedNode.emissiveIntensity ?? DEFAULT_EMISSIVE_INTENSITY,
                      );
                      setEmissiveColorDraft(fallbackColor);
                      setEmissiveHexInputValue(
                        selectedNode.emissiveMixed ? '' : fallbackColor,
                      );
                      setEmissiveIntensityDraft(fallbackIntensity);
                      setEmissiveIntensityInputValue(
                        selectedNode.emissiveIntensityMixed
                          ? ''
                          : formatIntensityInput(fallbackIntensity),
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

      {selectedNode ? (
        <div className="border-t border-border/70 pt-4">
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Roughness
              </p>
            </div>
            {!canEditRoughness ? (
              <p className="text-sm text-muted-foreground">
                The selected node does not contain roughness-editable materials.
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
                    placeholder={selectedNode.roughnessMixed ? 'Mixed' : undefined}
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
                        Math.max(selectedNode.roughness ?? DEFAULT_ROUGHNESS, 0),
                        1,
                      );
                      setRoughnessDraft(fallback);
                      setRoughnessInputValue(
                        selectedNode.roughnessMixed ? '' : formatIntensityInput(fallback),
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
          selectedNodeId={selectedNode?.id ?? null}
          onFocusNode={onFocusStructureNode}
          onSetNodeHidden={onSetStructureNodeHidden}
        />
      </div>
    </div>
  );
}
