'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ChevronDown, Download, FileText, Keyboard, Loader2, RotateCcw, Save } from 'lucide-react';

import { viewModes } from '@/mock/studio';
import { IconButton } from './icon-button';
import {
  type NodeSelection,
  ThreeViewer,
  type ResetTransformTarget,
  type ThreeViewerHandle,
  type TransformAxis,
} from './three-viewer';
import type { StructureTreeNode } from '../lib/structure-tree';
import type { RightPanelMode, ViewMode } from '../types';
import { Button } from '@shared/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@shared/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@shared/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@shared/components/ui/popover';
import { Kbd, KbdGroup } from '@shared/components/ui/kbd';
import { cn } from '@shared/lib/utils';
import { buildTraceId } from '@shared/api/fetcher';
import type { ApiError } from '@shared/api/fetcher';
import {
  getDesignAssetContent,
  getGetBillingStatusQueryKey,
  getEditedModel,
  getListProjectDesignsQueryKey,
  reportDesignPreviewResult,
} from '@shared/api/generated/client';
import { getFreshAuthToken } from '@/features/auth/token-store';
import { useDesignDetail } from '../hooks/use-design-detail';
import { DESIGN_FAILED_MESSAGE, DESIGN_FAILED_TITLE } from '../messages';
import { toast } from 'sonner';

type ViewerPanelProps = {
  currentView: ViewMode;
  viewModeOpen: boolean;
  onChangeView: (mode: ViewMode) => void;
  onViewModeOpenChange: (open: boolean) => void;
  interactionMode?: RightPanelMode;
  onStructureTreeChange?: (tree: Array<StructureTreeNode>) => void;
  onAssemblyControlsReady?: (controls: {
    focusStructureNode: (id: string, options?: { additive?: boolean }) => void;
    focusFullModel: () => void;
    clearSelection: () => void;
    setStructureNodeHidden: (id: string, hidden: boolean) => void;
    nudgeNode: (axis: TransformAxis, delta: number) => void;
    rotateNode: (axis: TransformAxis, deltaRadians: number) => void;
    setNodeRotation: (axis: TransformAxis, radians: number) => void;
    nudgeNodeScale: (axis: TransformAxis, delta: number) => void;
    setNodeScale: (axis: TransformAxis, value: number) => void;
    resetNode: (target: ResetTransformTarget) => void;
    hideSelectedNode: () => void;
    restoreNode: (id: string) => void;
    setSelectedNodeColor: (hex: string) => void;
    resetSelectedNodeColor: () => void;
    setSelectedNodeEmissiveColor: (hex: string) => void;
    setSelectedNodeEmissiveIntensity: (value: number) => void;
    resetSelectedNodeEmissive: () => void;
    setSelectedNodeRoughness: (value: number) => void;
    resetSelectedNodeRoughness: () => void;
    saveEditedModel: () => Promise<void>;
    revertEditedModel: () => Promise<void>;
  }) => void;
  onSelectionChange?: (selection: NodeSelection) => void;
  designId?: string | null;
  designName?: string | null;
  traceId?: string | null;
  activeTransformAxis?: TransformAxis;
  moveStep?: number;
  rotateStep?: number;
  shortcutHelpOpen?: boolean;
  onShortcutHelpOpenChange?: (open: boolean) => void;
  shortcutHudMessage?: string | null;
};

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? '').replace(/\/$/, '');

const resolveAssetContentUrl = (designId: string | null | undefined, type: 'ts') => {
  if (!designId || !API_BASE_URL) return null;
  return `${API_BASE_URL}/designs/${designId}/assets/content?type=${type}`;
};

const resolveEditedModelUrl = (designId: string | null | undefined) => {
  if (!designId || !API_BASE_URL) return null;
  return `${API_BASE_URL}/designs/${designId}/edited-model`;
};

