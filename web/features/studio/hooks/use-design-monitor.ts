'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useQueries } from '@tanstack/react-query';
import { toast } from 'sonner';

import {
  getDesign,
  getDesignJob,
  getGetDesignJobQueryKey,
  getGetDesignQueryKey,
} from '@/shared/api/generated/client';
import type { DesignJobResponse } from '@/shared/api/generated/schemas';
import { type ApiError } from '@/shared/api/fetcher';
import {
  useStudioStore,
  type PendingDesign,
  type PendingDesignPart,
  type PendingDesignPartStatus,
} from '../stores/use-studio-store';

const DESIGN_POLL_INTERVAL_MS = 15_000;
const DEFAULT_FAILURE_MESSAGE = 'Something went wrong. Please try again.';

type MonitorSuccessPayload = {
  designJobId: string;
  projectId: string;
  traceId: string | null;
  designId: string | null;
  title: string | null;
};

type MonitorFailurePayload = {
  designJobId: string;
  projectId: string;
  traceId: string | null;
  designId: string | null;
  title: string | null;
  errorMessage: string | null;
  errorCode: string | null;
};

type UseDesignMonitorParams = {
  enabled?: boolean;
  onDesignSucceeded?: (payload: MonitorSuccessPayload) => void;
  onDesignFailed?: (payload: MonitorFailurePayload) => void;
  onInvalidateProjectDesigns?: (projectId: string) => void;
};

const getDesignTraceId = (entry: PendingDesign) => entry.traceId ?? entry.designId;

const getNotificationKey = (kind: 'succeeded' | 'failed', designJobId: string) =>
  `${kind}:${designJobId}`;

type DesignDetailWithParts = {
  design?: {
    parts?: Array<{
      slug?: string | null;
      displayName?: string | null;
      status?: string | null;
      errorMessage?: string | null;
    }> | null;
  } | null;
};

const PART_STATUSES = new Set<PendingDesignPartStatus>([
  'pending',
  'generating',
  'completed',
  'failed',
]);

const normalizePartStatus = (value: string | null | undefined): PendingDesignPartStatus =>
  PART_STATUSES.has(value as PendingDesignPartStatus)
    ? (value as PendingDesignPartStatus)
    : 'pending';

