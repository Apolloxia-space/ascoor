'use client';

import {
  ArrowUpCircle,
  AlertTriangle,
  ChevronsLeft,
  CreditCard,
  FolderOpen,
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
import { getDesign, useListProjectDesigns, useListProjects } from '@/shared/api/generated/client';
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
import { ChatPanel, NewPackDialog } from './components/chat-panel';
import { ProjectListDialog } from './components/dialogs/project-list-dialog';
import { RightPanel } from './components/right-panel';
import { StudioHeader } from './components/studio-header';
import { ViewerPanel } from './components/viewer-panel';
import { useDesignMonitor } from './hooks/use-design-monitor';
import { useStudioApi } from './hooks/use-studio-api';
import { useStudioPersist } from './hooks/use-studio-persist';
import { buildStudioPath } from './lib/paths';
import { getWorkspaceGenerationStatuses } from './lib/workspace-generation-status';
import type { PartNode } from './lib/model-parts';
import { DESIGN_FAILED_MESSAGE, DESIGN_FAILED_TITLE } from './messages';
import { useStudioStore } from './stores/use-studio-store';
import type { ProjectDesignSummary, ProjectResponseData } from '@/shared/api/generated/schemas';

const isApiNotFoundError = (error: unknown): error is ApiError<{ error?: string }> => {
  if (!error || typeof error !== 'object') return false;
  if (!('status' in error)) return false;
  return (error as { status?: unknown }).status === 404;
};

const getDesignTimestamp = (design: ProjectDesignSummary) => {
  return Date.parse(design.updatedAt || design.createdAt) || 0;
};

const getProjectFileDesign = (designs: Array<ProjectDesignSummary>) => {
  return [...designs].sort((a, b) => getDesignTimestamp(b) - getDesignTimestamp(a))[0] ?? null;
};

const normalizeWorkspaceTitle = (title?: string | null) => {
  const normalized = (title ?? '').replace(/\s+/g, ' ').trim();
  return normalized ? normalized.slice(0, 300) : null;
};

const formatWorkspaceListName = (name: string) => {
  return name.length > 30 ? `${name.slice(0, 27)}...` : name;
};

const getGeneratedDesignTitle = async (designId: string) => {
  const response = await getDesign(designId);
  if (response.status !== 200) return null;
  return response.data.latestDesignJob?.title ?? null;
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

const isDevelopmentEnvironment = process.env.NODE_ENV === 'development';

export function StudioPage() {
  useStudioPersist();
  const {
    projectId,
    projectName,
    projects,
    pendingDesigns,
    setProject,
    setProjects,
    clearProject,
    chatPanelOpen,
    currentView,
    projectMenuOpen,
    viewModeOpen,
    toggleChatPanel,
    setRightPanelMode,
    setCurrentView,
    setProjectMenuOpen,
    setViewModeOpen,
  } = useStudioStore();
  const status = useAuthStore((state) => state.status);
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams<{
    projectId?: string | Array<string>;
  }>();
  const isMobile = useIsMobile();
  const [selectedDesignId, setSelectedDesignId] = useState<string | null>(null);
  const [selectedDesignName, setSelectedDesignName] = useState<string | null>(null);
  const [selectedDesignTraceId, setSelectedDesignTraceId] = useState<string | null>(null);
  const [designErrorDialogOpen, setDesignErrorDialogOpen] = useState(false);
  const [designErrorMessage, setDesignErrorMessage] = useState(DESIGN_FAILED_MESSAGE);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const [newPackDialogOpen, setNewPackDialogOpen] = useState(false);
  const [projectListDialogOpen, setProjectListDialogOpen] = useState(false);
  const [invalidRouteProjectId, setInvalidRouteProjectId] = useState<string | null>(null);
  const [parts, setParts] = useState<Array<PartNode>>([]);
  const [activePartId, setActivePartId] = useState<string | null>(null);
  const [shortcutHelpOpen, setShortcutHelpOpen] = useState(false);
  const [shortcutHudMessage, setShortcutHudMessage] = useState<string | null>(null);
  const shortcutHudTimerRef = useRef<number | null>(null);
  const workspaceTitleSyncProjectIdsRef = useRef<Set<string>>(new Set());
  const workspaceTitleSyncInFlightRef = useRef<Set<string>>(new Set());
  const assemblyControlsRef = useRef<{
    focusFullModel: () => void;
    previewPart: (id: string) => void;
    clearPartPreview: () => void;
    downloadPartsZip: () => void;
    downloadJavaScript: () => void;
    openPrompt: () => void;
  } | null>(null);
  const { updateProject, invalidateProjects, invalidateProjectDesigns } = useStudioApi();
  const routeProjectId = getSingleRouteParam(params.projectId) ?? null;
  const activeRouteProjectId =
    routeProjectId && routeProjectId !== invalidRouteProjectId ? routeProjectId : null;
  const activeProjectId = activeRouteProjectId ?? projectId ?? '';
  const projectsQuery = useListProjects(
    { limit: 20 },
    {
      query: {
        enabled: status === 'authenticated',
        staleTime: 60_000,
      },
    },
  );
  const designsQuery = useListProjectDesigns(activeProjectId, {
    query: {
      enabled: status === 'authenticated' && Boolean(activeProjectId),
      staleTime: 60_000,
      retry: false,
    },
  });
  const projectItems: Array<ProjectResponseData> =
    projectsQuery.data?.status === 200 ? projectsQuery.data.data.items : [];
  const designs = designsQuery.data?.status === 200 ? designsQuery.data.data.designs : [];
  const projectFileDesign = useMemo(() => getProjectFileDesign(designs), [designs]);
  const workspaceGenerationStatuses = useMemo(
    () => getWorkspaceGenerationStatuses(pendingDesigns),
    [pendingDesigns],
  );
  const projectsLoading = status === 'authenticated' && projectsQuery.isPending;
  const projectsRefreshing =
    status === 'authenticated' && projectsQuery.isFetching && !projectsQuery.isPending;
  const hasSelectedDesignState =
    selectedDesignId !== null ||
    selectedDesignName !== null ||
    selectedDesignTraceId !== null ||
    parts.length > 0 ||
    activePartId !== null ||
    shortcutHelpOpen ||
    shortcutHudMessage !== null;

  const clearSelectedDesign = useCallback(() => {
    if (!hasSelectedDesignState) return;
    setSelectedDesignId(null);
    setSelectedDesignName(null);
    setSelectedDesignTraceId(null);
    setParts([]);
    setActivePartId(null);
    setShortcutHelpOpen(false);
    setShortcutHudMessage(null);
  }, [activePartId, hasSelectedDesignState, parts.length, shortcutHelpOpen, shortcutHudMessage]);

  const handleSelectProject = useCallback(
    (nextProjectId: string, _nextProjectName: string) => {
      clearSelectedDesign();
      setRightPanelMode('create');
      const nextPath = buildStudioPath(nextProjectId);
      if (pathname !== nextPath) {
        router.replace(nextPath);
      }
    },
    [clearSelectedDesign, pathname, router, setRightPanelMode],
  );

  const handleCloseProject = useCallback(() => {
    clearSelectedDesign();
    if (pathname === paths.studio && (projectId || projectName)) {
      clearProject();
    }
    if (pathname !== paths.studio) {
      router.replace(paths.studio);
    }
  }, [clearProject, clearSelectedDesign, pathname, projectId, projectName, router]);

  const applySelectedDesign = useCallback(
    (designId: string, name: string, traceId: string | null = null) => {
      setSelectedDesignId(designId);
      setSelectedDesignName(name);
      setSelectedDesignTraceId(traceId);
      setParts([]);
      setActivePartId(null);
      setShortcutHelpOpen(false);
      setShortcutHudMessage(null);
      setRightPanelMode('create');
    },
    [setRightPanelMode],
  );

  const syncWorkspaceName = useCallback(
    async (targetProjectId: string, title?: string | null) => {
      const nextWorkspaceName = normalizeWorkspaceTitle(title);
      if (!nextWorkspaceName) return false;

      const currentState = useStudioStore.getState();
      const currentProjectName =
        currentState.projects.find((project) => project.id === targetProjectId)?.name ??
        (currentState.projectId === targetProjectId ? currentState.projectName : '');
      if (currentProjectName === nextWorkspaceName) {
        return true;
      }

      const syncKey = `${targetProjectId}:${nextWorkspaceName}`;
      if (workspaceTitleSyncInFlightRef.current.has(syncKey)) {
        return false;
      }
      workspaceTitleSyncInFlightRef.current.add(syncKey);

      try {
        const updatedProject = await updateProject(targetProjectId, nextWorkspaceName);
        const projectSummary = { id: updatedProject.id, name: updatedProject.name };
        const currentProjects = useStudioStore.getState().projects;
        const hasProject = currentProjects.some((project) => project.id === updatedProject.id);
        const nextProjects = hasProject
          ? currentProjects.map((project) =>
              project.id === updatedProject.id ? projectSummary : project,
            )
          : [projectSummary, ...currentProjects];
        const projectsChanged =
          currentProjects.length !== nextProjects.length ||
          currentProjects.some(
            (project, index) =>
              project.id !== nextProjects[index]?.id || project.name !== nextProjects[index]?.name,
          );
        if (projectsChanged) {
          setProjects(nextProjects);
        }
        if (useStudioStore.getState().projectId === updatedProject.id) {
          setProject(updatedProject.id, updatedProject.name);
        }
        invalidateProjects();
        return true;
      } catch (_error) {
        return false;
      } finally {
        workspaceTitleSyncInFlightRef.current.delete(syncKey);
      }
    },
    [invalidateProjects, setProject, setProjects, updateProject],
  );

  useDesignMonitor({
    enabled: status === 'authenticated',
    onInvalidateProjectDesigns: invalidateProjectDesigns,
    onDesignSucceeded: (payload) => {
      if (!payload.designId) return;
      const generatedDesignId = payload.designId;
      workspaceTitleSyncProjectIdsRef.current.add(payload.projectId);

      void (async () => {
        const detailTitle = await getGeneratedDesignTitle(generatedDesignId);
        const generatedTitle = normalizeWorkspaceTitle(detailTitle) ? detailTitle : payload.title;
        return syncWorkspaceName(payload.projectId, generatedTitle);
      })().then((synced) => {
        if (synced) {
          workspaceTitleSyncProjectIdsRef.current.delete(payload.projectId);
        }
      });
    },
    onDesignFailed: (_payload) => {
      setDesignErrorMessage(DESIGN_FAILED_MESSAGE);
      setDesignErrorDialogOpen(true);
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
    if (!projectsQuery.isSuccess) return;
    const nextProjects = projectItems.map((project) => ({ id: project.id, name: project.name }));
    const sameProjects =
      nextProjects.length === projects.length &&
      nextProjects.every(
        (project, index) =>
          projects[index]?.id === project.id && projects[index]?.name === project.name,
      );

    if (!sameProjects) {
      setProjects(nextProjects);
    }

    if (projectItems.length === 0) {
      if (projectId || projectName) {
        clearProject();
      }
      return;
    }
    if (!projectId) {
      return;
    }
    const current = projectItems.find((project) => project.id === projectId) ?? null;
    if (current && projectName !== current.name) {
      setProject(current.id, current.name);
    }
  }, [
    projectsQuery.isSuccess,
    projectItems,
    projects,
    projectId,
    projectName,
    setProject,
    setProjects,
    clearProject,
  ]);

  useEffect(() => {
    if (!invalidRouteProjectId) return;
    if (routeProjectId === invalidRouteProjectId) return;
    setInvalidRouteProjectId(null);
  }, [routeProjectId, invalidRouteProjectId]);

  useEffect(() => {
    if (!activeProjectId) return;
    if (!designsQuery.isError) return;
    if (!isApiNotFoundError(designsQuery.error)) return;
    if (routeProjectId === activeProjectId && invalidRouteProjectId !== routeProjectId) {
      setInvalidRouteProjectId(routeProjectId);
    }
    clearSelectedDesign();
    if (projectId || projectName) {
      clearProject();
    }
    if (pathname !== paths.studio) {
      router.replace(paths.studio);
    }
  }, [
    activeProjectId,
    routeProjectId,
    invalidRouteProjectId,
    pathname,
    designsQuery.isError,
    designsQuery.error,
    projectId,
    projectName,
    clearProject,
    clearSelectedDesign,
    router,
  ]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace(paths.home);
    }
  }, [status, router]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      if (projects.length > 0) {
        setProjects([]);
      }
      clearSelectedDesign();
      if (projectId || projectName) {
        clearProject();
      }
    }
  }, [
    status,
    projects.length,
    projectId,
    projectName,
    setProjects,
    clearProject,
    clearSelectedDesign,
  ]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    if (pathname !== paths.studio) return;
    if (routeProjectId) return;
    if (!projectsQuery.isSuccess) return;
    if (projectItems.length === 0) return;

    const fallbackProject =
      projectItems.find((project) => project.id === projectId) ?? projectItems[0] ?? null;
    if (!fallbackProject) return;

    router.replace(buildStudioPath(fallbackProject.id));
  }, [status, pathname, routeProjectId, projectsQuery.isSuccess, projectItems, projectId, router]);

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

    if (!routeProjectId) {
      if (pathname === paths.studio && (projectId || projectName)) {
        clearProject();
      }
      return;
    }

    if (routeProjectId === invalidRouteProjectId) {
      if (projectId || projectName) {
        clearProject();
      }
      return;
    }

    const matchedProject =
      projects.find((project) => project.id === routeProjectId) ??
      projectItems.find((project) => project.id === routeProjectId) ??
      null;
    const nextProjectName = matchedProject?.name ?? '';

    if (projectId !== routeProjectId || projectName !== nextProjectName) {
      setProject(routeProjectId, nextProjectName);
    }
  }, [
    status,
    pathname,
    routeProjectId,
    invalidRouteProjectId,
    projectId,
    projectName,
    projects,
    projectItems,
    setProject,
    clearProject,
  ]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    if (!routeProjectId) return;
    if (projectId !== routeProjectId) return;
    if (!designsQuery.isSuccess) return;

    if (!projectFileDesign) {
      if (hasSelectedDesignState) {
        clearSelectedDesign();
      }
      return;
    }

    const projectFileDesignName = projectFileDesign.displayName ?? projectName ?? 'Untitled';
    if (selectedDesignId !== projectFileDesign.id || selectedDesignName !== projectFileDesignName) {
      applySelectedDesign(projectFileDesign.id, projectFileDesignName);
    }

    if (workspaceTitleSyncProjectIdsRef.current.has(routeProjectId)) {
      workspaceTitleSyncProjectIdsRef.current.delete(routeProjectId);
      void (async () => {
        const generatedTitle = await getGeneratedDesignTitle(projectFileDesign.id);
        return syncWorkspaceName(routeProjectId, generatedTitle);
      })();
    }
  }, [
    status,
    routeProjectId,
    projectId,
    projectName,
    designsQuery.isSuccess,
    projectFileDesign,
    selectedDesignId,
    selectedDesignName,
    hasSelectedDesignState,
    clearSelectedDesign,
    applySelectedDesign,
    syncWorkspaceName,
  ]);

  const mobileMenuSectionTitleClass =
    'px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground';
  const mobileMenuItemClass =
    'flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground';

  if (status !== 'authenticated') {
    return <div className="min-h-screen bg-[color:var(--background-base)]" />;
  }

  return (
    <div className="h-screen min-h-0 overflow-hidden">
      <ProjectListDialog
        open={projectListDialogOpen}
        onOpenChange={setProjectListDialogOpen}
        onSelectProject={handleSelectProject}
        onDeleteCurrentProject={handleCloseProject}
        onCreateNewPack={() => setNewPackDialogOpen(true)}
      />
      <NewPackDialog open={newPackDialogOpen} onOpenChange={setNewPackDialogOpen} />
      <div className={cn('flex h-full min-h-0 flex-col transition-all')}>
        <StudioHeader
          projectMenuOpen={projectMenuOpen}
          onProjectMenuChange={setProjectMenuOpen}
          onSelectProject={handleSelectProject}
          onCloseProject={handleCloseProject}
          onOpenProjectManager={() => setProjectListDialogOpen(true)}
          projectsLoading={projectsLoading}
          projectsRefreshing={projectsRefreshing}
          hideProjectMenuOnMobile
          projectMenuRightSlot={
            <>
              <Button
                type="button"
                size="sm"
                className="hidden rounded-lg md:inline-flex"
                onClick={() => setNewPackDialogOpen(true)}
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
                          setNewPackDialogOpen(true);
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
                          handleCloseProject();
                          setMobileMenuOpen(false);
                          setMobileChatOpen(false);
                        }}
                        disabled={!projectId}
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
                          setProjectListDialogOpen(true);
                        }}
                      >
                        <FolderOpen className="size-4" />
                        Manage workspaces
                      </button>
                      <div
                        className={cn(mobileMenuSectionTitleClass, 'flex items-center gap-2 pt-2')}
                      >
                        <span>Recent workspace</span>
                        {projectsRefreshing && !projectsLoading ? (
                          <Loader2
                            className="size-3.5 animate-spin"
                            aria-label="Refreshing recent projects"
                          />
                        ) : null}
                      </div>
                      <div className="max-h-64 space-y-1 overflow-y-auto">
                        {projectsLoading && projects.length === 0 ? (
                          <div className="space-y-2 px-3 py-2">
                            {[0, 1, 2].map((index) => (
                              <div key={index} className="flex items-center gap-2">
                                <Skeleton className="h-4 w-4 rounded-sm" />
                                <Skeleton className="h-4 flex-1 rounded-sm" />
                              </div>
                            ))}
                          </div>
                        ) : projects.length === 0 ? (
                          <p className="px-3 py-2 text-sm text-muted-foreground">No workspaces</p>
                        ) : (
                          projects.slice(0, 10).map((project) => {
                            const generationStatus = workspaceGenerationStatuses[project.id];
                            const isFailedGeneration = generationStatus?.kind === 'failed';
                            const isActiveGeneration =
                              generationStatus?.kind === 'queued' ||
                              generationStatus?.kind === 'running';

                            return (
                              <button
                                type="button"
                                key={project.id}
                                className={cn(
                                  mobileMenuItemClass,
                                  projectId === project.id && 'bg-accent text-accent-foreground',
                                )}
                                onClick={() => {
                                  handleSelectProject(project.id, project.name);
                                  setMobileMenuOpen(false);
                                  setMobileChatOpen(false);
                                }}
                              >
                                <span className="min-w-0 flex-1 truncate" title={project.name}>
                                  {formatWorkspaceListName(project.name)}
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
                                {projectId === project.id && (
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
        <main className="flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-visible bg-[color:var(--background-panel)]/80 md:flex-row">
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
                designId={selectedDesignId}
                designName={selectedDesignName}
                traceId={selectedDesignTraceId}
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
                hasSelectedPack={Boolean(selectedDesignId)}
                showJavaScriptDownload={isDevelopmentEnvironment}
                onDownloadZip={downloadCurrentPackZip}
                onDownloadJavaScript={downloadCurrentPackJavaScript}
              />
              {!chatPanelOpen ? (
                <button
                  type="button"
                  className="absolute right-0 top-24 z-30 hidden h-12 w-7 items-center justify-center rounded-l-lg border border-r-0 border-border/80 bg-background/86 text-muted-foreground shadow-lg backdrop-blur transition-all hover:w-9 hover:bg-background hover:text-foreground md:flex"
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
                  className="absolute right-0 top-24 z-30 flex h-12 w-8 items-center justify-center rounded-l-lg border border-r-0 border-border/80 bg-background/88 text-muted-foreground shadow-lg backdrop-blur md:hidden"
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
                    hasSelectedPack={Boolean(selectedDesignId)}
                    showJavaScriptDownload={isDevelopmentEnvironment}
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

        <Dialog open={designErrorDialogOpen} onOpenChange={setDesignErrorDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{DESIGN_FAILED_TITLE}</DialogTitle>
              <DialogDescription>{designErrorMessage}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button onClick={() => setDesignErrorDialogOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
