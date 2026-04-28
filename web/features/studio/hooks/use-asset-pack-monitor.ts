'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useQueries } from '@tanstack/react-query';
import { toast } from 'sonner';

import {
  getAssetPack,
  getPackGenerationJob,
  getGetPackGenerationJobQueryKey,
  getGetAssetPackQueryKey,
} from '@/shared/api/generated/client';
import type { PackGenerationJobResponse } from '@/shared/api/generated/schemas';
import { type ApiError } from '@/shared/api/fetcher';
import {
  useStudioStore,
  type PendingAssetPack,
  type PendingAssetPart,
  type PendingAssetPartStatus,
} from '../stores/use-studio-store';

const PACK_GENERATION_POLL_INTERVAL_MS = 15_000;
const DEFAULT_FAILURE_MESSAGE = 'Something went wrong. Please try again.';

type MonitorSuccessPayload = {
  packGenerationJobId: string;
  workspaceId: string;
  traceId: string | null;
  assetPackId: string | null;
  title: string | null;
};

type MonitorFailurePayload = {
  packGenerationJobId: string;
  workspaceId: string;
  traceId: string | null;
  assetPackId: string | null;
  title: string | null;
  errorMessage: string | null;
  errorCode: string | null;
};

type UseAssetPackMonitorParams = {
  enabled?: boolean;
  onAssetPackSucceeded?: (payload: MonitorSuccessPayload) => void;
  onAssetPackFailed?: (payload: MonitorFailurePayload) => void;
  onInvalidateWorkspaceAssetPacks?: (workspaceId: string) => void;
};

const getAssetPackTraceId = (entry: PendingAssetPack) => entry.traceId ?? entry.packGenerationJobId;

const getNotificationKey = (kind: 'succeeded' | 'failed', packGenerationJobId: string) =>
  `${kind}:${packGenerationJobId}`;

type AssetPackDetailWithParts = {
  assetPack?: {
    parts?: Array<{
      slug?: string | null;
      displayName?: string | null;
      status?: string | null;
      errorMessage?: string | null;
    }> | null;
  } | null;
};

const PART_STATUSES = new Set<PendingAssetPartStatus>([
  'pending',
  'generating',
  'completed',
  'failed',
]);

const normalizePartStatus = (value: string | null | undefined): PendingAssetPartStatus =>
  PART_STATUSES.has(value as PendingAssetPartStatus)
    ? (value as PendingAssetPartStatus)
    : 'pending';

const normalizeAssetParts = (payload: unknown): Array<PendingAssetPart> => {
  const parts = (payload as AssetPackDetailWithParts | null)?.assetPack?.parts;
  if (!Array.isArray(parts)) return [];
  return parts
    .map((part, index) => {
      const slug = part.slug?.trim() || `part_${index + 1}`;
      return {
        slug,
        displayName: part.displayName?.trim() || slug,
        status: normalizePartStatus(part.status),
        errorMessage: part.errorMessage ?? null,
      };
    })
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
};

const arePartsEqual = (a: Array<PendingAssetPart> | undefined, b: Array<PendingAssetPart>) => {
  const left = a ?? [];
  if (left.length !== b.length) return false;
  return left.every((part, index) => {
    const next = b[index];
    return (
      next &&
      part.slug === next.slug &&
      part.displayName === next.displayName &&
      part.status === next.status &&
      (part.errorMessage ?? null) === (next.errorMessage ?? null)
    );
  });
};

