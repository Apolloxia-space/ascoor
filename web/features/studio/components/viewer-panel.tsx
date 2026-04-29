'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Keyboard,
  Loader2,
} from 'lucide-react';

import { viewModes } from '@/mock/studio';
import { IconButton } from './icon-button';
import { ThreeViewer, type ThreeViewerHandle } from './three-viewer';
import type { PartNode } from '../lib/model-parts';
import type { ViewMode } from '../types';
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
import { apiFetcher, buildTraceId } from '@shared/api/fetcher';
import {
  getAssetPackAssetContent,
  getGetBillingStatusQueryKey,
  getListWorkspacesQueryKey,
  getListWorkspaceAssetPacksQueryKey,
  reportAssetPackPreviewResult,
  useUpdateWorkspaceThumbnailContent,
} from '@shared/api/generated/client';
import { useAssetPackDetail } from '../hooks/use-asset-pack-detail';
import { PACK_GENERATION_FAILED_MESSAGE, PACK_GENERATION_FAILED_TITLE } from '../messages';
import { toast } from 'sonner';

type ViewerPanelProps = {
  currentView: ViewMode;
  viewModeOpen: boolean;
  onChangeView: (mode: ViewMode) => void;
  onViewModeOpenChange: (open: boolean) => void;
  onPartsChange?: (parts: Array<PartNode>) => void;
  parts?: Array<PartNode>;
  activePartId?: string | null;
  onPreviewPart?: (id: string) => void;
  onAssemblyControlsReady?: (controls: {
    focusFullModel: () => void;
    previewPart: (id: string) => void;
    clearPartPreview: () => void;
    downloadPartsZip: () => void;
    downloadJavaScript: () => void;
    openPrompt: () => void;
  }) => void;
  assetPackId?: string | null;
  assetPackName?: string | null;
  workspaceThumbnailAssetUri?: string | null;
  traceId?: string | null;
  shortcutHelpOpen?: boolean;
  onShortcutHelpOpenChange?: (open: boolean) => void;
  shortcutHudMessage?: string | null;
};

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? '').replace(/\/$/, '');
const isDevelopmentEnvironment = process.env.NODE_ENV === 'development';

const resolveAssetContentUrl = (assetPackId: string | null | undefined, type: 'ts') => {
  if (!assetPackId || !API_BASE_URL) return null;
  return `${API_BASE_URL}/asset-packs/${assetPackId}/assets/content?type=${type}`;
};

