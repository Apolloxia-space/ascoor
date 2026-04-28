import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { viewModes } from '@/mock/studio';
import { useAuthStore } from '@/features/auth/use-auth-store';
import type { RightPanelMode, ViewMode } from '../types';

export type PendingPackGenerationStatus = 'queued' | 'running' | 'succeeded' | 'failed';
export type PendingAssetPartStatus = 'pending' | 'generating' | 'completed' | 'failed';

export type PendingAssetPart = {
  slug: string;
  displayName: string;
  status: PendingAssetPartStatus;
  errorMessage?: string | null;
};

export type PendingAssetPack = {
  packGenerationJobId: string;
  workspaceId: string;
  assetPackId?: string | null;
  traceId?: string | null;
  promptPreview: string;
  userPrompt?: string;
  status: PendingPackGenerationStatus;
  parts?: Array<PendingAssetPart>;
  createdAt: string;
  updatedAt: string;
  errorMessage?: string | null;
  errorCode?: string | null;
};

type StudioState = {
  workspaceId: string | null;
  workspaceName: string;
  workspaces: Array<{ id: string; name: string }>;
  pendingPackGenerations: Array<PendingAssetPack>;
  workspaceMenuOpen: boolean;
  chatPanelOpen: boolean;
  rightPanelMode: RightPanelMode;
  errorConsoleOpen: boolean;
  highlightedLine: number | null;
  currentView: ViewMode;
  viewModeOpen: boolean;
  codeModalOpen: boolean;
  setWorkspaceMenuOpen: (open: boolean) => void;
  setWorkspace: (id: string, name: string) => void;
  setWorkspaces: (workspaces: Array<{ id: string; name: string }>) => void;
  clearWorkspace: () => void;
  addWorkspace: (workspace: { id: string; name: string }) => void;
  addPendingAssetPack: (assetPack: {
    packGenerationJobId: string;
    workspaceId: string;
    traceId?: string | null;
    promptPreview?: string;
    userPrompt?: string;
  }) => void;
  updatePendingAssetPack: (
    packGenerationJobId: string,
    patch: Partial<Omit<PendingAssetPack, 'packGenerationJobId' | 'workspaceId' | 'createdAt'>>,
  ) => void;
  pruneExpiredPendingAssetPacks: () => void;
  removePendingAssetPack: (packGenerationJobId: string) => void;
  setChatPanelOpen: (open: boolean) => void;
  setRightPanelMode: (mode: RightPanelMode) => void;
  setErrorConsoleOpen: (open: boolean) => void;
  setHighlightedLine: (line: number | null) => void;
  setCurrentView: (view: ViewMode) => void;
  setViewModeOpen: (open: boolean) => void;
  setCodeModalOpen: (open: boolean) => void;
  toggleChatPanel: () => void;
  toggleWorkspaceMenu: () => void;
  toggleViewMode: () => void;
  toggleCodeModal: () => void;
};

type StudioPersistState = Pick<StudioState, 'workspaceId' | 'workspaceName' | 'pendingPackGenerations'>;
const PENDING_PACK_GENERATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const normalizePromptPreview = (value?: string) => {
  const normalized = (value ?? '').replace(/\s+/g, ' ').trim();
  if (!normalized) return 'Generating model...';
  return normalized.length > 80 ? `${normalized.slice(0, 80)}...` : normalized;
};

const getPendingAssetPackTimestamp = (entry: PendingAssetPack) => {
  const updatedAt = Date.parse(entry.updatedAt);
  if (Number.isFinite(updatedAt)) return updatedAt;
  const createdAt = Date.parse(entry.createdAt);
  return Number.isFinite(createdAt) ? createdAt : 0;
};

const isFreshPendingAssetPack = (entry: PendingAssetPack, now: number) => {
  const timestamp = getPendingAssetPackTimestamp(entry);
  if (timestamp <= 0) return false;
  return now - timestamp <= PENDING_PACK_GENERATION_TTL_MS;
};

const pruneStalePendingAssetPacks = (entries: Array<PendingAssetPack>) => {
  const now = Date.now();
  return entries.filter((entry) => isFreshPendingAssetPack(entry, now));
};