export function useAssetPackMonitor(params: UseAssetPackMonitorParams = {}) {
  const { enabled = true, onAssetPackSucceeded, onAssetPackFailed, onInvalidateWorkspaceAssetPacks } = params;
  const pendingPackGenerations = useStudioStore((state) => state.pendingPackGenerations);
  const updatePendingAssetPack = useStudioStore((state) => state.updatePendingAssetPack);
  const notifiedRef = useRef<Set<string>>(new Set());

  const markNotified = useCallback((key: string) => {
    if (notifiedRef.current.has(key)) return false;
    notifiedRef.current.add(key);
    return true;
  }, []);

  const handleAssetPackSuccess = useCallback(
    (entry: PendingAssetPack, payload: PackGenerationJobResponse) => {
      const key = getNotificationKey('succeeded', entry.packGenerationJobId);
      if (!markNotified(key)) return;

      onInvalidateWorkspaceAssetPacks?.(entry.workspaceId);
      updatePendingAssetPack(entry.packGenerationJobId, {
        status: 'succeeded',
        assetPackId: payload.assetPackId ?? entry.assetPackId ?? null,
        errorMessage: null,
        errorCode: null,
      });
      onAssetPackSucceeded?.({
        packGenerationJobId: entry.packGenerationJobId,
        workspaceId: entry.workspaceId,
        traceId: getAssetPackTraceId(entry),
        assetPackId: payload.assetPackId ?? null,
        title: payload.title ?? null,
      });
      toast.success('Pack completed.');
    },
    [markNotified, onAssetPackSucceeded, onInvalidateWorkspaceAssetPacks, updatePendingAssetPack],
  );

  const handleAssetPackFailure = useCallback(
    (
      entry: PendingAssetPack,
      failure: {
        assetPackId: string | null;
        title: string | null;
        errorMessage: string;
        errorCode: string | null;
      },
      options?: {
        invalidateWorkspaceAssetPacks?: boolean;
      },
    ) => {
      const key = getNotificationKey('failed', entry.packGenerationJobId);
      if (!markNotified(key)) return;

      if (options?.invalidateWorkspaceAssetPacks) {
        onInvalidateWorkspaceAssetPacks?.(entry.workspaceId);
      }

      updatePendingAssetPack(entry.packGenerationJobId, {
        status: 'failed',
        assetPackId: failure.assetPackId ?? entry.assetPackId ?? null,
        errorMessage: failure.errorMessage,
        errorCode: failure.errorCode,
      });
      onAssetPackFailed?.({
        packGenerationJobId: entry.packGenerationJobId,
        workspaceId: entry.workspaceId,
        traceId: getAssetPackTraceId(entry),
        assetPackId: failure.assetPackId,
        title: failure.title,
        errorMessage: failure.errorMessage,
        errorCode: failure.errorCode,
      });
    },
    [markNotified, onAssetPackFailed, onInvalidateWorkspaceAssetPacks, updatePendingAssetPack],
  );

  const syncInProgressAssetPack = useCallback(
    (entry: PendingAssetPack, payload: PackGenerationJobResponse) => {
      if (payload.status !== 'queued' && payload.status !== 'running') {
        return;
      }
      const assetPackId = payload.assetPackId ?? entry.assetPackId ?? null;
      if (entry.status !== payload.status || entry.assetPackId !== assetPackId) {
        updatePendingAssetPack(entry.packGenerationJobId, {
          status: payload.status,
          assetPackId,
        });
      }
    },
    [updatePendingAssetPack],
  );

  const trackedAssetPacks = useMemo(
    () =>
      enabled
        ? pendingPackGenerations.filter((entry) => entry.status === 'queued' || entry.status === 'running')
        : [],
    [enabled, pendingPackGenerations],
  );

  const assetPackQueries = useQueries({
    queries: trackedAssetPacks.map((entry) => {
      const assetPackTraceId = entry.traceId ?? entry.packGenerationJobId;
      return {
        queryKey: [...getGetPackGenerationJobQueryKey(entry.packGenerationJobId), assetPackTraceId],
        queryFn: async (context: { signal: AbortSignal }) => {
          const response = await getPackGenerationJob(entry.packGenerationJobId, {
            headers: { 'X-Trace-Id': assetPackTraceId },
            signal: context.signal,
          });
          if (response.status !== 200) {
            throw new Error('Unexpected response status');
          }
          return response.data;
        },
        enabled: Boolean(entry.packGenerationJobId),
        refetchInterval: (query: { state: { data?: { status?: string } } }) => {
          const status = query.state.data?.status;
          if (status === 'succeeded' || status === 'failed') return false;
          return PACK_GENERATION_POLL_INTERVAL_MS;
        },
        refetchOnMount: 'always',
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
        retry: false,
      };
    }),
  });

  const partTrackedAssetPacks = useMemo(
    () => (enabled ? pendingPackGenerations.filter((entry) => Boolean(entry.assetPackId)) : []),
    [enabled, pendingPackGenerations],
  );

  const partQueries = useQueries({
    queries: partTrackedAssetPacks.map((entry) => {
      const assetPackId = entry.assetPackId ?? '';
      return {
        queryKey: [...getGetAssetPackQueryKey(assetPackId), 'parts-progress', entry.packGenerationJobId],
        queryFn: async (context: { signal: AbortSignal }) => {
          const response = await getAssetPack(assetPackId, { signal: context.signal });
          if (response.status !== 200) {
            throw new Error('Unexpected response status');
          }
          return response.data;
        },
        enabled: Boolean(assetPackId),
        refetchInterval: (query: { state: { data?: unknown } }) => {
          if (entry.status === 'failed' || entry.status === 'succeeded') return false;
          const parts = normalizeAssetParts(query.state.data);
          if (
            parts.length > 0 &&
            parts.every((part) => part.status === 'completed' || part.status === 'failed')
          ) {
            return false;
          }
          return PACK_GENERATION_POLL_INTERVAL_MS;
        },
        refetchOnMount: 'always',
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
        retry: false,
      };
    }),
  });

  useEffect(() => {
    for (const [index, entry] of trackedAssetPacks.entries()) {
      const query = assetPackQueries[index];
      if (!query) continue;

      const payload = query.data;
      if (!payload) continue;

      switch (payload.status) {
        case 'succeeded':
          handleAssetPackSuccess(entry, payload);
          break;
        case 'failed':
          handleAssetPackFailure(
            entry,
            {
              assetPackId: payload.assetPackId ?? null,
              title: payload.title ?? null,
              errorMessage: payload.errorMessage ?? DEFAULT_FAILURE_MESSAGE,
              errorCode: payload.errorCode ?? null,
            },
            {
              invalidateWorkspaceAssetPacks: true,
            },
          );
          break;
        case 'queued':
        case 'running':
          syncInProgressAssetPack(entry, payload);
          break;
      }
    }
  }, [
    assetPackQueries,
    handleAssetPackFailure,
    handleAssetPackSuccess,
    syncInProgressAssetPack,
    trackedAssetPacks,
  ]);

  useEffect(() => {
    for (const [index, entry] of partTrackedAssetPacks.entries()) {
      const query = partQueries[index];
      if (!query?.data) continue;

      const parts = normalizeAssetParts(query.data);
      if (parts.length === 0 || arePartsEqual(entry.parts, parts)) continue;

      updatePendingAssetPack(entry.packGenerationJobId, { parts });
    }
  }, [partQueries, partTrackedAssetPacks, updatePendingAssetPack]);

  useEffect(() => {
    for (const [index, entry] of trackedAssetPacks.entries()) {
      const query = assetPackQueries[index];
      if (!query?.isError) continue;
      const apiError = query.error as ApiError<{ error?: string }> | undefined;
      if (apiError?.status !== 404) continue;
      if (entry.status === 'failed') continue;

      handleAssetPackFailure(entry, {
        assetPackId: null,
        title: null,
        errorMessage: DEFAULT_FAILURE_MESSAGE,
        errorCode: 'PACK_GENERATION_JOB_NOT_FOUND',
      });
    }
  }, [assetPackQueries, handleAssetPackFailure, trackedAssetPacks]);
}
