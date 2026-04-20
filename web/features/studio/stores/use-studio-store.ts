import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { viewModes } from '@/mock/studio';
import { useAuthStore } from '@/features/auth/use-auth-store';
import type { RightPanelMode, ViewMode } from '../types';

export type PendingDesignStatus = 'queued' | 'running' | 'failed';

export type PendingDesign = {
  designId: string;
  projectId: string;
  traceId?: string | null;
  promptPreview: string;
  userPrompt?: string;
  status: PendingDesignStatus;
  createdAt: string;
  updatedAt: string;
  errorMessage?: string | null;
  errorCode?: string | null;
};

type StudioState = {
  projectId: string | null;
  projectName: string;
  projects: Array<{ id: string; name: string }>;
  pendingDesigns: Array<PendingDesign>;
  projectMenuOpen: boolean;
  chatPanelOpen: boolean;
  rightPanelMode: RightPanelMode;
  errorConsoleOpen: boolean;
  highlightedLine: number | null;
  currentView: ViewMode;
  viewModeOpen: boolean;
  codeModalOpen: boolean;
  setProjectMenuOpen: (open: boolean) => void;
  setProject: (id: string, name: string) => void;
  setProjects: (projects: Array<{ id: string; name: string }>) => void;
  clearProject: () => void;
  addProject: (project: { id: string; name: string }) => void;
  addPendingDesign: (design: {
    designId: string;
    projectId: string;
    traceId?: string | null;
    promptPreview?: string;
    userPrompt?: string;
  }) => void;
  updatePendingDesign: (
    designId: string,
    patch: Partial<Omit<PendingDesign, 'designId' | 'projectId' | 'createdAt'>>,
  ) => void;
  pruneExpiredPendingDesigns: () => void;
  removePendingDesign: (designId: string) => void;
  setChatPanelOpen: (open: boolean) => void;
  setRightPanelMode: (mode: RightPanelMode) => void;
  setErrorConsoleOpen: (open: boolean) => void;
  setHighlightedLine: (line: number | null) => void;
  setCurrentView: (view: ViewMode) => void;
  setViewModeOpen: (open: boolean) => void;
  setCodeModalOpen: (open: boolean) => void;
  toggleChatPanel: () => void;
  toggleProjectMenu: () => void;
  toggleViewMode: () => void;
  toggleCodeModal: () => void;
};

type StudioPersistState = Pick<StudioState, 'projectId' | 'projectName' | 'pendingDesigns'>;
const PENDING_DESIGN_TTL_MS = 6 * 60 * 60 * 1000;

const normalizePromptPreview = (value?: string) => {
  const normalized = (value ?? '').replace(/\s+/g, ' ').trim();
  if (!normalized) return 'Generating model...';
  return normalized.length > 80 ? `${normalized.slice(0, 80)}...` : normalized;
};

const getPendingDesignTimestamp = (entry: PendingDesign) => {
  const updatedAt = Date.parse(entry.updatedAt);
  if (Number.isFinite(updatedAt)) return updatedAt;
  const createdAt = Date.parse(entry.createdAt);
  return Number.isFinite(createdAt) ? createdAt : 0;
};

const isFreshPendingDesign = (entry: PendingDesign, now: number) => {
  const timestamp = getPendingDesignTimestamp(entry);
  if (timestamp <= 0) return false;
  return now - timestamp <= PENDING_DESIGN_TTL_MS;
};

const pruneStalePendingDesigns = (entries: Array<PendingDesign>) => {
  const now = Date.now();
  return entries.filter((entry) => isFreshPendingDesign(entry, now));
};

const toPersistedPendingDesigns = (entries: Array<PendingDesign>) => {
  const now = Date.now();
  return entries
    .filter((entry) => isFreshPendingDesign(entry, now))
    .map((entry) => ({
      ...entry,
      // Do not keep raw prompt payloads in localStorage.
      userPrompt: undefined,
    }));
};

const studioStorage = createJSONStorage<StudioPersistState>(() => ({
  getItem: (name) => {
    const uid = useAuthStore.getState().user?.uid ?? 'guest';
    return localStorage.getItem(`${name}:${uid}`);
  },
  setItem: (name, value) => {
    const uid = useAuthStore.getState().user?.uid ?? 'guest';
    localStorage.setItem(`${name}:${uid}`, value);
  },
  removeItem: (name) => {
    const uid = useAuthStore.getState().user?.uid ?? 'guest';
    localStorage.removeItem(`${name}:${uid}`);
  },
}));