const toPersistedPendingAssetPacks = (entries: Array<PendingAssetPack>) => {
  const now = Date.now();
  return entries.filter((entry) => isFreshPendingAssetPack(entry, now));
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
      workspaceId: null,
      workspaceName: '',
      workspaces: [],
      pendingPackGenerations: [],
      workspaceMenuOpen: false,
      chatPanelOpen: true,
      rightPanelMode: 'create',
      errorConsoleOpen: false,
      highlightedLine: null,
      currentView: viewModes[0],
      viewModeOpen: false,
      codeModalOpen: false,
      setWorkspaceMenuOpen: (open) => set({ workspaceMenuOpen: open }),
      setWorkspace: (id, name) =>
        set((state) => ({
          workspaceId: id,
          workspaceName: name,
          workspaces: state.workspaces.some((p) => p.id === id)
            ? state.workspaces
            : [...state.workspaces, { id, name }],
        })),
      setWorkspaces: (workspaces) => set({ workspaces }),
      clearWorkspace: () => set({ workspaceId: null, workspaceName: '' }),
      addWorkspace: (workspace) =>
        set((state) => ({
          workspaces: state.workspaces.some((p) => p.id === workspace.id)
            ? state.workspaces
            : [...state.workspaces, workspace],
        })),
      addPendingAssetPack: (assetPack) =>
        set((state) => {
          const now = new Date().toISOString();
          const existing = state.pendingPackGenerations.find(
            (item) => item.packGenerationJobId === assetPack.packGenerationJobId,
          );
          const next: PendingAssetPack = existing
            ? {
                ...existing,
                workspaceId: assetPack.workspaceId,
                assetPackId: existing.assetPackId ?? null,
                traceId: assetPack.traceId ?? existing.traceId ?? null,
                promptPreview: normalizePromptPreview(
                  assetPack.promptPreview ?? existing.promptPreview,
                ),
                userPrompt: assetPack.userPrompt ?? existing.userPrompt,
                status:
                  existing.status === 'failed' || existing.status === 'succeeded'
                    ? 'queued'
                    : existing.status,
                updatedAt: now,
                errorMessage: null,
                errorCode: null,
              }
            : {
                packGenerationJobId: assetPack.packGenerationJobId,
                workspaceId: assetPack.workspaceId,
                assetPackId: null,
                traceId: assetPack.traceId ?? null,
                promptPreview: normalizePromptPreview(assetPack.promptPreview),
                userPrompt: assetPack.userPrompt,
                status: 'queued',
                parts: [],
                createdAt: now,
                updatedAt: now,
                errorMessage: null,
                errorCode: null,
              };
          const pendingPackGenerations = pruneStalePendingAssetPacks([
            next,
            ...state.pendingPackGenerations.filter(
              (item) => item.packGenerationJobId !== assetPack.packGenerationJobId,
            ),
          ]);
          return {
            pendingPackGenerations,
          };
        }),
      updatePendingAssetPack: (packGenerationJobId, patch) =>
        set((state) => ({
          pendingPackGenerations: pruneStalePendingAssetPacks(
            state.pendingPackGenerations.map((item) => {
              if (item.packGenerationJobId !== packGenerationJobId) return item;
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
      pruneExpiredPendingAssetPacks: () =>
        set((state) => ({
          pendingPackGenerations: pruneStalePendingAssetPacks(state.pendingPackGenerations),
        })),
      removePendingAssetPack: (packGenerationJobId) =>
        set((state) => ({
          pendingPackGenerations: state.pendingPackGenerations.filter(
            (item) => item.packGenerationJobId !== packGenerationJobId,
          ),
        })),
      setChatPanelOpen: (open) => set({ chatPanelOpen: open }),
      setRightPanelMode: (mode) => set({ rightPanelMode: mode }),
      setErrorConsoleOpen: (open) => set({ errorConsoleOpen: open }),
      setHighlightedLine: (line) => set({ highlightedLine: line }),
      setCurrentView: (view) => set({ currentView: view }),
      setViewModeOpen: (open) => set({ viewModeOpen: open }),
      setCodeModalOpen: (open) => set({ codeModalOpen: open }),
      toggleChatPanel: () => set((state) => ({ chatPanelOpen: !state.chatPanelOpen })),
      toggleWorkspaceMenu: () => set((state) => ({ workspaceMenuOpen: !state.workspaceMenuOpen })),
      toggleViewMode: () => set((state) => ({ viewModeOpen: !state.viewModeOpen })),
      toggleCodeModal: () => set((state) => ({ codeModalOpen: !state.codeModalOpen })),
    }),
    {
      name: 'studio-store',
      storage: studioStorage,
      partialize: (state) => ({
        workspaceId: state.workspaceId,
        workspaceName: state.workspaceName,
        pendingPackGenerations: toPersistedPendingAssetPacks(state.pendingPackGenerations),
      }),
    },
  ),
);
