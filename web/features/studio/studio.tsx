'use client';

import {
  ArrowUpCircle,
  CreditCard,
  File,
  FolderOpen,
  Loader2,
  Menu,
  Palette,
  PlusCircle,
  Settings,
  SlidersHorizontal,
  Sparkles,
  XCircle,
} from 'lucide-react';
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useAuthStore } from '@/features/auth/use-auth-store';
import { viewModes } from '@/mock/studio';
import type { ApiError } from '@/shared/api/fetcher';
import { useListProjectDesigns, useListProjects } from '@/shared/api/generated/client';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Drawer, DrawerContent, DrawerTitle } from '@/shared/components/ui/drawer';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/shared/components/ui/sheet';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { paths } from '@/shared/constants/paths';
import { useIsMobile } from '@/shared/hooks/use-mobile';
import { cn } from '@/shared/lib/utils';
import { ActionSidebar } from './components/action-sidebar';
import { ChatPanel } from './components/chat-panel';
import { NewDesignDialog } from './components/dialogs/new-design-dialog';
import { NewProjectDialog } from './components/dialogs/new-project-dialog';
import { ProjectListDialog } from './components/dialogs/project-list-dialog';
import { AppearancePanel } from './components/appearance-panel';
import { EditPanel } from './components/edit-panel';
import { ProjectPanel } from './components/project-panel';
import { ProjectSidebar } from './components/project-sidebar';
import { RightPanel } from './components/right-panel';
import { StudioHeader } from './components/studio-header';
import type {
  NodeSelection,
  ResetTransformTarget,
  SelectedNode,
  TransformAxis,
} from './components/three-viewer';
import {
  MOVE_STEP_OPTIONS,
  ROTATE_STEP_OPTIONS,
  SCALE_STEP_OPTIONS,
} from './components/transform-controls';
import { ViewerPanel } from './components/viewer-panel';
import { useDesignMonitor } from './hooks/use-design-monitor';
import { useStudioApi } from './hooks/use-studio-api';
import { useStudioPersist } from './hooks/use-studio-persist';
import { buildStudioPath, getStudioDesignId } from './lib/paths';
import type { StructureTreeNode } from './lib/structure-tree';
import { DESIGN_FAILED_MESSAGE, DESIGN_FAILED_TITLE } from './messages';
import { useStudioStore } from './stores/use-studio-store';
import type { RightPanelMode } from './types';
import type { ProjectResponseData } from '@/shared/api/generated/schemas';