export function ViewerPanel({
  currentView,
  viewModeOpen,
  onChangeView,
  onViewModeOpenChange,
  onPartsChange,
  parts = [],
  activePartId = null,
  onPreviewPart,
  onAssemblyControlsReady,
  assetPackId,
  assetPackName,
  workspaceThumbnailAssetUri = null,
  traceId,
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
  const [isExportingPartsZip, setIsExportingPartsZip] = useState(false);
  const [isExportingTs, setIsExportingTs] = useState(false);
  const [promptDialogOpen, setPromptDialogOpen] = useState(false);
  const [viewerErrorDialogOpen, setViewerErrorDialogOpen] = useState(false);
  const viewerRef = useRef<ThreeViewerHandle | null>(null);
  const reportedPreviewResultRef = useRef<string | null>(null);
  const [renderSucceeded, setRenderSucceeded] = useState(false);
  const uploadThumbnailMutation = useUpdateWorkspaceThumbnailContent({
    mutation: {
      mutationFn: async ({
        workspaceId,
        data,
      }: {
        workspaceId: string;
        data: Blob;
      }) =>
        apiFetcher(`/workspaces/${workspaceId}/thumbnail/content`, {
          method: 'PUT',
          body: data,
          headers: {
            'Content-Type': data.type || 'image/webp',
          },
        }),
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: getListWorkspacesQueryKey() });
      },
    },
    request: {
      headers: {
        'X-Trace-Id': traceId ?? buildTraceId(),
      },
    },
  });

  const fileDetailQuery = useAssetPackDetail(assetPackId);
  const refetchFileDetail = fileDetailQuery.refetch;
  const fileDetailResponse = fileDetailQuery.data;
  const fileDetail = fileDetailResponse?.status === 200 ? fileDetailResponse.data : undefined;
  const assetPackData = fileDetail?.assetPack;
  const latestPackGenerationJob = fileDetail?.latestPackGenerationJob ?? null;
  const previewStatus = assetPackData?.previewStatus;
  const assetUriTs = assetPackData?.assetUriTs ?? null;

  const tsContentUrl = useMemo(() => {
    if (!assetUriTs) return null;
    return resolveAssetContentUrl(assetPackId, 'ts');
  }, [assetPackId, assetUriTs]);

  const exportUrlTs = useMemo(() => {
    if (!isDevelopmentEnvironment) return null;
    return resolveAssetContentUrl(assetPackId, 'ts');
  }, [assetPackId]);

  const hasRenderableModel = Boolean(
    assetPackId && !isLoading && !loadError && !parseError && (modelCode || modelData),
  );
  const activePartIndex = useMemo(() => {
    if (parts.length === 0) return -1;
    const index = activePartId ? parts.findIndex((part) => part.id === activePartId) : -1;
    return index >= 0 ? index : 0;
  }, [activePartId, parts]);
  const activePart = activePartIndex >= 0 ? parts[activePartIndex] : null;
  const canBrowseParts = parts.length > 1 && Boolean(onPreviewPart);
  const handleBrowsePart = useCallback(
    (offset: number) => {
      if (!canBrowseParts || activePartIndex < 0) return;
      const nextIndex = (activePartIndex + offset + parts.length) % parts.length;
      const nextPart = parts[nextIndex];
      if (!nextPart) return;
      onPreviewPart?.(nextPart.id);
    },
    [activePartIndex, canBrowseParts, onPreviewPart, parts],
  );
  const hasViewerError = Boolean(
    parseError ||
      loadError ||
      (previewStatus === 'failed' && !isLoading && !modelCode && !modelData),
  );
  const canGenerateThumbnail = Boolean(
    assetPackId &&
      assetPackData?.workspaceId &&
      renderSucceeded &&
      !loadError &&
      !parseError &&
      !isLoading &&
      parts[0]?.id,
  );

  const captureAndUploadThumbnail = useCallback(async () => {
    const workspaceId = assetPackData?.workspaceId ?? null;
    const firstPartId = parts[0]?.id ?? null;
    if (!assetPackId || !workspaceId || !firstPartId) return false;
    if (uploadThumbnailMutation.isPending) return false;

    const previousPartId = activePartId;
    try {
      for (let attempt = 0; attempt < 4; attempt += 1) {
        viewerRef.current?.previewPart(firstPartId);
        await new Promise<void>((resolve) => {
          window.requestAnimationFrame(() => {
            window.requestAnimationFrame(() => resolve());
          });
        });

        const blob = await viewerRef.current?.captureThumbnail();
        if (blob) {
          await uploadThumbnailMutation.mutateAsync({ workspaceId, data: blob });
          return true;
        }

        await new Promise<void>((resolve) => {
          window.setTimeout(() => resolve(), 180);
        });
      }
      return false;
    } catch {
      return false;
    } finally {
      if (previousPartId && previousPartId !== firstPartId) {
        viewerRef.current?.previewPart(previousPartId);
      }
    }
  }, [
    activePartId,
    assetPackData?.workspaceId,
    assetPackId,
    parts,
    uploadThumbnailMutation,
  ]);

  const promptContent = useMemo(() => {
    if (!assetPackId) {
      return 'Select a pack to view its prompt.';
    }
    if (fileDetailQuery.isPending) {
      return 'Loading prompt...';
    }
    if (fileDetailQuery.isError) {
      return 'Failed to load prompt for this pack.';
    }
    const userPrompt = latestPackGenerationJob?.userPrompt?.trim() ?? '';
    if (!userPrompt) {
      return 'No prompt is linked to this pack yet.';
    }
    return `User Prompt\n${userPrompt}`;
  }, [assetPackId, fileDetailQuery.isError, fileDetailQuery.isPending, latestPackGenerationJob?.userPrompt]);

  useEffect(() => {
    if (!promptDialogOpen || !assetPackId) return;
    void refetchFileDetail();
  }, [promptDialogOpen, assetPackId, refetchFileDetail]);

  useEffect(() => {
    setViewerErrorDialogOpen(hasViewerError);
  }, [hasViewerError]);

  useEffect(() => {
    setLoadError(null);
    setParseError(null);
    setRenderSucceeded(false);
    setIsLoading(Boolean(assetPackId));
    reportedPreviewResultRef.current = null;
  }, [assetPackId]);

  useEffect(() => {
    if (!tsContentUrl) {
      const waitingForAssetPackDetail = Boolean(assetPackId) && fileDetailQuery.isPending;
      if (waitingForAssetPackDetail) {
        setIsLoading(true);
        setLoadError(null);
        setParseError(null);
        setRenderSucceeded(false);
        return;
      }
      setModelData(null);
      setModelCode(null);
      setLoadError(null);
      setParseError(null);
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
        if (tsContentUrl) {
          const response = await getAssetPackAssetContent(assetPackId ?? '', { type: 'ts' }, requestInit);
          if (response.status !== 200) {
            throw new Error(`HTTP ${response.status}`);
          }
          const code = response.data;
          if (!controller.signal.aborted) {
            setModelCode(code);
            setModelData(null);
          }
          return;
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setModelData(null);
          setModelCode(null);
          setLoadError(error instanceof Error ? error.message : 'unknown error');
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
  }, [assetPackId, fileDetailQuery.isPending, tsContentUrl, traceId]);

  const handleModelParseError = useCallback((message: string | null) => {
    setParseError(message);
    setRenderSucceeded(message === null);
  }, []);

  useEffect(() => {
    const packGenerationJobId = latestPackGenerationJob?.packGenerationJobId ?? null;
    const workspaceId = assetPackData?.workspaceId ?? null;
    if (!assetPackId || !packGenerationJobId || latestPackGenerationJob?.status !== 'succeeded') {
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
        ? `${assetPackId}:${packGenerationJobId}:${nextStatus}:${parseError}`
        : `${assetPackId}:${packGenerationJobId}:${nextStatus}`;
    if (reportedPreviewResultRef.current === reportKey) {
      return;
    }
    reportedPreviewResultRef.current = reportKey;

    let cancelled = false;
    const requestTraceId = traceId ?? buildTraceId();

    void (async () => {
      try {
        await reportAssetPackPreviewResult(
          assetPackId,
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
          workspaceId
            ? queryClient.invalidateQueries({ queryKey: getListWorkspaceAssetPacksQueryKey(workspaceId) })
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
    assetPackData?.workspaceId,
    assetPackId,
    loadError,
    latestPackGenerationJob?.packGenerationJobId,
    latestPackGenerationJob?.status,
    parseError,
    previewStatus,
    queryClient,
    refetchFileDetail,
    renderSucceeded,
    traceId,
  ]);

  const handleSetThumbnail = useCallback(async () => {
    if (!canGenerateThumbnail) {
      toast.warning('3D preview is not ready yet.');
      return;
    }
    const success = await captureAndUploadThumbnail();
    if (success) {
      toast.success('Thumbnail saved.');
      return;
    }
    toast.error('Failed to save thumbnail.');
  }, [canGenerateThumbnail, captureAndUploadThumbnail]);

  const buildDownloadBaseName = (name: string | null | undefined) => {
    const trimmed = name?.trim();
    if (!trimmed) return 'model';
    return trimmed.replace(/\.[^/.]+$/, '');
  };

  const buildDownloadName = (name: string | null | undefined, extension: string) => {
    return `${buildDownloadBaseName(name)}${extension}`;
  };

  const buildPartsZipDownloadName = (name: string | null | undefined) => {
    return `${buildDownloadBaseName(name)}_parts.zip`;
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

  const handleExportPartsZip = useCallback(async () => {
    if (isExportingPartsZip) return;
    if (!hasRenderableModel) {
      toast.warning('3D preview is not ready yet.');
      return;
    }
    try {
      setIsExportingPartsZip(true);
      const blob = await viewerRef.current?.exportPartsZip();
      if (!blob) {
        throw new Error('No parts loaded');
      }
      downloadBlob(blob, buildPartsZipDownloadName(assetPackName));
      toast.success('Parts ZIP exported.');
    } catch (_error) {
      toast.error('Failed to export parts ZIP.');
    } finally {
      setIsExportingPartsZip(false);
    }
  }, [assetPackName, hasRenderableModel, isExportingPartsZip]);

  const handleExportTs = useCallback(async () => {
    if (isExportingTs) return;
    if (!isDevelopmentEnvironment) {
      toast.error('JavaScript download is only available in development.');
      return;
    }
    if (!assetPackId) {
      toast.warning('Please select a pack.');
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
      const response = await getAssetPackAssetContent(
        assetPackId,
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
      link.download = buildDownloadName(assetPackName, '.js');
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
  }, [assetUriTs, assetPackId, assetPackName, exportUrlTs, isExportingTs, traceId]);

  useEffect(() => {
    if (!onAssemblyControlsReady) return;
    onAssemblyControlsReady({
      focusFullModel: () => {
        viewerRef.current?.focusFullModel();
      },
      previewPart: (id: string) => {
        viewerRef.current?.previewPart(id);
      },
      clearPartPreview: () => {
        viewerRef.current?.clearPartPreview();
      },
      downloadPartsZip: () => {
        void handleExportPartsZip();
      },
      downloadJavaScript: () => {
        void handleExportTs();
      },
      openPrompt: () => {
        setPromptDialogOpen(true);
      },
    });
  }, [handleExportPartsZip, handleExportTs, onAssemblyControlsReady]);

  return (
    <div className="relative flex w-full min-w-0 flex-1 flex-col bg-[#eef1f3] text-[#191b1f]">
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
        <div className="flex items-center gap-2">
          {canGenerateThumbnail && !workspaceThumbnailAssetUri ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="rounded-lg border border-border/70 bg-background/70 backdrop-blur"
              onClick={() => {
                void handleSetThumbnail();
              }}
              disabled={uploadThumbnailMutation.isPending}
            >
              {uploadThumbnailMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : null}
              Set thumbnail
            </Button>
          ) : null}
          <div className="flex divide-x divide-border/60 overflow-hidden rounded-lg border border-border/70 bg-background/70 backdrop-blur">
          <IconButton
            label="Keyboard shortcuts"
            onClick={() => onShortcutHelpOpenChange?.(!shortcutHelpOpen)}
            className={shortcutHelpOpen ? 'bg-muted/70 text-primary' : undefined}
          >
            <Keyboard className="size-4" />
          </IconButton>
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
      </div>

      <div className="relative flex flex-1 overflow-hidden">
        <ThreeViewer
          ref={viewerRef}
          modelData={modelData}
          modelCode={modelCode}
          viewModeKey={currentView.key}
          onPartsChange={onPartsChange}
          onModelParseError={handleModelParseError}
          className="absolute inset-0"
        />

        {activePart ? (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-between px-4">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="pointer-events-auto h-11 w-11 rounded-lg border border-[#c9ced4] bg-[#f8f9fa]/88 text-[#191b1f] shadow-lg backdrop-blur hover:bg-white"
              onClick={() => handleBrowsePart(-1)}
              disabled={!canBrowseParts}
              aria-label="Previous asset"
            >
              <ChevronLeft className="size-5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="pointer-events-auto h-11 w-11 rounded-lg border border-[#c9ced4] bg-[#f8f9fa]/88 text-[#191b1f] shadow-lg backdrop-blur hover:bg-white"
              onClick={() => handleBrowsePart(1)}
              disabled={!canBrowseParts}
              aria-label="Next asset"
            >
              <ChevronRight className="size-5" />
            </Button>
          </div>
        ) : null}

        {activePart ? (
          <div className="pointer-events-none absolute inset-x-4 bottom-5 z-10 flex justify-center">
            <button
              type="button"
              className="pointer-events-auto max-w-[min(34rem,calc(100vw-2rem))] rounded-lg border border-[#c9ced4] bg-[#f8f9fa]/90 px-3 py-2 text-center text-xs text-[#191b1f] shadow-lg backdrop-blur transition-colors hover:bg-white disabled:cursor-default disabled:hover:bg-[#f8f9fa]/90"
              onClick={() => handleBrowsePart(1)}
              disabled={!canBrowseParts}
              aria-label="Next asset"
            >
              <p className="truncate font-medium">{activePart.displayName}</p>
              <p className="mt-0.5 text-[11px] text-[#555f6d]">
                {activePartIndex + 1} / {parts.length}
              </p>
            </button>
          </div>
        ) : null}

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
                  <span>Frame full model</span>
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
                  <span>View modes</span>
                  <KbdGroup>
                    <Kbd>1</Kbd>
                    <Kbd>2</Kbd>
                    <Kbd>3</Kbd>
                    <Kbd>4</Kbd>
                    <Kbd>5</Kbd>
                  </KbdGroup>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span>Browse assets</span>
                  <KbdGroup>
                    <Kbd>←</Kbd>
                    <Kbd>→</Kbd>
                  </KbdGroup>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {shortcutHudMessage ? (
        <div className="pointer-events-none absolute bottom-5 left-5 z-20 rounded-lg border border-[#c9ced4] bg-[#f8f9fa]/90 px-3 py-2 text-xs text-[#191b1f] shadow-xl backdrop-blur">
          <p className="font-medium uppercase tracking-[0.18em] text-[#555f6d]">Keyboard</p>
          <p className="mt-1">{shortcutHudMessage}</p>
        </div>
      ) : null}

      <Dialog open={promptDialogOpen} onOpenChange={setPromptDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Prompt</DialogTitle>
            <DialogDescription>
              Displays the prompt used for the currently selected pack.
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
            <DialogTitle>{PACK_GENERATION_FAILED_TITLE}</DialogTitle>
            <DialogDescription>{PACK_GENERATION_FAILED_MESSAGE}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setViewerErrorDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
