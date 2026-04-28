'use client';

import {
  ArrowUpCircle,
  AlertTriangle,
  ChevronsLeft,
  CreditCard,
  FolderOpen,
  Home,
  Loader2,
  Menu,
  Settings,
  Sparkles,
  XCircle,
} from 'lucide-react';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuthStore } from '@/features/auth/use-auth-store';
import { viewModes } from '@/mock/studio';
import type { ApiError } from '@/shared/api/fetcher';
import { getAssetPack, useListWorkspaceAssetPacks, useListWorkspaces } from '@/shared/api/generated/client';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/shared/components/ui/sheet';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { paths } from '@/shared/constants/paths';
import { useIsMobile } from '@/shared/hooks/use-mobile';
import { cn } from '@/shared/lib/utils';
import { ChatPanel } from './components/chat-panel';
import { WorkspaceListDialog } from './components/dialogs/workspace-list-dialog';
import { RightPanel } from './components/right-panel';
import { StudioHome } from './components/studio-home';
import { StudioHeader } from './components/studio-header';
import { ViewerPanel } from './components/viewer-panel';
import { useAssetPackMonitor } from './hooks/use-asset-pack-monitor';
import { useStudioApi } from './hooks/use-studio-api';
import { useStudioPersist } from './hooks/use-studio-persist';
import { buildStudioNewPath, buildStudioPath } from './lib/paths';
import { getWorkspaceGenerationStatuses } from './lib/workspace-generation-status';
import type { PartNode } from './lib/model-parts';
import { PACK_GENERATION_FAILED_MESSAGE, PACK_GENERATION_FAILED_TITLE } from './messages';
import { useStudioStore } from './stores/use-studio-store';
import type { WorkspaceAssetPackSummary, WorkspaceResponseData } from '@/shared/api/generated/schemas';

const isApiNotFoundError = (error: unknown): error is ApiError<{ error?: string }> => {
  if (!error || typeof error !== 'object') return false;
  if (!('status' in error)) return false;
  return (error as { status?: unknown }).status === 404;
};

const getAssetPackTimestamp = (assetPack: WorkspaceAssetPackSummary) => {
  return Date.parse(assetPack.updatedAt || assetPack.createdAt) || 0;
};

const getLatestAssetPack = (assetPacks: Array<WorkspaceAssetPackSummary>) => {
  return [...assetPacks].sort((a, b) => getAssetPackTimestamp(b) - getAssetPackTimestamp(a))[0] ?? null;
};

const normalizeWorkspaceTitle = (title?: string | null) => {
  const normalized = (title ?? '').replace(/\s+/g, ' ').trim();
  return normalized ? normalized.slice(0, 300) : null;
};

const formatWorkspaceListName = (name: string) => {
  return name.length > 30 ? `${name.slice(0, 27)}...` : name;
};

const getGeneratedAssetPackTitle = async (assetPackId: string) => {
  const response = await getAssetPack(assetPackId);
  if (response.status !== 200) return null;
  return response.data.latestPackGenerationJob?.title ?? null;
};

const SHORTCUT_BLOCK_SELECTOR = [
  'input',
  'textarea',
  'select',
  '[contenteditable="true"]',
  '[role="dialog"]',
  '[role="menu"]',
  '[data-radix-popper-content-wrapper]',
].join(', ');

const getSingleRouteParam = (value: string | Array<string> | undefined) =>
  Array.isArray(value) ? value[0] : value;