const normalizeDesignParts = (payload: unknown): Array<PendingDesignPart> => {
  const parts = (payload as DesignDetailWithParts | null)?.design?.parts;
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

const arePartsEqual = (a: Array<PendingDesignPart> | undefined, b: Array<PendingDesignPart>) => {
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

export function useDesignMonitor(params: UseDesignMonitorParams = {}) {
  const { enabled = true, onDesignSucceeded, onDesignFailed, onInvalidateProjectDesigns } = params;
  const pendingDesigns = useStudioStore((state) => state.pendingDesigns);
  const updatePendingDesign = useStudioStore((state) => state.updatePendingDesign);
  const notifiedRef = useRef<Set<string>>(new Set());

  const markNotified = useCallback((key: string) => {
    if (notifiedRef.current.has(key)) return false;
    notifiedRef.current.add(key);
    return true;
  }, []);

  const handleDesignSuccess = useCallback(
    (entry: PendingDesign, payload: DesignJobResponse) => {
      const key = getNotificationKey('succeeded', entry.designId);
      if (!markNotified(key)) return;

      onInvalidateProjectDesigns?.(entry.projectId);
      updatePendingDesign(entry.designId, {
        status: 'succeeded',
        assetDesignId: payload.designId ?? entry.assetDesignId ?? null,
        errorMessage: null,
        errorCode: null,
      });
      onDesignSucceeded?.({
        designJobId: entry.designId,
        projectId: entry.projectId,
        traceId: getDesignTraceId(entry),
        designId: payload.designId ?? null,
        title: payload.title ?? null,
      });
      toast.success('Pack completed.');
    },
    [markNotified, onDesignSucceeded, onInvalidateProjectDesigns, updatePendingDesign],
  );

  const handleDesignFailure = useCallback(
    (
      entry: PendingDesign,
      failure: {
        designId: string | null;
        title: string | null;
        errorMessage: string;
        errorCode: string | null;
      },
      options?: {
        invalidateProjectDesigns?: boolean;
      },
    ) => {
      const key = getNotificationKey('failed', entry.designId);
      if (!markNotified(key)) return;

      if (options?.invalidateProjectDesigns) {
        onInvalidateProjectDesigns?.(entry.projectId);
      }

      updatePendingDesign(entry.designId, {
        status: 'failed',
        assetDesignId: failure.designId ?? entry.assetDesignId ?? null,
        errorMessage: failure.errorMessage,
        errorCode: failure.errorCode,
      });
      onDesignFailed?.({
        designJobId: entry.designId,
        projectId: entry.projectId,
        traceId: getDesignTraceId(entry),
        designId: failure.designId,
        title: failure.title,
        errorMessage: failure.errorMessage,
        errorCode: failure.errorCode,
      });
    },
    [markNotified, onDesignFailed, onInvalidateProjectDesigns, updatePendingDesign],
  );

  const syncInProgressDesign = useCallback(
    (entry: PendingDesign, payload: DesignJobResponse) => {
      if (payload.status !== 'queued' && payload.status !== 'running') {
        return;
      }
      const assetDesignId = payload.designId ?? entry.assetDesignId ?? null;
      if (entry.status !== payload.status || entry.assetDesignId !== assetDesignId) {
        updatePendingDesign(entry.designId, {
          status: payload.status,
          assetDesignId,
        });
      }
    },
    [updatePendingDesign],
  );

  const trackedDesigns = useMemo(
    () =>
      enabled
        ? pendingDesigns.filter((entry) => entry.status === 'queued' || entry.status === 'running')
        : [],
    [enabled, pendingDesigns],
  );

  const designQueries = useQueries({
    queries: trackedDesigns.map((entry) => {
      const designTraceId = entry.traceId ?? entry.designId;
      return {
        queryKey: [...getGetDesignJobQueryKey(entry.designId), designTraceId],
        queryFn: async (context: { signal: AbortSignal }) => {
          const response = await getDesignJob(entry.designId, {
            headers: { 'X-Trace-Id': designTraceId },
            signal: context.signal,
          });
          if (response.status !== 200) {
            throw new Error('Unexpected response status');
          }
          return response.data;
        },
        enabled: Boolean(entry.designId),
        refetchInterval: (query: { state: { data?: { status?: string } } }) => {
          const status = query.state.data?.status;
          if (status === 'succeeded' || status === 'failed') return false;
          return DESIGN_POLL_INTERVAL_MS;
        },
        refetchOnMount: 'always',
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
        retry: false,
      };
    }),
  });

  const partTrackedDesigns = useMemo(
    () => (enabled ? pendingDesigns.filter((entry) => Boolean(entry.assetDesignId)) : []),
    [enabled, pendingDesigns],
  );

  const partQueries = useQueries({
    queries: partTrackedDesigns.map((entry) => {
      const assetDesignId = entry.assetDesignId ?? '';
      return {
        queryKey: [...getGetDesignQueryKey(assetDesignId), 'parts-progress', entry.designId],
        queryFn: async (context: { signal: AbortSignal }) => {
          const response = await getDesign(assetDesignId, { signal: context.signal });
          if (response.status !== 200) {
            throw new Error('Unexpected response status');
          }
          return response.data;
        },
        enabled: Boolean(assetDesignId),
        refetchInterval: (query: { state: { data?: unknown } }) => {
          if (entry.status === 'failed' || entry.status === 'succeeded') return false;
          const parts = normalizeDesignParts(query.state.data);
          if (
            parts.length > 0 &&
            parts.every((part) => part.status === 'completed' || part.status === 'failed')
          ) {
            return false;
          }
          return DESIGN_POLL_INTERVAL_MS;
        },
        refetchOnMount: 'always',
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
        retry: false,
      };
    }),
  });

  useEffect(() => {
    for (const [index, entry] of trackedDesigns.entries()) {
      const query = designQueries[index];
      if (!query) continue;

      const payload = query.data;
      if (!payload) continue;

      switch (payload.status) {
        case 'succeeded':
          handleDesignSuccess(entry, payload);
          break;
        case 'failed':
          handleDesignFailure(
            entry,
            {
              designId: payload.designId ?? null,
              title: payload.title ?? null,
              errorMessage: payload.errorMessage ?? DEFAULT_FAILURE_MESSAGE,
              errorCode: payload.errorCode ?? null,
            },
            {
              invalidateProjectDesigns: true,
            },
          );
          break;
        case 'queued':
        case 'running':
          syncInProgressDesign(entry, payload);
          break;
      }
    }
  }, [
    designQueries,
    handleDesignFailure,
    handleDesignSuccess,
    syncInProgressDesign,
    trackedDesigns,
  ]);

  useEffect(() => {
    for (const [index, entry] of partTrackedDesigns.entries()) {
      const query = partQueries[index];
      if (!query?.data) continue;

      const parts = normalizeDesignParts(query.data);
      if (parts.length === 0 || arePartsEqual(entry.parts, parts)) continue;

      updatePendingDesign(entry.designId, { parts });
    }
  }, [partQueries, partTrackedDesigns, updatePendingDesign]);

  useEffect(() => {
    for (const [index, entry] of trackedDesigns.entries()) {
      const query = designQueries[index];
      if (!query?.isError) continue;
      const apiError = query.error as ApiError<{ error?: string }> | undefined;
      if (apiError?.status !== 404) continue;
      if (entry.status === 'failed') continue;

      handleDesignFailure(entry, {
        designId: null,
        title: null,
        errorMessage: DEFAULT_FAILURE_MESSAGE,
        errorCode: 'DESIGN_NOT_FOUND',
      });
    }
  }, [designQueries, handleDesignFailure, trackedDesigns]);
}