const isApiNotFoundError = (error: unknown): error is ApiError<{ error?: string }> => {
  if (!error || typeof error !== 'object') return false;
  if (!('status' in error)) return false;
  return (error as { status?: unknown }).status === 404;
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

const cyclePreset = (values: ReadonlyArray<number>, current: number, direction: -1 | 1) => {
  const currentIndex = Math.max(values.indexOf(current), 0);
  const nextIndex = Math.min(Math.max(currentIndex + direction, 0), values.length - 1);
  return values[nextIndex] ?? current;
};

const getSingleRouteParam = (value: string | Array<string> | undefined) =>
  Array.isArray(value) ? value[0] : value;

const formatSelectionSummary = (
  selectedNodes: Array<SelectedNode>,
  activeSelectedNode: SelectedNode | null,
) => {
  if (selectedNodes.length === 0) return 'No selection';
  if (selectedNodes.length === 1 && activeSelectedNode) return activeSelectedNode.name;
  return `${selectedNodes.length} nodes`;
};

export function StudioPage() {
  useStudioPersist();
  const {
    projectId,
    projectName,
    projects,
    setProject,
    setProjects,
    clearProject,
    addProject,
    chatPanelOpen,
    currentView,
    newDesignModalOpen,
    newDesignName,
    newProjectModalOpen,
    newProjectName,
    projectMenuOpen,
    projectPanelOpen,
    rightPanelMode,
    viewModeOpen,
    toggleChatPanel,
    toggleProjectPanel,
    setRightPanelMode,
    setCurrentView,
    setNewDesignModalOpen,
    setNewDesignName,
    setNewProjectModalOpen,
    setNewProjectName,
    setProjectMenuOpen,
    setViewModeOpen,
  } = useStudioStore();
  const status = useAuthStore((state) => state.status);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
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
  const [mobileProjectOpen, setMobileProjectOpen] = useState(false);
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const [mobileEditOpen, setMobileEditOpen] = useState(false);
  const [projectListDialogOpen, setProjectListDialogOpen] = useState(false);
  const [invalidRouteProjectId, setInvalidRouteProjectId] = useState<string | null>(null);
  const [structureTree, setStructureTree] = useState<Array<StructureTreeNode>>([]);
  const [selectedNodes, setSelectedNodes] = useState<Array<SelectedNode>>([]);
  const [activeSelectedNodeId, setActiveSelectedNodeId] = useState<string | null>(null);
  const [activeTransformAxis, setActiveTransformAxis] = useState<TransformAxis>('x');
  const [moveStep, setMoveStep] = useState<number>(MOVE_STEP_OPTIONS[1]);
  const [rotateStep, setRotateStep] = useState<number>(ROTATE_STEP_OPTIONS[1]);
  const [scaleStep, setScaleStep] = useState<number>(SCALE_STEP_OPTIONS[1]);
  const [shortcutHelpOpen, setShortcutHelpOpen] = useState(false);
  const [shortcutHudMessage, setShortcutHudMessage] = useState<string | null>(null);
  const shortcutHudTimerRef = useRef<number | null>(null);
  const assemblyControlsRef = useRef<{
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
  } | null>(null);
  const { createProject, createDesign, invalidateProjects, invalidateProjectDesigns } =
    useStudioApi();
  const routeProjectId = getSingleRouteParam(params.projectId) ?? null;
  const routeDesignId = getStudioDesignId(searchParams);
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
  const projectsLoading = status === 'authenticated' && projectsQuery.isPending;
  const projectsRefreshing =
    status === 'authenticated' && projectsQuery.isFetching && !projectsQuery.isPending;
  const designsLoading =
    status === 'authenticated' && Boolean(activeProjectId) && designsQuery.isPending;
  const designsRefreshing =
    status === 'authenticated' &&
    Boolean(activeProjectId) &&
    designsQuery.isFetching &&
    !designsQuery.isPending;
  const currentStudioPath = buildStudioPath(routeProjectId, routeDesignId);
  const selectedNodeIds = useMemo(
    () => new Set(selectedNodes.map((node) => node.id)),
    [selectedNodes],
  );
  const activeSelectedNode = useMemo(
    () =>
      selectedNodes.find((node) => node.id === activeSelectedNodeId) ??
      selectedNodes[selectedNodes.length - 1] ??
      null,
    [activeSelectedNodeId, selectedNodes],
  );
  const hasSelectedDesignState =
    selectedDesignId !== null ||
    selectedDesignName !== null ||
    selectedDesignTraceId !== null ||
    structureTree.length > 0 ||
    selectedNodes.length > 0 ||
    activeTransformAxis !== 'x' ||
    moveStep !== MOVE_STEP_OPTIONS[1] ||
    rotateStep !== ROTATE_STEP_OPTIONS[1] ||
    scaleStep !== SCALE_STEP_OPTIONS[1] ||
    shortcutHelpOpen ||
    shortcutHudMessage !== null;

  const clearSelectedDesign = useCallback(() => {
    if (!hasSelectedDesignState) return;
    setSelectedDesignId(null);
    setSelectedDesignName(null);
    setSelectedDesignTraceId(null);
    setStructureTree([]);
    setSelectedNodes([]);
    setActiveSelectedNodeId(null);
    setActiveTransformAxis('x');
    setMoveStep(MOVE_STEP_OPTIONS[1]);
    setRotateStep(ROTATE_STEP_OPTIONS[1]);
    setScaleStep(SCALE_STEP_OPTIONS[1]);
    setShortcutHelpOpen(false);
    setShortcutHudMessage(null);
  }, [
    activeTransformAxis,
    hasSelectedDesignState,
    moveStep,
    rotateStep,
    scaleStep,
    selectedNodes.length,
    shortcutHelpOpen,
    shortcutHudMessage,
    structureTree.length,
  ]);

  const handleSelectProject = useCallback(
    (nextProjectId: string, _nextProjectName: string) => {
      const nextPath = buildStudioPath(nextProjectId);
      if (pathname !== nextPath) {
        router.replace(nextPath);
      }
    },
    [pathname, router],
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
      setStructureTree([]);
      setSelectedNodes([]);
      setActiveSelectedNodeId(null);
      setActiveTransformAxis('x');
      setMoveStep(MOVE_STEP_OPTIONS[1]);
      setRotateStep(ROTATE_STEP_OPTIONS[1]);
      setScaleStep(SCALE_STEP_OPTIONS[1]);
      setShortcutHelpOpen(false);
      setShortcutHudMessage(null);
      setRightPanelMode('edit');
    },
    [setRightPanelMode],
  );

  const handleSelectDesign = useCallback(
    (designId: string, _name: string) => {
      if (!projectId) return;
      const nextPath = buildStudioPath(projectId, designId);
      if (currentStudioPath !== nextPath) {
        router.replace(nextPath);
      }
    },
    [currentStudioPath, projectId, router],
  );

  const handleMobileSelectDesign = (designId: string, name: string) => {
    handleSelectDesign(designId, name);
    setMobileProjectOpen(false);
  };

  useDesignMonitor({
    enabled: status === 'authenticated',
    onInvalidateProjectDesigns: invalidateProjectDesigns,
    onDesignSucceeded: (payload) => {
      if (!payload.designId) return;
    },
    onDesignFailed: (_payload) => {
      setDesignErrorMessage(DESIGN_FAILED_MESSAGE);
      setDesignErrorDialogOpen(true);
    },
  });

  const handleDeleteDesign = (designId: string) => {
    if (selectedDesignId === designId) {
      clearSelectedDesign();
    }
  };

  const handleSelectionChange = useCallback((selection: NodeSelection) => {
    setSelectedNodes(selection.selectedNodes);
    setActiveSelectedNodeId(selection.activeNodeId);
  }, []);

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

  useEffect(() => {
    return () => {
      if (shortcutHudTimerRef.current) {
        window.clearTimeout(shortcutHudTimerRef.current);
      }
    };
  }, []);

  const handleMoveStepChange = useCallback(
    (step: number) => {
      setMoveStep(step);
      showShortcutHud(`Move step ${step}`);
    },
    [showShortcutHud],
  );

  const handleRotateStepChange = useCallback(
    (step: number) => {
      setRotateStep(step);
      showShortcutHud(`Rotate step ${step}deg`);
    },
    [showShortcutHud],
  );

  const handleScaleStepChange = useCallback(
    (step: number) => {
      setScaleStep(step);
      showShortcutHud(`Scale step ${step}`);
    },
    [showShortcutHud],
  );

  const handleShortcutScopeKeyDownCapture = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (!(event.target instanceof HTMLElement)) return;
      if (event.target.closest(SHORTCUT_BLOCK_SELECTOR)) return;

      const isTreeTarget = Boolean(event.target.closest('[data-structure-tree]'));
      if (isTreeTarget) {
        return;
      }

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
        if (selectedNodes.length > 0) {
          event.preventDefault();
          assemblyControlsRef.current?.clearSelection();
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
        if (activeSelectedNode) {
          assemblyControlsRef.current?.focusStructureNode(activeSelectedNode.id);
          if (!event.repeat) {
            showShortcutHud(`Framed ${formatSelectionSummary(selectedNodes, activeSelectedNode)}`);
          }
          return;
        }
        const rootNodeId = structureTree[0]?.id;
        if (rootNodeId) {
          assemblyControlsRef.current?.focusStructureNode(rootNodeId);
          if (!event.repeat) {
            showShortcutHud('Framed full model');
          }
          return;
        }
        assemblyControlsRef.current?.focusFullModel();
        return;
      }

      if (rightPanelMode === 'create') {
        return;
      }

      if (metaOrCtrl && !event.shiftKey && !event.altKey && lowerKey === 's') {
        event.preventDefault();
        void assemblyControlsRef.current?.saveEditedModel();
        return;
      }

      if (metaOrCtrl && event.shiftKey && !event.altKey && lowerKey === 'r') {
        event.preventDefault();
        void assemblyControlsRef.current?.revertEditedModel();
        return;
      }

      if (!event.shiftKey && !event.altKey && !metaOrCtrl && ['x', 'y', 'z'].includes(lowerKey)) {
        event.preventDefault();
        const nextAxis = lowerKey as TransformAxis;
        setActiveTransformAxis(nextAxis);
        showShortcutHud(`Axis ${nextAxis.toUpperCase()}`);
        return;
      }

      if (!event.shiftKey && !event.altKey && !metaOrCtrl && lowerKey === 'a') {
        event.preventDefault();
        handleMoveStepChange(cyclePreset(MOVE_STEP_OPTIONS, moveStep, -1));
        return;
      }

      if (!event.shiftKey && !event.altKey && !metaOrCtrl && lowerKey === 'd') {
        event.preventDefault();
        handleMoveStepChange(cyclePreset(MOVE_STEP_OPTIONS, moveStep, 1));
        return;
      }

      if (!event.shiftKey && !event.altKey && !metaOrCtrl && lowerKey === 'q') {
        event.preventDefault();
        handleRotateStepChange(cyclePreset(ROTATE_STEP_OPTIONS, rotateStep, -1));
        return;
      }

      if (!event.shiftKey && !event.altKey && !metaOrCtrl && lowerKey === 'e') {
        event.preventDefault();
        handleRotateStepChange(cyclePreset(ROTATE_STEP_OPTIONS, rotateStep, 1));
        return;
      }

      if (!activeSelectedNode) {
        return;
      }

      if (!metaOrCtrl && !event.shiftKey && !event.altKey && lowerKey === 'h') {
        event.preventDefault();
        const allSelectedHidden = selectedNodes.every((node) => node.hidden);
        if (allSelectedHidden) {
          selectedNodes.forEach((node) => {
            assemblyControlsRef.current?.restoreNode(node.id);
          });
          showShortcutHud(`Restored ${formatSelectionSummary(selectedNodes, activeSelectedNode)}`);
          return;
        }
        assemblyControlsRef.current?.hideSelectedNode();
        showShortcutHud(`Hid ${formatSelectionSummary(selectedNodes, activeSelectedNode)}`);
        return;
      }

      if (!metaOrCtrl && lowerKey === 'r') {
        event.preventDefault();
        const target = event.altKey ? 'position' : event.shiftKey ? 'rotation' : 'all';
        assemblyControlsRef.current?.resetNode(target);
        if (!event.repeat) {
          const label =
            target === 'all'
              ? 'Reset transforms'
              : target === 'rotation'
                ? 'Reset rotation'
                : 'Reset position';
          showShortcutHud(label);
        }
        return;
      }

      if (
        !metaOrCtrl &&
        !event.altKey &&
        (event.key === 'ArrowLeft' || event.key === 'ArrowRight')
      ) {
        event.preventDefault();
        const direction = event.key === 'ArrowLeft' ? -1 : 1;
        if (event.shiftKey) {
          assemblyControlsRef.current?.rotateNode(
            activeTransformAxis,
            ((rotateStep * Math.PI) / 180) * direction,
          );
          if (!event.repeat) {
            showShortcutHud(
              `Rotate ${activeTransformAxis.toUpperCase()} ${direction > 0 ? '+' : '-'}${rotateStep}deg`,
            );
          }
          return;
        }
        assemblyControlsRef.current?.nudgeNode(activeTransformAxis, moveStep * direction);
        if (!event.repeat) {
          showShortcutHud(
            `Move ${activeTransformAxis.toUpperCase()} ${direction > 0 ? '+' : '-'}${moveStep}`,
          );
        }
      }
    },
    [
      activeTransformAxis,
      handleMoveStepChange,
      handleRotateStepChange,
      moveStep,
      rightPanelMode,
      rotateStep,
      activeSelectedNode,
      selectedNodes,
      setCurrentView,
      shortcutHelpOpen,
      showShortcutHud,
      structureTree,
    ],
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
      setMobileProjectOpen(false);
      setMobileChatOpen(false);
      setMobileEditOpen(false);
    }
  }, [isMobile]);

  const handleNewProjectChange = (open: boolean) => {
    setNewProjectModalOpen(open);
    if (!open) {
      setNewProjectName('');
    }
  };

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
    if (routeDesignId) return;
    if (hasSelectedDesignState) {
      clearSelectedDesign();
    }
  }, [
    status,
    pathname,
    routeProjectId,
    routeDesignId,
    projectId,
    selectedDesignId,
    hasSelectedDesignState,
    clearSelectedDesign,
  ]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    if (!routeProjectId || !routeDesignId) return;
    if (projectId !== routeProjectId) return;
    if (!designsQuery.isSuccess) return;

    const routeDesign = designs.find((design) => design.id === routeDesignId) ?? null;
    if (!routeDesign) {
      if (hasSelectedDesignState) {
        clearSelectedDesign();
      }
      return;
    }

    const routeDesignName = routeDesign.displayName ?? 'Untitled';
    if (selectedDesignId !== routeDesign.id || selectedDesignName !== routeDesignName) {
      applySelectedDesign(routeDesign.id, routeDesignName);
    }
  }, [
    status,
    routeProjectId,
    routeDesignId,
    projectId,
    designsQuery.isSuccess,
    designs,
    hasSelectedDesignState,
    clearSelectedDesign,
    applySelectedDesign,
  ]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    if (routeProjectId && projectId !== routeProjectId) return;

    if (!routeDesignId) return;
    if (!designsQuery.isSuccess) return;

    const routeDesignExists = designs.some((design) => design.id === routeDesignId);
    if (!routeDesignExists) {
      const projectPath = buildStudioPath(routeProjectId ?? projectId);
      if (currentStudioPath !== projectPath) {
        router.replace(projectPath);
      }
    }
  }, [
    status,
    routeProjectId,
    routeDesignId,
    projectId,
    designsQuery.isSuccess,
    designs,
    currentStudioPath,
    router,
  ]);

  const handleNewDesignChange = (open: boolean) => {
    setNewDesignModalOpen(open);
    if (!open) {
      setNewDesignName('');
    }
  };

  const handleSelectRightPanelMode = (mode: RightPanelMode) => {
    if (rightPanelMode === mode) {
      toggleChatPanel();
      return;
    }
    setRightPanelMode(mode);
    if (!chatPanelOpen) {
      toggleChatPanel();
    }
  };

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
        onOpenNewProject={() => {
          setProjectListDialogOpen(false);
          setNewProjectModalOpen(true);
        }}
      />
      <div className={cn('flex h-full min-h-0 flex-col transition-all')}>
        <StudioHeader
          projectMenuOpen={projectMenuOpen}
          onProjectMenuChange={setProjectMenuOpen}
          onOpenNewProject={() => setNewProjectModalOpen(true)}
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
                      Navigate between design tools, project lists, settings, and billing pages.
                    </SheetDescription>
                  </div>
                  <div className="border-b border-border px-4 py-4 pr-12">
                    <h2 className="text-lg font-semibold leading-tight">Ascoor</h2>
                  </div>

                  <div className="flex-1 space-y-4 overflow-y-auto px-2 py-3">
                    <section className="space-y-1">
                      <p className={mobileMenuSectionTitleClass}>Design</p>
                      <button
                        type="button"
                        className={mobileMenuItemClass}
                        onClick={() => {
                          setMobileMenuOpen(false);
                          setMobileChatOpen(false);
                          setMobileEditOpen(false);
                          setMobileProjectOpen(true);
                        }}
                      >
                        <File className="size-4" />
                        Designs
                      </button>
                      <button
                        type="button"
                        className={mobileMenuItemClass}
                        onClick={() => {
                          setMobileMenuOpen(false);
                          setMobileProjectOpen(false);
                          setMobileEditOpen(false);
                          setRightPanelMode('create');
                          setMobileChatOpen(true);
                        }}
                      >
                        <Sparkles className="size-4" />
                        Create
                      </button>
                      <button
                        type="button"
                        className={mobileMenuItemClass}
                        onClick={() => {
                          setMobileMenuOpen(false);
                          setMobileProjectOpen(false);
                          setMobileChatOpen(false);
                          setMobileEditOpen(true);
                          setRightPanelMode('edit');
                        }}
                      >
                        <SlidersHorizontal className="size-4" />
                        Edit
                      </button>
                      <button
                        type="button"
                        className={mobileMenuItemClass}
                        onClick={() => {
                          setMobileMenuOpen(false);
                          setMobileProjectOpen(false);
                          setMobileChatOpen(false);
                          setMobileEditOpen(true);
                          setRightPanelMode('appearance');
                        }}
                      >
                        <Palette className="size-4" />
                        Appearance
                      </button>
                    </section>

                    <section className="space-y-1 border-t border-border pt-3">
                      <p className={mobileMenuSectionTitleClass}>Project</p>
                      <button
                        type="button"
                        className={mobileMenuItemClass}
                        onClick={() => {
                          setMobileMenuOpen(false);
                          setMobileProjectOpen(false);
                          setMobileChatOpen(false);
                          setMobileEditOpen(false);
                          setNewProjectModalOpen(true);
                        }}
                      >
                        <PlusCircle className="size-4" />
                        New project
                      </button>
                      <button
                        type="button"
                        className={mobileMenuItemClass}
                        onClick={() => {
                          handleCloseProject();
                          setMobileMenuOpen(false);
                          setMobileProjectOpen(false);
                          setMobileChatOpen(false);
                          setMobileEditOpen(false);
                        }}
                        disabled={!projectId}
                      >
                        <XCircle className="size-4" />
                        Close Project
                      </button>
                      <button
                        type="button"
                        className={mobileMenuItemClass}
                        onClick={() => {
                          setMobileMenuOpen(false);
                          setMobileProjectOpen(false);
                          setMobileChatOpen(false);
                          setMobileEditOpen(false);
                          setProjectListDialogOpen(true);
                        }}
                      >
                        <FolderOpen className="size-4" />
                        Manage projects
                      </button>
                      <div
                        className={cn(mobileMenuSectionTitleClass, 'flex items-center gap-2 pt-2')}
                      >
                        <span>Recent project</span>
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
                          <p className="px-3 py-2 text-sm text-muted-foreground">No projects</p>
                        ) : (
                          projects.slice(0, 10).map((project) => (
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
                                setMobileProjectOpen(false);
                                setMobileChatOpen(false);
                                setMobileEditOpen(false);
                              }}
                            >
                              <File className="size-4" />
                              <span className="truncate">{project.name}</span>
                              {projectId === project.id && (
                                <span className="ml-auto text-xs text-primary">Current</span>
                              )}
                            </button>
                          ))
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
                          setMobileProjectOpen(false);
                          setMobileChatOpen(false);
                          setMobileEditOpen(false);
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
                          setMobileProjectOpen(false);
                          setMobileChatOpen(false);
                          setMobileEditOpen(false);
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
                          setMobileProjectOpen(false);
                          setMobileChatOpen(false);
                          setMobileEditOpen(false);
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
        />
        <main className="flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-visible bg-[color:var(--background-panel)]/80 md:flex-row">
          <ProjectSidebar open={projectPanelOpen} onToggle={toggleProjectPanel} />
          <ProjectPanel
            designs={designs}
            loading={designsLoading}
            refreshing={designsRefreshing}
            open={projectPanelOpen}
            onToggle={toggleProjectPanel}
            onOpenNewDesign={() => setNewDesignModalOpen(true)}
            onSelectDesign={handleSelectDesign}
            onDeleteDesign={handleDeleteDesign}
            selectedDesignId={selectedDesignId}
          />

          <section className="flex min-h-0 flex-1 min-w-0 overflow-hidden">
            <div
              className="flex min-h-0 flex-1 min-w-0"
              onKeyDownCapture={handleShortcutScopeKeyDownCapture}
            >
              <ViewerPanel
                currentView={currentView}
                viewModeOpen={viewModeOpen}
                onChangeView={setCurrentView}
                onViewModeOpenChange={setViewModeOpen}
                interactionMode={rightPanelMode}
                onStructureTreeChange={setStructureTree}
                onAssemblyControlsReady={(controls) => {
                  assemblyControlsRef.current = controls;
                }}
                onSelectionChange={handleSelectionChange}
                designId={selectedDesignId}
                designName={selectedDesignName}
                traceId={selectedDesignTraceId}
                activeTransformAxis={activeTransformAxis}
                moveStep={moveStep}
                rotateStep={rotateStep}
                shortcutHelpOpen={shortcutHelpOpen}
                onShortcutHelpOpenChange={setShortcutHelpOpen}
                shortcutHudMessage={shortcutHudMessage}
              />
              <RightPanel
                open={chatPanelOpen}
                mode={rightPanelMode}
                projectId={projectId}
                structureTree={structureTree}
                selectedNodes={selectedNodes}
                activeSelectedNode={activeSelectedNode}
                activeSelectedNodeId={activeSelectedNodeId}
                selectedNodeIds={selectedNodeIds}
                moveStep={moveStep}
                onMoveStepChange={handleMoveStepChange}
                rotateStep={rotateStep}
                onRotateStepChange={handleRotateStepChange}
                scaleStep={scaleStep}
                onScaleStepChange={handleScaleStepChange}
                onFocusStructureNode={(id, options) =>
                  assemblyControlsRef.current?.focusStructureNode(id, options)
                }
                onSetStructureNodeHidden={(id, hidden) =>
                  assemblyControlsRef.current?.setStructureNodeHidden(id, hidden)
                }
                onNudgeNode={(axis, delta) => assemblyControlsRef.current?.nudgeNode(axis, delta)}
                onRotateNode={(axis, deltaRadians) =>
                  assemblyControlsRef.current?.rotateNode(axis, deltaRadians)
                }
                onSetNodeRotation={(axis, radians) =>
                  assemblyControlsRef.current?.setNodeRotation(axis, radians)
                }
                onNudgeNodeScale={(axis, delta) =>
                  assemblyControlsRef.current?.nudgeNodeScale(axis, delta)
                }
                onSetNodeScale={(axis, value) =>
                  assemblyControlsRef.current?.setNodeScale(axis, value)
                }
                onResetNode={(target) => assemblyControlsRef.current?.resetNode(target)}
                onHideSelectedNode={() => assemblyControlsRef.current?.hideSelectedNode()}
                onRestoreNode={(id) => assemblyControlsRef.current?.restoreNode(id)}
                onSetSelectedNodeColor={(hex) =>
                  assemblyControlsRef.current?.setSelectedNodeColor(hex)
                }
                onResetSelectedNodeColor={() =>
                  assemblyControlsRef.current?.resetSelectedNodeColor()
                }
                onSetSelectedNodeEmissiveColor={(hex) =>
                  assemblyControlsRef.current?.setSelectedNodeEmissiveColor(hex)
                }
                onSetSelectedNodeEmissiveIntensity={(value) =>
                  assemblyControlsRef.current?.setSelectedNodeEmissiveIntensity(value)
                }
                onResetSelectedNodeEmissive={() =>
                  assemblyControlsRef.current?.resetSelectedNodeEmissive()
                }
                onSetSelectedNodeRoughness={(value) =>
                  assemblyControlsRef.current?.setSelectedNodeRoughness(value)
                }
                onResetSelectedNodeRoughness={() =>
                  assemblyControlsRef.current?.resetSelectedNodeRoughness()
                }
                onToggle={toggleChatPanel}
              />
            </div>

            <ActionSidebar
              rightPanelOpen={chatPanelOpen}
              activeMode={rightPanelMode}
              onSelectMode={handleSelectRightPanelMode}
            />
          </section>
        </main>

        <Sheet
          open={mobileProjectOpen}
          onOpenChange={(open) => {
            setMobileProjectOpen(open);
            if (open) {
              setMobileChatOpen(false);
              setMobileEditOpen(false);
            }
          }}
        >
          <SheetContent side="left" className="w-[90vw] max-w-sm p-0 [&>button]:hidden">
            <div className="sr-only">
              <SheetTitle>Designs panel</SheetTitle>
              <SheetDescription>
                Browse designs in the current project and open design actions.
              </SheetDescription>
            </div>
            <ProjectPanel
              designs={designs}
              loading={designsLoading}
              refreshing={designsRefreshing}
              variant="mobile"
              open={mobileProjectOpen}
              onToggle={() => setMobileProjectOpen(false)}
              onOpenNewDesign={() => setNewDesignModalOpen(true)}
              onSelectDesign={handleMobileSelectDesign}
              onDeleteDesign={handleDeleteDesign}
              selectedDesignId={selectedDesignId}
            />
          </SheetContent>
        </Sheet>

        <Sheet
          open={mobileChatOpen}
          onOpenChange={(open) => {
            setMobileChatOpen(open);
            if (open) {
              setMobileProjectOpen(false);
              setMobileEditOpen(false);
              setRightPanelMode('create');
            }
          }}
        >
          <SheetContent side="right" className="w-[90vw] max-w-sm p-0 [&>button]:hidden">
            <div className="sr-only">
              <SheetTitle>Create panel</SheetTitle>
              <SheetDescription>
                Enter a prompt to generate a new design for the current project.
              </SheetDescription>
            </div>
            <ChatPanel
              variant="mobile"
              open={mobileChatOpen}
              onToggle={() => setMobileChatOpen(false)}
            />
          </SheetContent>
        </Sheet>
        <Drawer
          open={mobileEditOpen}
          modal={false}
          direction="bottom"
          onOpenChange={(open) => {
            setMobileEditOpen(open);
            if (open) {
              setMobileProjectOpen(false);
              setMobileChatOpen(false);
              if (rightPanelMode === 'create') {
                setRightPanelMode('edit');
              }
            }
          }}
        >
          <DrawerContent showOverlay={false} className="h-[72svh] max-h-[72svh] p-0">
            <DrawerTitle className="sr-only">
              {rightPanelMode === 'appearance' ? 'Appearance panel' : 'Edit panel'}
            </DrawerTitle>
            {rightPanelMode === 'appearance' ? (
              <AppearancePanel
                variant="mobile"
                open={mobileEditOpen}
                structureTree={structureTree}
                selectedNodes={selectedNodes}
                activeSelectedNode={activeSelectedNode}
                activeSelectedNodeId={activeSelectedNodeId}
                selectedNodeIds={selectedNodeIds}
                onFocusStructureNode={(id, options) =>
                  assemblyControlsRef.current?.focusStructureNode(id, options)
                }
                onSetStructureNodeHidden={(id, hidden) =>
                  assemblyControlsRef.current?.setStructureNodeHidden(id, hidden)
                }
                onSetSelectedNodeColor={(hex) =>
                  assemblyControlsRef.current?.setSelectedNodeColor(hex)
                }
                onResetSelectedNodeColor={() =>
                  assemblyControlsRef.current?.resetSelectedNodeColor()
                }
                onSetSelectedNodeEmissiveColor={(hex) =>
                  assemblyControlsRef.current?.setSelectedNodeEmissiveColor(hex)
                }
                onSetSelectedNodeEmissiveIntensity={(value) =>
                  assemblyControlsRef.current?.setSelectedNodeEmissiveIntensity(value)
                }
                onResetSelectedNodeEmissive={() =>
                  assemblyControlsRef.current?.resetSelectedNodeEmissive()
                }
                onSetSelectedNodeRoughness={(value) =>
                  assemblyControlsRef.current?.setSelectedNodeRoughness(value)
                }
                onResetSelectedNodeRoughness={() =>
                  assemblyControlsRef.current?.resetSelectedNodeRoughness()
                }
                onToggle={() => setMobileEditOpen(false)}
              />
            ) : (
              <EditPanel
                variant="mobile"
                open={mobileEditOpen}
                structureTree={structureTree}
                selectedNodes={selectedNodes}
                activeSelectedNode={activeSelectedNode}
                activeSelectedNodeId={activeSelectedNodeId}
                selectedNodeIds={selectedNodeIds}
                moveStep={moveStep}
                onMoveStepChange={handleMoveStepChange}
                rotateStep={rotateStep}
                onRotateStepChange={handleRotateStepChange}
                scaleStep={scaleStep}
                onScaleStepChange={handleScaleStepChange}
                onFocusStructureNode={(id, options) =>
                  assemblyControlsRef.current?.focusStructureNode(id, options)
                }
                onSetStructureNodeHidden={(id, hidden) =>
                  assemblyControlsRef.current?.setStructureNodeHidden(id, hidden)
                }
                onNudgeNode={(axis, delta) => assemblyControlsRef.current?.nudgeNode(axis, delta)}
                onRotateNode={(axis, deltaRadians) =>
                  assemblyControlsRef.current?.rotateNode(axis, deltaRadians)
                }
                onSetNodeRotation={(axis, radians) =>
                  assemblyControlsRef.current?.setNodeRotation(axis, radians)
                }
                onNudgeNodeScale={(axis, delta) =>
                  assemblyControlsRef.current?.nudgeNodeScale(axis, delta)
                }
                onSetNodeScale={(axis, value) =>
                  assemblyControlsRef.current?.setNodeScale(axis, value)
                }
                onResetNode={(target) => assemblyControlsRef.current?.resetNode(target)}
                onHideSelectedNode={() => assemblyControlsRef.current?.hideSelectedNode()}
                onRestoreNode={(id) => assemblyControlsRef.current?.restoreNode(id)}
                onToggle={() => setMobileEditOpen(false)}
              />
            )}
          </DrawerContent>
        </Drawer>

        <NewProjectDialog
          open={newProjectModalOpen}
          projectName={newProjectName}
          onOpenChange={handleNewProjectChange}
          onChangeName={setNewProjectName}
          onCreate={async () => {
            if (!newProjectName.trim()) return;
            try {
              const created = await createProject(newProjectName);
              addProject({ id: created.id, name: created.name });
              handleSelectProject(created.id, created.name);
              invalidateProjects();
              invalidateProjectDesigns(created.id);
              handleNewProjectChange(false);
              toast.success('Project created.');
            } catch (_error) {
              toast.error('Failed to create project.');
            }
          }}
        />

        <NewDesignDialog
          open={newDesignModalOpen}
          designName={newDesignName}
          onOpenChange={handleNewDesignChange}
          onChangeName={setNewDesignName}
          onCreate={async () => {
            if (!projectId || !newDesignName.trim()) return;
            try {
              const created = await createDesign({
                projectId,
                displayName: newDesignName,
              });
              toast.success('Design created.');
              const nextPath = buildStudioPath(projectId, created.id);
              if (currentStudioPath !== nextPath) {
                router.replace(nextPath);
              }
              invalidateProjectDesigns(projectId);
              handleNewDesignChange(false);
            } catch (_error) {
              toast.error('Failed to create design.');
            }
          }}
        />
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