export const useStudioStore = create<StudioState>()(
  persist<StudioState, [], [], StudioPersistState>(
    (set) => ({
      projectId: null,
      projectName: '',
      projects: [],
      pendingDesigns: [],
      projectMenuOpen: false,
      chatPanelOpen: true,
      rightPanelMode: 'create',
      errorConsoleOpen: false,
      highlightedLine: null,
      currentView: viewModes[0],
      viewModeOpen: false,
      codeModalOpen: false,
      setProjectMenuOpen: (open) => set({ projectMenuOpen: open }),
      setProject: (id, name) =>
        set((state) => ({
          projectId: id,
          projectName: name,
          projects: state.projects.some((p) => p.id === id)
            ? state.projects
            : [...state.projects, { id, name }],
        })),
      setProjects: (projects) => set({ projects }),
      clearProject: () => set({ projectId: null, projectName: '' }),
      addProject: (project) =>
        set((state) => ({
          projects: state.projects.some((p) => p.id === project.id)
            ? state.projects
            : [...state.projects, project],
        })),
      addPendingDesign: (design) =>
        set((state) => {
          const now = new Date().toISOString();
          const existing = state.pendingDesigns.find((item) => item.designId === design.designId);
          const next: PendingDesign = existing
            ? {
                ...existing,
                projectId: design.projectId,
                traceId: design.traceId ?? existing.traceId ?? null,
                promptPreview: normalizePromptPreview(
                  design.promptPreview ?? existing.promptPreview,
                ),
                userPrompt: design.userPrompt ?? existing.userPrompt,
                status: existing.status === 'failed' ? 'queued' : existing.status,
                updatedAt: now,
                errorMessage: null,
                errorCode: null,
              }
            : {
                designId: design.designId,
                projectId: design.projectId,
                traceId: design.traceId ?? null,
                promptPreview: normalizePromptPreview(design.promptPreview),
                userPrompt: design.userPrompt,
                status: 'queued',
                createdAt: now,
                updatedAt: now,
                errorMessage: null,
                errorCode: null,
              };
          const pendingDesigns = pruneStalePendingDesigns([
            next,
            ...state.pendingDesigns.filter((item) => item.designId !== design.designId),
          ]);
          return {
            pendingDesigns,
          };
        }),
      updatePendingDesign: (designId, patch) =>
        set((state) => ({
          pendingDesigns: pruneStalePendingDesigns(
            state.pendingDesigns.map((item) => {
              if (item.designId !== designId) return item;
              return {
                ...item,
                ...patch,
                promptPreview: normalizePromptPreview(
                  patch.promptPreview !== undefined ? patch.promptPreview : item.promptPreview,
                ),
                updatedAt: new Date().toISOString(),
              };
            }),
          ),
        })),
      pruneExpiredPendingDesigns: () =>
        set((state) => ({
          pendingDesigns: pruneStalePendingDesigns(state.pendingDesigns),
        })),
      removePendingDesign: (designId) =>
        set((state) => ({
          pendingDesigns: state.pendingDesigns.filter((item) => item.designId !== designId),
        })),
      setChatPanelOpen: (open) => set({ chatPanelOpen: open }),
      setRightPanelMode: (mode) => set({ rightPanelMode: mode }),
      setErrorConsoleOpen: (open) => set({ errorConsoleOpen: open }),
      setHighlightedLine: (line) => set({ highlightedLine: line }),
      setCurrentView: (view) => set({ currentView: view }),
      setViewModeOpen: (open) => set({ viewModeOpen: open }),
      setCodeModalOpen: (open) => set({ codeModalOpen: open }),
      toggleChatPanel: () => set((state) => ({ chatPanelOpen: !state.chatPanelOpen })),
      toggleProjectMenu: () => set((state) => ({ projectMenuOpen: !state.projectMenuOpen })),
      toggleViewMode: () => set((state) => ({ viewModeOpen: !state.viewModeOpen })),
      toggleCodeModal: () => set((state) => ({ codeModalOpen: !state.codeModalOpen })),
    }),
    {
      name: 'studio-store',
      storage: studioStorage,
      partialize: (state) => ({
        projectId: state.projectId,
        projectName: state.projectName,
        pendingDesigns: toPersistedPendingDesigns(state.pendingDesigns),
      }),
    },
  ),
);