export function ViewerPanel({
  currentView,
  viewModeOpen,
  onChangeView,
  onViewModeOpenChange,
  interactionMode = 'create',
  onStructureTreeChange,
  onAssemblyControlsReady,
  onSelectionChange,
  designId,
  designName,
  traceId,
  activeTransformAxis = 'x',
  moveStep = 0.05,
  rotateStep = 15,
  shortcutHelpOpen = false,
  onShortcutHelpOpenChange,
  shortcutHudMessage = null,
}: ViewerPanelProps) {
  const queryClient = useQueryClient();
  const [modelData, setModelData] = useState<ArrayBuffer | null>(null);
  const [modelCode, setModelCode] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExportingGlb, setIsExportingGlb] = useState(false);
  const [isExportingStl, setIsExportingStl] = useState(false);
  const [isExportingTs, setIsExportingTs] = useState(false);
  const [isSavingEditedModel, setIsSavingEditedModel] = useState(false);
  const [isRevertingEditedModel, setIsRevertingEditedModel] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [viewerReloadNonce, setViewerReloadNonce] = useState(0);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [promptDialogOpen, setPromptDialogOpen] = useState(false);
  const [viewerErrorDialogOpen, setViewerErrorDialogOpen] = useState(false);
  const viewerRef = useRef<ThreeViewerHandle | null>(null);
  const skipNextSourceReloadRef = useRef(false);
  const reportedPreviewResultRef = useRef<string | null>(null);
  const [renderSucceeded, setRenderSucceeded] = useState(false);

  const fileDetailQuery = useDesignDetail(designId);
  const refetchFileDetail = fileDetailQuery.refetch;

  const fileDetailResponse = fileDetailQuery.data;
  const fileDetail = fileDetailResponse?.status === 200 ? fileDetailResponse.data : undefined;
  const designData = fileDetail?.design;
  const latestDesignJob = fileDetail?.latestDesignJob ?? null;
  const previewStatus = designData?.previewStatus;
  const assetUriTs = designData?.assetUriTs ?? null;
  const editedAssetUriGlb = designData?.editedAssetUriGlb ?? null;
  const editedAssetUpdatedAt = designData?.editedAssetUpdatedAt ?? null;
  const isAssemblyMode = interactionMode !== 'create';
  const hasSavedEditedModel = Boolean(editedAssetUriGlb);

  const assetVersion = fileDetailQuery.dataUpdatedAt;
  const tsContentUrl = useMemo(() => {
    if (!assetUriTs) return null;
    return resolveAssetContentUrl(designId, 'ts');
  }, [designId, assetUriTs]);

  const exportUrlTs = useMemo(() => resolveAssetContentUrl(designId, 'ts'), [designId]);

  const editedModelUrl = useMemo(() => {
    if (!editedAssetUriGlb) return null;
    const base = resolveEditedModelUrl(designId);
    if (!base) return null;
    const version = editedAssetUpdatedAt ?? assetVersion;
    if (!version) return base;
    return `${base}?v=${encodeURIComponent(String(version))}`;
  }, [assetVersion, editedAssetUpdatedAt, editedAssetUriGlb, designId]);

  const hasRenderableModel = Boolean(
    designId && !isLoading && !loadError && !parseError && (modelCode || modelData),
  );
  const canExportGlb = Boolean(hasRenderableModel && !isExportingGlb);
  const canExportStl = Boolean(hasRenderableModel && !isExportingStl);
  const canSaveEditedModel = Boolean(
    isAssemblyMode && designId && hasRenderableModel && hasUnsavedChanges && !isSavingEditedModel,
  );
  const canRevertEditedModel = Boolean(
    isAssemblyMode &&
      designId &&
      hasRenderableModel &&
      (hasUnsavedChanges || hasSavedEditedModel) &&
      !isRevertingEditedModel,
  );

  const canExportTs = Boolean(designId && exportUrlTs && assetUriTs && !isExportingTs);
  const canOpenPrompt = Boolean(designId);
  const hasViewerError = Boolean(
    parseError ||
      loadError ||
      (previewStatus === 'failed' && !isLoading && !modelCode && !modelData),
  );

  const promptContent = useMemo(() => {
    if (!designId) {
      return 'Select a design to view its prompt.';
    }
    if (fileDetailQuery.isPending) {
      return 'Loading prompt...';
    }
    if (fileDetailQuery.isError) {
      return 'Failed to load prompt for this design.';
    }
    const userPrompt = latestDesignJob?.userPrompt?.trim() ?? '';
    if (!userPrompt) {
      return 'No design prompt is linked to this design yet.';
    }
    return `User Prompt\n${userPrompt}`;
  }, [designId, fileDetailQuery.isError, fileDetailQuery.isPending, latestDesignJob?.userPrompt]);

  useEffect(() => {
    if (!promptDialogOpen || !designId) return;
    void refetchFileDetail();
  }, [promptDialogOpen, designId, refetchFileDetail]);

  useEffect(() => {
    setViewerErrorDialogOpen(hasViewerError);
  }, [hasViewerError]);

  useEffect(() => {
    setLoadError(null);
    setParseError(null);
    setHasUnsavedChanges(false);
    setRenderSucceeded(false);
    setIsLoading(Boolean(designId));
    skipNextSourceReloadRef.current = false;
    reportedPreviewResultRef.current = null;
  }, [designId]);

  const buildAuthHeaders = useCallback(async () => {
    const requestTraceId = traceId ?? buildTraceId();
    const headers = new Headers({
      'X-Trace-Id': requestTraceId,
    });
    const token = await getFreshAuthToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  }, [traceId]);

  useEffect(() => {
    if (skipNextSourceReloadRef.current) {
      skipNextSourceReloadRef.current = false;
      return;
    }

    if (!editedModelUrl && !tsContentUrl) {
      const waitingForDesignDetail =
        Boolean(designId) && (fileDetailQuery.isPending || fileDetailQuery.isFetching);
      if (waitingForDesignDetail) {
        setIsLoading(true);
        setLoadError(null);
        setParseError(null);
        setRenderSucceeded(false);
        setHasUnsavedChanges(false);
        return;
      }
      setModelData(null);
      setModelCode(null);
      setLoadError(null);
      setParseError(null);
      setHasUnsavedChanges(false);
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    const load = async () => {
      setIsLoading(true);
      setLoadError(null);
      setParseError(null);
      setRenderSucceeded(false);
      try {
        const requestInit = {
          signal: controller.signal,
          headers: {
            'X-Trace-Id': traceId ?? buildTraceId(),
          },
        } satisfies RequestInit;
        if (editedModelUrl) {
          const response = await getEditedModel(designId ?? '', requestInit);
          if (response.status === 200) {
            const data = await response.data.arrayBuffer();
            if (!controller.signal.aborted) {
              setModelData(data);
              setModelCode(null);
              setHasUnsavedChanges(false);
            }
            return;
          }
        }
        if (tsContentUrl) {
          const response = await getDesignAssetContent(designId ?? '', { type: 'ts' }, requestInit);
          if (response.status !== 200) {
            throw new Error(`HTTP ${response.status}`);
          }
          const code = response.data;
          if (!controller.signal.aborted) {
            setModelCode(code);
            setModelData(null);
            setHasUnsavedChanges(false);
          }
          return;
        }
      } catch (error) {
        let resolvedError = error;
        const status = (error as Partial<ApiError>)?.status;
        if (editedModelUrl && tsContentUrl && status === 404) {
          try {
            const response = await getDesignAssetContent(
              designId ?? '',
              { type: 'ts' },
              {
                signal: controller.signal,
                headers: {
                  'X-Trace-Id': traceId ?? buildTraceId(),
                },
              },
            );
            if (response.status !== 200) {
              throw new Error(`HTTP ${response.status}`);
            }
            if (!controller.signal.aborted) {
              setModelCode(response.data);
              setModelData(null);
              setHasUnsavedChanges(false);
            }
            return;
          } catch (fallbackError) {
            resolvedError = fallbackError;
          }
        }
        if (!controller.signal.aborted) {
          setModelData(null);
          setModelCode(null);
          setLoadError(resolvedError instanceof Error ? resolvedError.message : 'unknown error');
          setParseError(null);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    load();
    return () => controller.abort();
  }, [
    buildAuthHeaders,
    designId,
    editedModelUrl,
    fileDetailQuery.isFetching,
    fileDetailQuery.isPending,
    tsContentUrl,
    viewerReloadNonce,
  ]);

  const handleModelParseError = useCallback((message: string | null) => {
    setParseError(message);
    setRenderSucceeded(message === null);
  }, []);

  useEffect(() => {
    const designJobId = latestDesignJob?.designJobId ?? null;
    const projectId = designData?.projectId ?? null;
    if (!designId || !designJobId || latestDesignJob?.status !== 'succeeded') {
      return;
    }

    const nextStatus = renderSucceeded && !loadError ? 'succeeded' : parseError ? 'failed' : null;
    if (!nextStatus) {
      return;
    }

    if (nextStatus === 'succeeded' && previewStatus === 'succeeded') {
      return;
    }

    if (nextStatus === 'failed' && previewStatus === 'failed') {
      return;
    }

    const reportKey =
      nextStatus === 'failed'
        ? `${designId}:${designJobId}:${nextStatus}:${parseError}`
        : `${designId}:${designJobId}:${nextStatus}`;
    if (reportedPreviewResultRef.current === reportKey) {
      return;
    }
    reportedPreviewResultRef.current = reportKey;

    let cancelled = false;
    const requestTraceId = traceId ?? buildTraceId();

    void (async () => {
      try {
        await reportDesignPreviewResult(
          designId,
          nextStatus === 'failed'
            ? { status: 'failed', errorMessage: parseError ?? undefined }
            : { status: 'succeeded' },
          {
            headers: {
              'X-Trace-Id': requestTraceId,
            },
          },
        );
        if (cancelled) {
          return;
        }
        await Promise.all([
          refetchFileDetail(),
          projectId
            ? queryClient.invalidateQueries({ queryKey: getListProjectDesignsQueryKey(projectId) })
            : Promise.resolve(),
          queryClient.invalidateQueries({ queryKey: getGetBillingStatusQueryKey() }),
        ]);
      } catch {
        if (!cancelled) {
          reportedPreviewResultRef.current = null;
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    designData?.projectId,
    designId,
    loadError,
    latestDesignJob?.designJobId,
    latestDesignJob?.status,
    parseError,
    previewStatus,
    queryClient,
    refetchFileDetail,
    renderSucceeded,
    traceId,
  ]);

  const handleStructureTreeChange = useCallback(
    (tree: Array<StructureTreeNode>) => {
      onStructureTreeChange?.(tree);
    },
    [onStructureTreeChange],
  );

  const handleSceneMutated = useCallback(() => {
    setHasUnsavedChanges(true);
  }, []);

  const buildDownloadName = (name: string | null | undefined, extension: string) => {
    const trimmed = name?.trim();
    if (!trimmed) return `model${extension}`;
    const base = trimmed.replace(/\.[^/.]+$/, '');
    return `${base}${extension}`;
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(objectUrl);
  };

  const handleExportGlb = async () => {
    if (!hasRenderableModel) {
      toast.warning('3D preview is not ready yet.');
      return;
    }
    try {
      setIsExportingGlb(true);
      const blob = await viewerRef.current?.exportGlb();
      if (!blob) {
        throw new Error('No model loaded');
      }
      downloadBlob(blob, buildDownloadName(designName, '.glb'));
      toast.success('GLB exported.');
    } catch (_error) {
      toast.error('Failed to export GLB.');
    } finally {
      setIsExportingGlb(false);
    }
  };

  const handleExportStl = async () => {
    if (!hasRenderableModel) {
      toast.warning('3D preview is not ready yet.');
      return;
    }
    try {
      setIsExportingStl(true);
      const blob = viewerRef.current?.exportStl();
      if (!blob) {
        throw new Error('No model loaded');
      }
      downloadBlob(blob, buildDownloadName(designName, '.stl'));
      toast.success('STL exported.');
    } catch (_error) {
      toast.error('Failed to export STL.');
    } finally {
      setIsExportingStl(false);
    }
  };

  const handleExportTs = async () => {
    if (!designId) {
      toast.warning('Please select a design.');
      return;
    }
    if (!assetUriTs) {
      toast.warning('JavaScript code is not generated yet.');
      return;
    }
    if (!exportUrlTs) {
      toast.error('API configuration is missing.');
      return;
    }
    try {
      setIsExportingTs(true);
      const response = await getDesignAssetContent(
        designId,
        { type: 'ts' },
        {
          headers: {
            'X-Trace-Id': traceId ?? buildTraceId(),
          },
        },
      );
      if (response.status !== 200) {
        throw new Error(`HTTP ${response.status}`);
      }
      const blob = new Blob([response.data], { type: 'text/javascript' });
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = buildDownloadName(designName, '.js');
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
      toast.success('JavaScript source downloaded.');
    } catch (_error) {
      toast.error('Failed to download JavaScript source.');
    } finally {
      setIsExportingTs(false);
    }
  };

  const handleSaveEditedModel = async () => {
    if (!designId) {
      toast.warning('Please select a design.');
      return;
    }
    if (!hasRenderableModel) {
      toast.warning('3D preview is not ready yet.');
      return;
    }

    const editedModelEndpoint = resolveEditedModelUrl(designId);
    if (!editedModelEndpoint) {
      toast.error('API configuration is missing.');
      return;
    }

    try {
      setIsSavingEditedModel(true);
      const blob = await viewerRef.current?.exportGlb('edited-model');
      if (!blob) {
        throw new Error('No model loaded');
      }
      const headers = await buildAuthHeaders();
      headers.set('Content-Type', 'model/gltf-binary');
      const response = await fetch(editedModelEndpoint, {
        method: 'PUT',
        headers,
        body: blob,
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      skipNextSourceReloadRef.current = true;
      await refetchFileDetail();
      setHasUnsavedChanges(false);
      toast.success('Edited model saved.');
    } catch (_error) {
      toast.error('Failed to save edited model.');
    } finally {
      setIsSavingEditedModel(false);
    }
  };

  const handleRevertEditedModel = async () => {
    if (!designId) {
      toast.warning('Please select a design.');
      return;
    }

    const editedModelEndpoint = resolveEditedModelUrl(designId);
    if (!editedModelEndpoint) {
      toast.error('API configuration is missing.');
      return;
    }

    try {
      setIsRevertingEditedModel(true);
      if (hasSavedEditedModel) {
        const headers = await buildAuthHeaders();
        const response = await fetch(editedModelEndpoint, {
          method: 'DELETE',
          headers,
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        await refetchFileDetail();
      }
      setViewerReloadNonce((current) => current + 1);
      setHasUnsavedChanges(false);
      toast.success(
        hasSavedEditedModel ? 'Reverted to generated model.' : 'Unsaved edits discarded.',
      );
    } catch (_error) {
      toast.error('Failed to revert edits.');
    } finally {
      setIsRevertingEditedModel(false);
    }
  };

  useEffect(() => {
    if (!onAssemblyControlsReady) return;
    onAssemblyControlsReady({
      focusStructureNode: (id: string, options?: { additive?: boolean }) => {
        viewerRef.current?.focusStructureNode(id, options);
      },
      focusFullModel: () => {
        viewerRef.current?.focusFullModel();
      },
      clearSelection: () => {
        viewerRef.current?.clearSelection();
      },
      setStructureNodeHidden: (id: string, hidden: boolean) => {
        viewerRef.current?.setStructureNodeHidden(id, hidden);
      },
      nudgeNode: (axis, delta) => {
        viewerRef.current?.nudgeSelectedNode(axis, delta);
      },
      rotateNode: (axis, deltaRadians) => {
        viewerRef.current?.rotateSelectedNode(axis, deltaRadians);
      },
      setNodeRotation: (axis, radians) => {
        viewerRef.current?.setSelectedNodeRotation(axis, radians);
      },
      nudgeNodeScale: (axis, delta) => {
        viewerRef.current?.nudgeSelectedNodeScale(axis, delta);
      },
      setNodeScale: (axis, value) => {
        viewerRef.current?.setSelectedNodeScale(axis, value);
      },
      resetNode: (target) => {
        viewerRef.current?.resetSelectedNode(target);
      },
      hideSelectedNode: () => {
        viewerRef.current?.hideSelectedNode();
      },
      restoreNode: (id) => {
        viewerRef.current?.restoreNode(id);
      },
      setSelectedNodeColor: (hex) => {
        viewerRef.current?.setSelectedNodeColor(hex);
      },
      resetSelectedNodeColor: () => {
        viewerRef.current?.resetSelectedNodeColor();
      },
      setSelectedNodeEmissiveColor: (hex) => {
        viewerRef.current?.setSelectedNodeEmissiveColor(hex);
      },
      setSelectedNodeEmissiveIntensity: (value) => {
        viewerRef.current?.setSelectedNodeEmissiveIntensity(value);
      },
      resetSelectedNodeEmissive: () => {
        viewerRef.current?.resetSelectedNodeEmissive();
      },
      setSelectedNodeRoughness: (value) => {
        viewerRef.current?.setSelectedNodeRoughness(value);
      },
      resetSelectedNodeRoughness: () => {
        viewerRef.current?.resetSelectedNodeRoughness();
      },
      saveEditedModel: handleSaveEditedModel,
      revertEditedModel: handleRevertEditedModel,
    });
  }, [handleRevertEditedModel, handleSaveEditedModel, onAssemblyControlsReady]);

  return (
    <div className="relative flex w-full min-w-0 flex-1 flex-col bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <div className="absolute left-4 top-4 z-10 flex gap-2">
        <Popover open={viewModeOpen} onOpenChange={onViewModeOpenChange}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              className="flex items-center gap-2 rounded-lg bg-background/70 px-3 py-2 text-sm backdrop-blur"
            >
              <currentView.Icon className="size-5" />
              <span className="capitalize">{currentView.label}</span>
              <ChevronDown className="size-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48 space-y-1 p-2">
            {viewModes.map((mode) => (
              <button
                key={mode.key}
                type="button"
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-muted',
                  currentView.key === mode.key && 'text-primary',
                )}
                onClick={() => {
                  onChangeView(mode);
                  onViewModeOpenChange(false);
                }}
              >
                <mode.Icon className="size-4" />
                {mode.label}
              </button>
            ))}
          </PopoverContent>
        </Popover>
      </div>

      <div className="absolute right-4 top-4 z-10">
        <div className="flex divide-x divide-border/60 overflow-hidden rounded-lg border border-border/70 bg-background/70 backdrop-blur">
          <IconButton
            label="Keyboard shortcuts"
            onClick={() => onShortcutHelpOpenChange?.(!shortcutHelpOpen)}
            className={shortcutHelpOpen ? 'bg-muted/70 text-primary' : undefined}
          >
            <Keyboard className="size-4" />
          </IconButton>
          <IconButton
            label="Prompt"
            onClick={() => setPromptDialogOpen(true)}
            disabled={!canOpenPrompt}
          >
            <FileText className="size-4" />
          </IconButton>
          {isAssemblyMode && (
            <IconButton
              label="Save edited model"
              onClick={() => {
                void handleSaveEditedModel();
              }}
              disabled={!canSaveEditedModel}
              className={hasUnsavedChanges ? 'text-emerald-300' : undefined}
            >
              {isSavingEditedModel ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
            </IconButton>
          )}
          {isAssemblyMode && (
            <IconButton
              label="Revert edits"
              onClick={() => {
                void handleRevertEditedModel();
              }}
              disabled={!canRevertEditedModel}
            >
              {isRevertingEditedModel ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RotateCcw className="size-4" />
              )}
            </IconButton>
          )}
          <Popover open={downloadOpen} onOpenChange={setDownloadOpen}>
            <PopoverTrigger asChild>
              <IconButton label="Download">
                <Download className="size-4" />
              </IconButton>
            </PopoverTrigger>
            <PopoverContent className="w-48 space-y-1 p-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2"
                onClick={() => {
                  handleExportTs();
                  setDownloadOpen(false);
                }}
                disabled={!canExportTs}
              >
                {isExportingTs ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Download className="size-4" />
                )}
                <span>JavaScript</span>
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2"
                onClick={() => {
                  handleExportGlb();
                  setDownloadOpen(false);
                }}
                disabled={!canExportGlb}
              >
                {isExportingGlb ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Download className="size-4" />
                )}
                <span>GLB</span>
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2"
                onClick={() => {
                  void handleExportStl();
                  setDownloadOpen(false);
                }}
                disabled={!canExportStl}
              >
                {isExportingStl ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Download className="size-4" />
                )}
                <span>STL</span>
              </Button>
            </PopoverContent>
          </Popover>
          {/*
          <IconButton label="Fullscreen">
            <Maximize2 className="size-4" />
          </IconButton>
          <IconButton label="Rotate">
            <RefreshCw className="size-4" />
          </IconButton>
          <IconButton label="Pan">
            <BoxSelect className="size-4" />
          </IconButton>
          */}
        </div>
      </div>

      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 rounded-xl border border-white/5" />
      </div>

      <div className="relative flex flex-1 overflow-hidden">
        <ThreeViewer
          key={viewerReloadNonce}
          ref={viewerRef}
          modelData={modelData}
          modelCode={modelCode}
          viewModeKey={currentView.key}
          interactionMode={interactionMode}
          onStructureTreeChange={handleStructureTreeChange}
          onSelectionChange={onSelectionChange}
          onModelParseError={handleModelParseError}
          onSceneMutated={handleSceneMutated}
          className="absolute inset-0"
        />

        {shortcutHelpOpen && (
          <div className="pointer-events-none absolute inset-x-6 bottom-6 z-20 flex justify-start">
            <Card className="pointer-events-auto w-full max-w-md border-white/10 bg-slate-950/88 text-slate-100 shadow-2xl backdrop-blur">
              <CardHeader className="space-y-1 pb-3">
                <CardTitle className="text-base text-white">Keyboard Shortcuts</CardTitle>
                <CardDescription className="text-slate-300">
                  Viewer shortcuts stay active while the canvas is focused.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-2 text-sm text-slate-200">
                <div className="flex items-center justify-between gap-4">
                  <span>Help</span>
                  <Kbd>?</Kbd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span>Frame selected or full model</span>
                  <Kbd>F</Kbd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span>Frame full model</span>
                  <KbdGroup>
                    <Kbd>Shift</Kbd>
                    <Kbd>F</Kbd>
                  </KbdGroup>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span>Clear selection</span>
                  <Kbd>Esc</Kbd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span>Add or remove node from selection</span>
                  <KbdGroup>
                    <Kbd>Cmd/Ctrl</Kbd>
                    <Kbd>Click</Kbd>
                  </KbdGroup>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span>View modes</span>
                  <KbdGroup>
                    <Kbd>1</Kbd>
                    <Kbd>2</Kbd>
                    <Kbd>3</Kbd>
                    <Kbd>4</Kbd>
                    <Kbd>5</Kbd>
                  </KbdGroup>
                </div>
                {isAssemblyMode && (
                  <>
                    <div className="flex items-center justify-between gap-4">
                      <span>Active axis</span>
                      <KbdGroup>
                        <Kbd>X</Kbd>
                        <Kbd>Y</Kbd>
                        <Kbd>Z</Kbd>
                      </KbdGroup>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span>Move along active axis</span>
                      <KbdGroup>
                        <Kbd>←</Kbd>
                        <Kbd>→</Kbd>
                      </KbdGroup>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span>Rotate on active axis</span>
                      <KbdGroup>
                        <Kbd>Shift</Kbd>
                        <Kbd>←</Kbd>
                        <Kbd>→</Kbd>
                      </KbdGroup>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span>Adjust move step</span>
                      <KbdGroup>
                        <Kbd>[</Kbd>
                        <Kbd>]</Kbd>
                      </KbdGroup>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span>Adjust rotate step</span>
                      <KbdGroup>
                        <Kbd>,</Kbd>
                        <Kbd>.</Kbd>
                      </KbdGroup>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span>Reset transforms</span>
                      <KbdGroup>
                        <Kbd>R</Kbd>
                        <Kbd>Shift</Kbd>
                        <Kbd>R</Kbd>
                        <Kbd>Alt</Kbd>
                        <Kbd>R</Kbd>
                      </KbdGroup>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span>Hide or restore selected node</span>
                      <Kbd>H</Kbd>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span>Save edited model</span>
                      <KbdGroup>
                        <Kbd>Cmd/Ctrl</Kbd>
                        <Kbd>S</Kbd>
                      </KbdGroup>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/60 to-transparent" />

      {shortcutHudMessage ? (
        <div className="pointer-events-none absolute bottom-5 left-5 z-20 rounded-lg border border-white/10 bg-slate-950/82 px-3 py-2 text-xs text-slate-100 shadow-xl backdrop-blur">
          <p className="font-medium uppercase tracking-[0.18em] text-slate-400">Keyboard</p>
          <p className="mt-1">
            {shortcutHudMessage} · Axis {activeTransformAxis.toUpperCase()} · Move {moveStep} ·
            Rotate {rotateStep}deg
          </p>
        </div>
      ) : null}

      <Dialog open={promptDialogOpen} onOpenChange={setPromptDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Prompt</DialogTitle>
            <DialogDescription>
              Displays the prompt used for the currently selected design.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[55vh] overflow-auto rounded-md border border-border bg-muted/40 p-3">
            <pre className="whitespace-pre-wrap break-words font-mono text-sm text-foreground">
              {promptContent}
            </pre>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={viewerErrorDialogOpen} onOpenChange={setViewerErrorDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{DESIGN_FAILED_TITLE}</DialogTitle>
            <DialogDescription>{DESIGN_FAILED_MESSAGE}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setViewerErrorDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
