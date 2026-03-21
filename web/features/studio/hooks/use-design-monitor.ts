'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useQueries } from '@tanstack/react-query';
import { toast } from 'sonner';

import { getDesignJob, getGetDesignJobQueryKey } from '@/shared/api/generated/client';
import type { DesignJobResponse } from '@/shared/api/generated/schemas';
import { type ApiError } from '@/shared/api/fetcher';
import { useStudioStore, type PendingDesign } from '../stores/use-studio-store';

const DESIGN_POLL_INTERVAL_MS = 15_000;
const DESIGN_BACKGROUND_POLL_INTERVAL_MS = 60_000;
const DESIGN_FAST_POLL_MAX_TICKS = 12;
const DESIGN_FAST_POLL_WINDOW_MS = DESIGN_POLL_INTERVAL_MS * DESIGN_FAST_POLL_MAX_TICKS;
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

const getNotificationKey = (
  kind: 'background' | 'succeeded' | 'failed',
  designJobId: string,
) => `${kind}:${designJobId}`;

const isBackgroundCandidate = (createdAt: string) => {
  const timestamp = Date.parse(createdAt);
  return Number.isFinite(timestamp) && Date.now() - timestamp >= DESIGN_FAST_POLL_WINDOW_MS;
};

export function useDesignMonitor(params: UseDesignMonitorParams = {}) {
  const { enabled = true, onDesignSucceeded, onDesignFailed, onInvalidateProjectDesigns } = params;
  const pendingDesigns = useStudioStore((state) => state.pendingDesigns);
  const updatePendingDesign = useStudioStore((state) => state.updatePendingDesign);
  const removePendingDesign = useStudioStore((state) => state.removePendingDesign);
  const notifiedRef = useRef<Set<string>>(new Set());

  const markNotified = useCallback((key: string) => {
    if (notifiedRef.current.has(key)) return false;
    notifiedRef.current.add(key);
    return true;
  }, []);

  const moveDesignToBackground = useCallback(
    (entry: PendingDesign) => {
      if (entry.status === 'background') return;
      if (!isBackgroundCandidate(entry.createdAt)) return;

      updatePendingDesign(entry.designId, { status: 'background' });

      const key = getNotificationKey('background', entry.designId);
      if (markNotified(key)) {
        toast.info('Design is still running in background.');
      }
    },
    [markNotified, updatePendingDesign],
  );

  const handleDesignSuccess = useCallback(
    (entry: PendingDesign, payload: DesignJobResponse) => {
      const key = getNotificationKey('succeeded', entry.designId);
      if (!markNotified(key)) return;

      onInvalidateProjectDesigns?.(entry.projectId);
      removePendingDesign(entry.designId);
      onDesignSucceeded?.({
        designJobId: entry.designId,
        projectId: entry.projectId,
        traceId: getDesignTraceId(entry),
        designId: payload.designId ?? null,
        title: payload.title ?? null,
      });
      toast.success('Design completed.');
    },
    [
      markNotified,
      onDesignSucceeded,
      onInvalidateProjectDesigns,
      removePendingDesign,
    ],
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
    [
      markNotified,
      onDesignFailed,
      onInvalidateProjectDesigns,
      updatePendingDesign,
    ],
  );

  const syncInProgressDesign = useCallback(
    (entry: PendingDesign, payload: DesignJobResponse) => {
      if (
        entry.status !== 'background' &&
        (payload.status === 'queued' || payload.status === 'running') &&
        entry.status !== payload.status
      ) {
        updatePendingDesign(entry.designId, { status: payload.status });
      }

      moveDesignToBackground(entry);
    },
    [moveDesignToBackground, updatePendingDesign],
  );

  const trackedDesigns = useMemo(
    () => (enabled ? pendingDesigns.filter((entry) => entry.status !== 'failed') : []),
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
          return entry.status === 'background'
            ? DESIGN_BACKGROUND_POLL_INTERVAL_MS
            : DESIGN_POLL_INTERVAL_MS;
        },
        refetchOnWindowFocus: false,
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
      if (!payload) {
        moveDesignToBackground(entry);
        continue;
      }

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
    moveDesignToBackground,
    syncInProgressDesign,
    trackedDesigns,
  ]);

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