export function StudioPage() {
  useStudioPersist();
  const {
    workspaceId,
    workspaceName,
    workspaces,
    pendingPackGenerations,
    setWorkspace,
    setWorkspaces,
    clearWorkspace,
    chatPanelOpen,
    currentView,
    workspaceMenuOpen,
    viewModeOpen,
    toggleChatPanel,
    setRightPanelMode,
    setCurrentView,
    setWorkspaceMenuOpen,
    setViewModeOpen,
  } = useStudioStore();
  const status = useAuthStore((state) => state.status);
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams<{
    workspaceId?: string | Array<string>;
  }>();
  const isMobile = useIsMobile();
  const [selectedAssetPackId, setSelectedAssetPackId] = useState<string | null>(null);
  const [selectedAssetPackName, setSelectedAssetPackName] = useState<string | null>(null);
  const [selectedAssetPackTraceId, setSelectedAssetPackTraceId] = useState<string | null>(null);
  const [assetPackErrorDialogOpen, setAssetPackErrorDialogOpen] = useState(false);
  const [assetPackErrorMessage, setAssetPackErrorMessage] = useState(PACK_GENERATION_FAILED_MESSAGE);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const [workspaceListDialogOpen, setWorkspaceListDialogOpen] = useState(false);
  const [invalidRouteWorkspaceId, setInvalidRouteWorkspaceId] = useState<string | null>(null);
  const [parts, setParts] = useState<Array<PartNode>>([]);
  const [activePartId, setActivePartId] = useState<string | null>(null);
  const [shortcutHelpOpen, setShortcutHelpOpen] = useState(false);
  const [shortcutHudMessage, setShortcutHudMessage] = useState<string | null>(null);
  const shortcutHudTimerRef = useRef<number | null>(null);
  const workspaceTitleSyncWorkspaceIdsRef = useRef<Set<string>>(new Set());
  const workspaceTitleSyncInFlightRef = useRef<Set<string>>(new Set());

  const assemblyControlsRef = useRef<{
    focusFullModel: () => void;
    previewPart: (id: string) => void;
    clearPartPreview: () => void;
    downloadPartsZip: () => void;
    downloadJavaScript: () => void;
    openPrompt: () => void;
  } | null>(null);
  const { updateWorkspace, invalidateWorkspaces, invalidateWorkspaceAssetPacks } = useStudioApi();
  const routeWorkspaceId = getSingleRouteParam(params.workspaceId) ?? null;
  const isStudioHome = pathname === paths.studio && !routeWorkspaceId;
  const activeRouteWorkspaceId =
    routeWorkspaceId && routeWorkspaceId !== invalidRouteWorkspaceId ? routeWorkspaceId : null;
  const activeWorkspaceId = activeRouteWorkspaceId ?? (isStudioHome ? '' : workspaceId ?? '');
  const workspacesQuery = useListWorkspaces(
    { limit: 20 },
    {
      query: {
        enabled: status === 'authenticated',
        staleTime: 60_000,
      },
    },
  );
  const assetPacksQuery = useListWorkspaceAssetPacks(activeWorkspaceId, {
    query: {
      enabled: status === 'authenticated' && Boolean(activeWorkspaceId),
      staleTime: 60_000,
      retry: false,
    },
  });
  const workspaceItems: Array<WorkspaceResponseData> =
    workspacesQuery.data?.status === 200 ? workspacesQuery.data.data.items : [];
  const assetPacks = assetPacksQuery.data?.status === 200 ? assetPacksQuery.data.data.assetPacks : [];
  const latestAssetPack = useMemo(() => getLatestAssetPack(assetPacks), [assetPacks]);
  const currentWorkspace = useMemo(
    () => workspaceItems.find((workspace) => workspace.id === activeWorkspaceId) ?? null,
    [activeWorkspaceId, workspaceItems],
  );
  const workspaceGenerationStatuses = useMemo(
    () => getWorkspaceGenerationStatuses(pendingPackGenerations),
    [pendingPackGenerations],
  );
  const workspacesLoading = status === 'authenticated' && workspacesQuery.isPending;
  const workspacesRefreshing =
    status === 'authenticated' && workspacesQuery.isFetching && !workspacesQuery.isPending;
  const hasSelectedAssetPackState =
    selectedAssetPackId !== null ||
    selectedAssetPackName !== null ||
    selectedAssetPackTraceId !== null ||
    parts.length > 0 ||
    activePartId !== null ||
    shortcutHelpOpen ||
    shortcutHudMessage !== null;

  const clearSelectedAssetPack = useCallback(() => {
    if (!hasSelectedAssetPackState) return;
    setSelectedAssetPackId(null);
    setSelectedAssetPackName(null);
    setSelectedAssetPackTraceId(null);
    setParts([]);
    setActivePartId(null);
    setShortcutHelpOpen(false);
    setShortcutHudMessage(null);
  }, [activePartId, hasSelectedAssetPackState, parts.length, shortcutHelpOpen, shortcutHudMessage]);

  const handleSelectWorkspace = useCallback(
    (nextWorkspaceId: string, _nextWorkspaceName: string) => {
      clearSelectedAssetPack();
      setRightPanelMode('create');
      const nextPath = buildStudioPath(nextWorkspaceId);
      if (pathname !== nextPath) {
        router.push(nextPath);
      }
    },
    [clearSelectedAssetPack, pathname, router, setRightPanelMode],
  );

  const handleCloseWorkspace = useCallback(() => {
    clearSelectedAssetPack();
    if (pathname === paths.studio && (workspaceId || workspaceName)) {
      clearWorkspace();
    }
    if (pathname !== paths.studio) {
      router.replace(paths.studio);
    }
  }, [clearWorkspace, clearSelectedAssetPack, pathname, workspaceId, workspaceName, router]);

  const handleOpenNewPackPage = useCallback(() => {
    router.push(buildStudioNewPath());
  }, [router]);

  const applySelectedAssetPack = useCallback(
    (assetPackId: string, name: string, traceId: string | null = null) => {
      setSelectedAssetPackId(assetPackId);
      setSelectedAssetPackName(name);
      setSelectedAssetPackTraceId(traceId);
      setParts([]);
      setActivePartId(null);
      setShortcutHelpOpen(false);
      setShortcutHudMessage(null);
      setRightPanelMode('create');
    },
    [setRightPanelMode],
  );

  const syncWorkspaceName = useCallback(
    async (targetWorkspaceId: string, title?: string | null) => {
      const nextWorkspaceName = normalizeWorkspaceTitle(title);
      if (!nextWorkspaceName) return false;

      const currentState = useStudioStore.getState();
      const currentWorkspaceName =
        currentState.workspaces.find((workspace) => workspace.id === targetWorkspaceId)?.name ??
        (currentState.workspaceId === targetWorkspaceId ? currentState.workspaceName : '');
      if (currentWorkspaceName === nextWorkspaceName) {
        return true;
      }

      const syncKey = `${targetWorkspaceId}:${nextWorkspaceName}`;
      if (workspaceTitleSyncInFlightRef.current.has(syncKey)) {
        return false;
      }
      workspaceTitleSyncInFlightRef.current.add(syncKey);

      try {
        const updatedWorkspace = await updateWorkspace(targetWorkspaceId, nextWorkspaceName);
        const workspaceSummary = { id: updatedWorkspace.id, name: updatedWorkspace.name };
        const currentWorkspaces = useStudioStore.getState().workspaces;
        const hasWorkspace = currentWorkspaces.some((workspace) => workspace.id === updatedWorkspace.id);
        const nextWorkspaces = hasWorkspace
          ? currentWorkspaces.map((workspace) =>
              workspace.id === updatedWorkspace.id ? workspaceSummary : workspace,
            )
          : [workspaceSummary, ...currentWorkspaces];
        const workspacesChanged =
          currentWorkspaces.length !== nextWorkspaces.length ||
          currentWorkspaces.some(
            (workspace, index) =>
              workspace.id !== nextWorkspaces[index]?.id || workspace.name !== nextWorkspaces[index]?.name,
          );
        if (workspacesChanged) {
          setWorkspaces(nextWorkspaces);
        }
        if (useStudioStore.getState().workspaceId === updatedWorkspace.id) {
          setWorkspace(updatedWorkspace.id, updatedWorkspace.name);
        }
        invalidateWorkspaces();
        return true;
      } catch (_error) {
        return false;
      } finally {
        workspaceTitleSyncInFlightRef.current.delete(syncKey);
      }
    },
    [invalidateWorkspaces, setWorkspace, setWorkspaces, updateWorkspace],
  );

  useAssetPackMonitor({
    enabled: status === 'authenticated',
    onInvalidateWorkspaceAssetPacks: invalidateWorkspaceAssetPacks,
    onAssetPackSucceeded: (payload) => {
      if (!payload.assetPackId) return;
      const generatedAssetPackId = payload.assetPackId;
      workspaceTitleSyncWorkspaceIdsRef.current.add(payload.workspaceId);

      void (async () => {
        const detailTitle = await getGeneratedAssetPackTitle(generatedAssetPackId);
        const generatedTitle = normalizeWorkspaceTitle(detailTitle) ? detailTitle : payload.title;
        return syncWorkspaceName(payload.workspaceId, generatedTitle);
      })().then((synced) => {
        if (synced) {
          workspaceTitleSyncWorkspaceIdsRef.current.delete(payload.workspaceId);
        }
      });
    },
    onAssetPackFailed: (_payload) => {
      setAssetPackErrorMessage(PACK_GENERATION_FAILED_MESSAGE);
      setAssetPackErrorDialogOpen(true);
    },
  });

  const showShortcutHud = useCallback((message: string) => {
    setShortcutHudMessage(message);
    if (shortcutHudTimerRef.current) {
      window.clearTimeout(shortcutHudTimerRef.current);
    }
    shortcutHudTimerRef.current = window.setTimeout(() => {
      setShortcutHudMessage(null);
      shortcutHudTimerRef.current = null;
    }, 1400);
  }, []);

  const previewPart = useCallback((id: string) => {
    setActivePartId(id);
    assemblyControlsRef.current?.previewPart(id);
  }, []);

  const browsePart = useCallback(
    (offset: number) => {
      if (parts.length < 2) return;
      const currentIndex = activePartId
        ? parts.findIndex((part) => part.id === activePartId)
        : -1;
      const baseIndex = currentIndex >= 0 ? currentIndex : 0;
      const nextIndex = (baseIndex + offset + parts.length) % parts.length;
      const nextPart = parts[nextIndex];
      if (!nextPart) return;
      previewPart(nextPart.id);
      showShortcutHud(nextPart.displayName);
    },
    [activePartId, parts, previewPart, showShortcutHud],
  );

  const downloadCurrentPackZip = useCallback(() => {
    assemblyControlsRef.current?.downloadPartsZip();
  }, []);

  const downloadCurrentPackJavaScript = useCallback(() => {
    assemblyControlsRef.current?.downloadJavaScript();
  }, []);

  useEffect(() => {
    return () => {
      if (shortcutHudTimerRef.current) {
        window.clearTimeout(shortcutHudTimerRef.current);
      }
    };
  }, []);

  const handleShortcutScopeKeyDownCapture = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (!(event.target instanceof HTMLElement)) return;
      if (event.target.closest(SHORTCUT_BLOCK_SELECTOR)) return;

      const lowerKey = event.key.toLowerCase();
      const metaOrCtrl = event.metaKey || event.ctrlKey;

      if (
        (event.key === '?' || (event.key === '/' && event.shiftKey)) &&
        !metaOrCtrl &&
        !event.altKey
      ) {
        event.preventDefault();
        setShortcutHelpOpen((current) => !current);
        return;
      }

      if (event.key === 'Escape') {
        if (shortcutHelpOpen) {
          event.preventDefault();
          setShortcutHelpOpen(false);
          return;
        }
        return;
      }

      if (shortcutHelpOpen) {
        return;
      }

      if (
        !event.shiftKey &&
        !event.altKey &&
        !metaOrCtrl &&
        (event.key === 'ArrowLeft' || event.key === 'ArrowRight') &&
        parts.length > 1
      ) {
        event.preventDefault();
        browsePart(event.key === 'ArrowRight' ? 1 : -1);
        return;
      }

      if (
        !event.shiftKey &&
        !event.altKey &&
        !metaOrCtrl &&
        ['1', '2', '3', '4', '5'].includes(event.key)
      ) {
        const index = Number(event.key) - 1;
        const nextView = viewModes[index];
        if (!nextView) return;
        event.preventDefault();
        setCurrentView(nextView);
        showShortcutHud(`View mode ${nextView.label}`);
        return;
      }

      if (!metaOrCtrl && !event.altKey && lowerKey === 'f') {
        event.preventDefault();
        if (event.shiftKey) {
          assemblyControlsRef.current?.focusFullModel();
          if (!event.repeat) {
            showShortcutHud('Framed full model');
          }
          return;
        }
        assemblyControlsRef.current?.focusFullModel();
        return;
      }
    },
    [browsePart, parts.length, setCurrentView, shortcutHelpOpen, showShortcutHud],
  );

  useEffect(() => {
    if (status !== 'authenticated') return;
    if (!workspacesQuery.isSuccess) return;
    const nextWorkspaces = workspaceItems.map((workspace) => ({ id: workspace.id, name: workspace.name }));
    const sameWorkspaces =
      nextWorkspaces.length === workspaces.length &&
      nextWorkspaces.every(
        (workspace, index) =>
          workspaces[index]?.id === workspace.id && workspaces[index]?.name === workspace.name,
      );

    if (!sameWorkspaces) {
      setWorkspaces(nextWorkspaces);
    }

    if (workspaceItems.length === 0) {
      if (workspaceId || workspaceName) {
        clearWorkspace();
      }
      return;
    }
    if (!workspaceId) {
      return;
    }
    const current = workspaceItems.find((workspace) => workspace.id === workspaceId) ?? null;
    if (current && workspaceName !== current.name) {
      setWorkspace(current.id, current.name);
    }
  }, [
    status,
    workspacesQuery.isSuccess,
    workspaceItems,
    workspaces,
    workspaceId,
    workspaceName,
    setWorkspace,
    setWorkspaces,
    clearWorkspace,
  ]);

  useEffect(() => {
    if (!invalidRouteWorkspaceId) return;
    if (routeWorkspaceId === invalidRouteWorkspaceId) return;
    setInvalidRouteWorkspaceId(null);
  }, [routeWorkspaceId, invalidRouteWorkspaceId]);

  useEffect(() => {
    if (!activeWorkspaceId) return;
    if (!assetPacksQuery.isError) return;
    if (!isApiNotFoundError(assetPacksQuery.error)) return;
    if (routeWorkspaceId === activeWorkspaceId && invalidRouteWorkspaceId !== routeWorkspaceId) {
      setInvalidRouteWorkspaceId(routeWorkspaceId);
    }
    clearSelectedAssetPack();
    if (workspaceId || workspaceName) {
      clearWorkspace();
    }
    if (pathname !== paths.studio) {
      router.replace(paths.studio);
    }
  }, [
    activeWorkspaceId,
    routeWorkspaceId,
    invalidRouteWorkspaceId,
    pathname,
    assetPacksQuery.isError,
    assetPacksQuery.error,
    workspaceId,
    workspaceName,
    clearWorkspace,
    clearSelectedAssetPack,
    router,
  ]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace(paths.home);
    }
  }, [status, router]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      if (workspaces.length > 0) {
        setWorkspaces([]);
      }
      clearSelectedAssetPack();
      if (workspaceId || workspaceName) {
        clearWorkspace();
      }
    }
  }, [
    status,
    workspaces.length,
    workspaceId,
    workspaceName,
    setWorkspaces,
    clearWorkspace,
    clearSelectedAssetPack,
  ]);

  useEffect(() => {
    if (!isMobile) {
      setMobileChatOpen(false);
    }
  }, [isMobile]);

  useEffect(() => {
    if (parts.length === 0) {
      if (activePartId) {
        setActivePartId(null);
      }
      return;
    }

    if (activePartId && parts.some((part) => part.id === activePartId)) {
      return;
    }

    const firstPart = parts[0];
    if (!firstPart) return;
    setActivePartId(firstPart.id);
    window.requestAnimationFrame(() => {
      assemblyControlsRef.current?.previewPart(firstPart.id);
    });
  }, [activePartId, parts]);

  useEffect(() => {
    if (status !== 'authenticated') return;

    if (!routeWorkspaceId) {
      if (pathname === paths.studio && (workspaceId || workspaceName)) {
        clearWorkspace();
      }
      return;
    }

    if (routeWorkspaceId === invalidRouteWorkspaceId) {
      if (workspaceId || workspaceName) {
        clearWorkspace();
      }
      return;
    }

    const matchedWorkspace =
      workspaces.find((workspace) => workspace.id === routeWorkspaceId) ??
      workspaceItems.find((workspace) => workspace.id === routeWorkspaceId) ??
      null;
    const nextWorkspaceName = matchedWorkspace?.name ?? '';

    if (workspaceId !== routeWorkspaceId || workspaceName !== nextWorkspaceName) {
      setWorkspace(routeWorkspaceId, nextWorkspaceName);
    }
  }, [
    status,
    pathname,
    routeWorkspaceId,
    invalidRouteWorkspaceId,
    workspaceId,
    workspaceName,
    workspaces,
    workspaceItems,
    setWorkspace,
    clearWorkspace,
  ]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    if (!routeWorkspaceId) return;
    if (workspaceId !== routeWorkspaceId) return;
    if (!assetPacksQuery.isSuccess) return;

    if (!latestAssetPack) {
      if (hasSelectedAssetPackState) {
        clearSelectedAssetPack();
      }
      return;
    }

    const latestAssetPackName = latestAssetPack.displayName ?? workspaceName ?? 'Untitled';
    if (selectedAssetPackId !== latestAssetPack.id || selectedAssetPackName !== latestAssetPackName) {
      applySelectedAssetPack(latestAssetPack.id, latestAssetPackName);
    }

    if (workspaceTitleSyncWorkspaceIdsRef.current.has(routeWorkspaceId)) {
      workspaceTitleSyncWorkspaceIdsRef.current.delete(routeWorkspaceId);
      void (async () => {
        const generatedTitle = await getGeneratedAssetPackTitle(latestAssetPack.id);
        return syncWorkspaceName(routeWorkspaceId, generatedTitle);
      })();
    }
  }, [
    status,
    routeWorkspaceId,
    workspaceId,
    workspaceName,
    assetPacksQuery.isSuccess,
    latestAssetPack,
    selectedAssetPackId,
    selectedAssetPackName,
    hasSelectedAssetPackState,
    clearSelectedAssetPack,
    applySelectedAssetPack,
    syncWorkspaceName,
  ]);

  const mobileMenuSectionTitleClass =
    'px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground';
  const mobileMenuItemClass =
    'flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground';

  if (status !== 'authenticated') {
    return <div className="min-h-screen" />;
  }

  return (
    <div className="h-screen min-h-0 overflow-hidden">
      <WorkspaceListDialog
        open={workspaceListDialogOpen}
        onOpenChange={setWorkspaceListDialogOpen}
        onSelectWorkspace={handleSelectWorkspace}
        onDeleteCurrentWorkspace={handleCloseWorkspace}
      />
      <div className={cn('flex h-full min-h-0 flex-col transition-all')}>
        <StudioHeader
          workspaceMenuOpen={workspaceMenuOpen}
          onWorkspaceMenuChange={setWorkspaceMenuOpen}
          onSelectWorkspace={handleSelectWorkspace}
          onCloseWorkspace={handleCloseWorkspace}
          onOpenWorkspaceManager={() => setWorkspaceListDialogOpen(true)}
          workspacesLoading={workspacesLoading}
          workspacesRefreshing={workspacesRefreshing}
          hideWorkspaceMenuOnMobile
          showBrand
          workspaceNameOverride={isStudioHome ? 'Studio' : null}
          workspaceMenuRightSlot={
            <>
              {!isStudioHome ? (
                <>
                  <Button
                    asChild
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="hidden md:inline-flex"
                  >
                    <a href={paths.studio} aria-label="Studio home">
                      <Home className="size-5" />
                    </a>
                  </Button>
                  <Button
                    asChild
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="md:hidden"
                  >
                    <a href={paths.studio} aria-label="Studio home">
                      <Home className="size-5" />
                    </a>
                  </Button>
                </>
              ) : null}
              <Button
                type="button"
                size="sm"
                className="hidden rounded-lg md:inline-flex"
                onClick={handleOpenNewPackPage}
              >
                <Sparkles className="size-4" />
                New Pack
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="md:hidden"
                aria-label="Open menu"
                onClick={() => setMobileMenuOpen(true)}
              >
                <Menu className="size-5" />
              </Button>
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetContent side="left" className="w-[90vw] max-w-sm gap-0 p-0">
                  <div className="sr-only">
                    <SheetTitle>Navigation menu</SheetTitle>
                    <SheetDescription>
                      Navigate between pack tools, workspace lists, settings, and billing pages.
                    </SheetDescription>
                  </div>
                  <div className="border-b border-border px-4 py-4 pr-12">
                    <h2 className="text-lg font-semibold leading-tight">Ascoor</h2>
                  </div>

                  <div className="flex-1 space-y-4 overflow-y-auto px-2 py-3">
                    <section className="space-y-1">
                      <p className={mobileMenuSectionTitleClass}>Pack</p>
                      <button
                        type="button"
                        className={mobileMenuItemClass}
                        onClick={() => {
                          setMobileMenuOpen(false);
                          setMobileChatOpen(false);
                          handleOpenNewPackPage();
                        }}
                      >
                        <Sparkles className="size-4" />
                        New Pack
                      </button>
                    </section>

                    <section className="space-y-1 border-t border-border pt-3">
                      <p className={mobileMenuSectionTitleClass}>Workspace</p>
                      <button
                        type="button"
                        className={mobileMenuItemClass}
                        onClick={() => {
                          handleCloseWorkspace();
                          setMobileMenuOpen(false);
                          setMobileChatOpen(false);
                        }}
                        disabled={!workspaceId}
                      >
                        <XCircle className="size-4" />
                        Close workspace
                      </button>
                      <button
                        type="button"
                        className={mobileMenuItemClass}
                        onClick={() => {
                          setMobileMenuOpen(false);
                          setMobileChatOpen(false);
                          setWorkspaceListDialogOpen(true);
                        }}
                      >
                        <FolderOpen className="size-4" />
                        Manage workspaces
                      </button>
                      <div
                        className={cn(mobileMenuSectionTitleClass, 'flex items-center gap-2 pt-2')}
                      >
                        <span>Recent workspace</span>
                        {workspacesRefreshing && !workspacesLoading ? (
                          <Loader2
                            className="size-3.5 animate-spin"
                            aria-label="Refreshing recent workspaces"
                          />
                        ) : null}
                      </div>
                      <div className="max-h-64 space-y-1 overflow-y-auto">
                        {workspacesLoading && workspaces.length === 0 ? (
                          <div className="space-y-2 px-3 py-2">
                            {[0, 1, 2].map((index) => (
                              <div key={index} className="flex items-center gap-2">
                                <Skeleton className="h-4 w-4 rounded-sm" />
                                <Skeleton className="h-4 flex-1 rounded-sm" />
                              </div>
                            ))}
                          </div>
                        ) : workspaces.length === 0 ? (
                          <p className="px-3 py-2 text-sm text-muted-foreground">No workspaces</p>
                        ) : (
                          workspaces.slice(0, 10).map((workspace) => {
                            const generationStatus = workspaceGenerationStatuses[workspace.id];
                            const isFailedGeneration = generationStatus?.kind === 'failed';
                            const isActiveGeneration =
                              generationStatus?.kind === 'queued' ||
                              generationStatus?.kind === 'running';

                            return (
                              <button
                                type="button"
                                key={workspace.id}
                                className={cn(
                                  mobileMenuItemClass,
                                  workspaceId === workspace.id && 'bg-accent text-accent-foreground',
                                )}
                                onClick={() => {
                                  handleSelectWorkspace(workspace.id, workspace.name);
                                  setMobileMenuOpen(false);
                                  setMobileChatOpen(false);
                                }}
                              >
                                <span className="min-w-0 flex-1 truncate" title={workspace.name}>
                                  {formatWorkspaceListName(workspace.name)}
                                </span>
                                {generationStatus ? (
                                  <Badge
                                    variant={isFailedGeneration ? 'destructive' : 'outline'}
                                    className="max-w-[110px] gap-1 truncate"
                                    title={generationStatus.detailTitle}
                                  >
                                    {isFailedGeneration ? (
                                      <AlertTriangle className="size-3" />
                                    ) : null}
                                    {isActiveGeneration ? (
                                      <Loader2 className="size-3 animate-spin" />
                                    ) : null}
                                    <span className="truncate">{generationStatus.label}</span>
                                  </Badge>
                                ) : null}
                                {workspaceId === workspace.id && (
                                  <span className="text-xs text-primary">Current</span>
                                )}
                              </button>
                            );
                          })
                        )}
                      </div>
                    </section>

                    <section className="space-y-1 border-t border-border pt-3">
                      <p className={mobileMenuSectionTitleClass}>Account</p>
                      <a
                        href={paths.settingsAccount}
                        className={mobileMenuItemClass}
                        onClick={() => {
                          setMobileMenuOpen(false);
                          setMobileChatOpen(false);
                        }}
                      >
                        <Settings className="size-4" />
                        Settings
                      </a>
                      <a
                        href={paths.settingsBilling}
                        className={mobileMenuItemClass}
                        onClick={() => {
                          setMobileMenuOpen(false);
                          setMobileChatOpen(false);
                        }}
                      >
                        <CreditCard className="size-4" />
                        Billing
                      </a>
                      <a
                        href={paths.plan}
                        className={mobileMenuItemClass}
                        onClick={() => {
                          setMobileMenuOpen(false);
                          setMobileChatOpen(false);
                        }}
                      >
                        <ArrowUpCircle className="size-4" />
                        Upgrade
                      </a>
                    </section>
                  </div>
                </SheetContent>
              </Sheet>
            </>
          }
          userMenuLeftSlot={
            <Button asChild variant="ghost" size="icon" className="hidden md:inline-flex">
              <a href={paths.settingsAccount} aria-label="Settings">
                <Settings className="size-5" />
              </a>
            </Button>
          }
        />
        {isStudioHome ? (
          <StudioHome
            workspaces={workspaceItems as Array<WorkspaceResponseData & { thumbnailAssetUri?: string | null }>}
            workspaceGenerationStatuses={workspaceGenerationStatuses}
            workspacesLoading={workspacesLoading}
            workspacesRefreshing={workspacesRefreshing}
            onCreateNewPack={handleOpenNewPackPage}
            onOpenWorkspaceManager={() => setWorkspaceListDialogOpen(true)}
            onSelectWorkspace={handleSelectWorkspace}
          />
        ) : (
          <main className="flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-visible md:flex-row">
            <section className="flex min-h-0 flex-1 min-w-0 overflow-hidden">
              <div
                className="relative flex min-h-0 flex-1 min-w-0"
                onKeyDownCapture={handleShortcutScopeKeyDownCapture}
              >
                <ViewerPanel
                  currentView={currentView}
                  viewModeOpen={viewModeOpen}
                  onChangeView={setCurrentView}
                  onViewModeOpenChange={setViewModeOpen}
                  onPartsChange={setParts}
                  parts={parts}
                  activePartId={activePartId}
                  onPreviewPart={previewPart}
                  onAssemblyControlsReady={(controls) => {
                    assemblyControlsRef.current = controls;
                  }}
                  assetPackId={selectedAssetPackId}
                  assetPackName={selectedAssetPackName}
                  workspaceThumbnailAssetUri={currentWorkspace?.thumbnailAssetUri ?? null}
                  traceId={selectedAssetPackTraceId}
                  shortcutHelpOpen={shortcutHelpOpen}
                  onShortcutHelpOpenChange={setShortcutHelpOpen}
                  shortcutHudMessage={shortcutHudMessage}
                />
                <RightPanel
                  open={chatPanelOpen}
                  parts={parts}
                  activePartId={activePartId}
                  onPreviewPart={previewPart}
                  onToggle={toggleChatPanel}
                  hasSelectedPack={Boolean(selectedAssetPackId)}
                  showJavaScriptDownload={false}
                  onDownloadZip={downloadCurrentPackZip}
                  onDownloadJavaScript={downloadCurrentPackJavaScript}
                />
                {!chatPanelOpen ? (
                  <button
                    type="button"
                    className="absolute right-0 top-24 z-30 hidden h-12 w-7 items-center justify-center rounded-l-lg border border-r-0 shadow-lg backdrop-blur transition-all hover:w-9 md:flex"
                    onClick={toggleChatPanel}
                    aria-label="Show activity panel"
                    aria-expanded={chatPanelOpen}
                  >
                    <ChevronsLeft className="size-5" />
                  </button>
                ) : null}
                {!mobileChatOpen ? (
                  <button
                    type="button"
                    className="absolute right-0 top-24 z-30 flex h-12 w-8 items-center justify-center rounded-l-lg border border-r-0 shadow-lg backdrop-blur md:hidden"
                    onClick={() => {
                      setRightPanelMode('create');
                      setMobileChatOpen(true);
                    }}
                    aria-label="Show activity panel"
                    aria-expanded={mobileChatOpen}
                  >
                    <ChevronsLeft className="size-5" />
                  </button>
                ) : null}
                {mobileChatOpen ? (
                  <div className="absolute inset-y-0 right-0 z-40 w-[90vw] max-w-sm md:hidden">
                    <ChatPanel
                      variant="mobile"
                      open={mobileChatOpen}
                      onToggle={() => setMobileChatOpen(false)}
                      hasSelectedPack={Boolean(selectedAssetPackId)}
                      showJavaScriptDownload={false}
                      parts={parts}
                      activePartId={activePartId}
                      onDownloadZip={downloadCurrentPackZip}
                      onDownloadJavaScript={downloadCurrentPackJavaScript}
                      onPreviewPart={previewPart}
                    />
                  </div>
                ) : null}
              </div>
            </section>
          </main>
        )}

        <Dialog open={assetPackErrorDialogOpen} onOpenChange={setAssetPackErrorDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{PACK_GENERATION_FAILED_TITLE}</DialogTitle>
              <DialogDescription>{assetPackErrorMessage}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button onClick={() => setAssetPackErrorDialogOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
