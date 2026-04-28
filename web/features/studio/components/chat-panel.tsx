'use client';

import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { AlertTriangle, Check, Clock, Download, FileText, Loader2 } from 'lucide-react';

import { Button } from '@shared/components/ui/button';
import {
  getDesign,
  getGetDesignQueryKey,
  getListProjectDesignJobsQueryKey,
  useListProjectDesignJobs,
} from '@/shared/api/generated/client';
import {
  useStudioStore,
  type PendingDesign,
  type PendingDesignPart,
  type PendingDesignPartStatus,
} from '../stores/use-studio-store';
import { StudioSidePanel } from './studio-side-panel';
import type { PartNode } from '../lib/model-parts';
import { parseStructuredPackPrompt } from '../lib/new-pack-config';
import { cn } from '@shared/lib/utils';
export { NewPackDialog } from './new-pack-dialog';

type ChatPanelProps = {
  open: boolean;
  variant?: 'desktop' | 'mobile';
  onToggle?: () => void;
  hasSelectedPack?: boolean;
  showJavaScriptDownload?: boolean;
  parts?: Array<PartNode>;
  activePartId?: string | null;
  onDownloadZip?: () => void;
  onDownloadJavaScript?: () => void;
  onPreviewPart?: (id: string) => void;
};

export function ChatPanel({
  open,
  variant = 'desktop',
  onToggle,
  hasSelectedPack = false,
  showJavaScriptDownload = false,
  parts = [],
  activePartId = null,
  onDownloadZip,
  onDownloadJavaScript,
  onPreviewPart,
}: ChatPanelProps) {
  return (
    <StudioSidePanel
      open={open}
      variant={variant}
      resizeAriaLabel="Resize pack status panel"
      title="Pack status"
      showHeader={false}
      onToggle={onToggle}
    >
      <CreatePanelContent
        open={open}
        hasSelectedPack={hasSelectedPack}
        showJavaScriptDownload={showJavaScriptDownload}
        parts={parts}
        activePartId={activePartId}
        onDownloadZip={onDownloadZip}
        onDownloadJavaScript={onDownloadJavaScript}
        onPreviewPart={onPreviewPart}
      />
    </StudioSidePanel>
  );
}

type CreatePanelContentProps = {
  open: boolean;
  hasSelectedPack?: boolean;
  showJavaScriptDownload?: boolean;
  parts?: Array<PartNode>;
  activePartId?: string | null;
  onDownloadZip?: () => void;
  onDownloadJavaScript?: () => void;
  onPreviewPart?: (id: string) => void;
};

const partStatusLabel: Record<PendingDesignPartStatus, string> = {
  pending: 'Pending',
  generating: 'Generating',
  completed: 'Completed',
  failed: 'Failed',
};

const getPartStatusIcon = (status: PendingDesignPartStatus) => {
  switch (status) {
    case 'completed':
      return <Check className="size-3.5" />;
    case 'failed':
      return <AlertTriangle className="size-3.5" />;
    case 'generating':
      return <Loader2 className="size-3.5 animate-spin" />;
    case 'pending':
      return <Clock className="size-3.5" />;
  }
};

const getPartStatusClassName = (status: PendingDesignPartStatus) => {
  switch (status) {
    case 'completed':
      return 'text-emerald-300';
    case 'failed':
      return 'text-destructive';
    case 'generating':
      return 'text-foreground';
    case 'pending':
      return 'text-muted-foreground';
  }
};

const getDesignTimestamp = (entry: PendingDesign) => {
  const createdAt = Date.parse(entry.createdAt);
  if (Number.isFinite(createdAt)) return createdAt;
  const updatedAt = Date.parse(entry.updatedAt);
  return Number.isFinite(updatedAt) ? updatedAt : 0;
};

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

const normalizePartKey = (value: string) =>
  value
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

const findLoadedPart = (part: PendingDesignPart, loadedParts: Array<PartNode>) => {
  const slugKey = normalizePartKey(part.slug);
  const displayKey = normalizePartKey(part.displayName);
  return (
    loadedParts.find(
      (loadedPart) =>
        normalizePartKey(loadedPart.name) === slugKey ||
        normalizePartKey(loadedPart.displayName) === displayKey,
    ) ?? null
  );
};

function GenerationLog({
  pendingDesigns,
  loadedParts,
  activePartId,
  onDownloadZip,
  onPreviewPart,
}: {
  pendingDesigns: Array<PendingDesign>;
  loadedParts: Array<PartNode>;
  activePartId?: string | null;
  onDownloadZip?: () => void;
  onPreviewPart?: (id: string) => void;
}) {
  if (pendingDesigns.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center rounded-md border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
        <p>No generation activity yet.</p>
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="space-y-4">
        {[...pendingDesigns].reverse().map((pendingDesign) => {
          const structuredPrompt = parseStructuredPackPrompt(
            pendingDesign.userPrompt ?? pendingDesign.promptPreview,
          );
          const parts = pendingDesign.parts ?? [];
          const completedCount = parts.filter((part) => part.status === 'completed').length;
          const failedCount = parts.filter((part) => part.status === 'failed').length;
          const isFailed = pendingDesign.status === 'failed';
          const isSucceeded = pendingDesign.status === 'succeeded';
          const summaryText =
            parts.length > 0
              ? `${completedCount}/${parts.length} parts completed${failedCount > 0 ? `, ${failedCount} failed` : ''}.`
              : isFailed
                ? (pendingDesign.errorMessage ??
                  (pendingDesign.assetDesignId
                    ? 'No part status was available.'
                    : 'Failed before pack planning.'))
                : isSucceeded
                  ? 'Ready to preview.'
                  : pendingDesign.assetDesignId
                    ? 'Preparing parts...'
                    : 'Planning the pack...';
          const statusTone = isFailed
            ? 'border-destructive/30 bg-destructive/10'
            : isSucceeded
              ? 'border-emerald-500/30 bg-emerald-500/10'
              : 'border-border bg-muted/40';
          const statusTitle = isFailed
            ? 'Pack needs attention'
            : isSucceeded
              ? 'Pack completed'
              : 'Creating asset pack';

          return (
            <section className="space-y-3" key={pendingDesign.designId}>
              <div className={cn('rounded-lg border px-3 py-3 shadow-sm', statusTone)}>
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  {isFailed ? (
                    <AlertTriangle className="size-4 text-destructive" />
                  ) : isSucceeded ? (
                    <Check className="size-4 text-emerald-600" />
                  ) : (
                    <Loader2 className="size-4 animate-spin text-foreground" />
                  )}
                  <span>{statusTitle}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{summaryText}</p>
                {isSucceeded ? (
                  <Button
                    type="button"
                    size="sm"
                    className="mt-3 w-full justify-start rounded-md"
                    onClick={onDownloadZip}
                    disabled={!onDownloadZip}
                  >
                    <Download className="size-4" />
                    Download ZIP
                  </Button>
                ) : null}
              </div>

              {parts.length > 0 ? (
                <div className="space-y-2">
                  <div className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Parts
                  </div>
                  <div className="space-y-2">
                    {parts.map((part) => {
                      const loadedPart = findLoadedPart(part, loadedParts);
                      const canPreview =
                        part.status === 'completed' && Boolean(loadedPart) && Boolean(onPreviewPart);
                      const isActive = activePartId === loadedPart?.id;
                      const content = (
                        <>
                          <span className={getPartStatusClassName(part.status)}>
                            {getPartStatusIcon(part.status)}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex min-w-0 items-center justify-between gap-2">
                              <span className="truncate text-xs font-medium text-foreground">
                                {part.displayName}
                              </span>
                              {!canPreview ? (
                                <span className="shrink-0 text-[11px] text-muted-foreground">
                                  {partStatusLabel[part.status]}
                                </span>
                              ) : null}
                            </div>
                            {part.status === 'failed' && part.errorMessage ? (
                              <p className="mt-1 line-clamp-2 text-[11px] text-destructive">
                                {part.errorMessage}
                              </p>
                            ) : null}
                          </div>
                        </>
                      );

                      const className = cn(
                        'flex min-w-0 items-start gap-2 rounded-md border border-border/70 bg-card/70 px-2 py-2',
                        canPreview && 'w-full text-left transition-colors hover:bg-muted',
                        isActive && 'border-primary/50 bg-primary/10',
                      );

                      return canPreview && loadedPart ? (
                        <button
                          key={part.slug}
                          type="button"
                          className={className}
                          onClick={() => onPreviewPart?.(loadedPart.id)}
                        >
                          {content}
                        </button>
                      ) : (
                        <div key={part.slug} className={className}>
                          {content}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {structuredPrompt ? (
                <details className="rounded-lg border border-border/70 bg-card/60 px-3 py-3">
                  <summary className="cursor-pointer list-none text-sm font-medium text-foreground">
                    Pack setup
                  </summary>
                  <div className="mt-3 space-y-3 text-sm">
                    <div className="space-y-0.5">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Theme
                      </p>
                      <p>{structuredPrompt.themeLabel}</p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        What are you making?
                      </p>
                      <p>{structuredPrompt.packTypeLabel}</p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Style
                      </p>
                      <p>{structuredPrompt.styleLabel}</p>
                    </div>
                    {structuredPrompt.assetCount !== null ? (
                      <div className="space-y-0.5">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Asset count
                        </p>
                        <p>{structuredPrompt.assetCount}</p>
                      </div>
                    ) : null}
                    {structuredPrompt.additionalDirection ? (
                      <div className="space-y-0.5">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Additional
                        </p>
                        <p>{structuredPrompt.additionalDirection}</p>
                      </div>
                    ) : null}
                    {pendingDesign.userPrompt ? (
                      <details className="rounded-md border border-border/70 bg-background px-2 py-2">
                        <summary className="cursor-pointer list-none text-xs text-muted-foreground">
                          Show prompt
                        </summary>
                        <pre className="mt-2 whitespace-pre-wrap break-words text-[11px] leading-5 text-muted-foreground">
                          {pendingDesign.userPrompt}
                        </pre>
                      </details>
                    ) : null}
                  </div>
                </details>
              ) : pendingDesign.userPrompt || pendingDesign.promptPreview ? (
                <details className="rounded-lg border border-border/70 bg-card/60 px-3 py-3">
                  <summary className="cursor-pointer list-none text-sm font-medium text-foreground">
                    Prompt
                  </summary>
                  <pre className="mt-3 whitespace-pre-wrap break-words text-[11px] leading-5 text-muted-foreground">
                    {pendingDesign.userPrompt ?? pendingDesign.promptPreview}
                  </pre>
                </details>
              ) : null}
            </section>
          );
        })}
      </div>
    </div>
  );
}

const useGenerationLogItems = (open: boolean) => {
  const pendingDesigns = useStudioStore((state) => state.pendingDesigns);
  const projectId = useStudioStore((state) => state.projectId);
  const projectDesignJobsQuery = useListProjectDesignJobs(
    projectId ?? '',
    { limit: 50 },
    {
      query: {
        enabled: open && Boolean(projectId),
        queryKey: projectId ? getListProjectDesignJobsQueryKey(projectId, { limit: 50 }) : [],
        refetchInterval: open && projectId ? 15_000 : false,
        refetchOnWindowFocus: true,
        retry: false,
      },
    },
  );
  const serverDesignJobs =
    projectDesignJobsQuery.data?.status === 200 ? projectDesignJobsQuery.data.data.items : [];
  const localProjectDesigns = useMemo(
    () =>
      projectId ? pendingDesigns.filter((entry) => entry.projectId === projectId) : pendingDesigns,
    [pendingDesigns, projectId],
  );
  const assetDesignIds = useMemo(() => {
    const ids = new Set<string>();
    for (const job of serverDesignJobs) {
      if (job.designId) ids.add(job.designId);
    }
    for (const entry of localProjectDesigns) {
      if (entry.assetDesignId) ids.add(entry.assetDesignId);
    }
    return [...ids];
  }, [localProjectDesigns, serverDesignJobs]);
  const designDetailQueries = useQueries({
    queries: assetDesignIds.map((designId) => ({
      queryKey: [...getGetDesignQueryKey(designId), 'chat-log-parts'],
      queryFn: async (context: { signal: AbortSignal }) => {
        const response = await getDesign(designId, { signal: context.signal });
        if (response.status !== 200) {
          throw new Error('Unexpected response status');
        }
        return response.data;
      },
      enabled: open,
      refetchInterval: open ? 15_000 : false,
      refetchOnWindowFocus: true,
      retry: false,
    })),
  });
  const partsByDesignId = useMemo(() => {
    const byDesignId = new Map<string, Array<PendingDesignPart>>();
    for (const [index, designId] of assetDesignIds.entries()) {
      const data = designDetailQueries[index]?.data;
      if (!data) continue;
      byDesignId.set(designId, normalizeDesignParts(data));
    }
    return byDesignId;
  }, [assetDesignIds, designDetailQueries]);
  const generationLogItems = useMemo(() => {
    const localByJobId = new Map(localProjectDesigns.map((entry) => [entry.designId, entry]));
    const serverEntries: Array<PendingDesign> = serverDesignJobs.map((job) => {
      const local = localByJobId.get(job.designJobId);
      const assetDesignId = job.designId ?? local?.assetDesignId ?? null;
      return {
        designId: job.designJobId,
        projectId: job.projectId,
        assetDesignId,
        traceId: local?.traceId ?? null,
        promptPreview: job.promptPreview,
        userPrompt: job.userPrompt ?? local?.userPrompt ?? job.promptPreview,
        status: job.status,
        parts: assetDesignId
          ? (partsByDesignId.get(assetDesignId) ?? local?.parts ?? [])
          : (local?.parts ?? []),
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
        errorMessage: job.errorMessage ?? null,
        errorCode: job.errorCode ?? null,
      };
    });

    const serverJobIds = new Set(serverEntries.map((entry) => entry.designId));
    const localOnlyEntries = localProjectDesigns.filter(
      (entry) => !serverJobIds.has(entry.designId),
    );
    return [...serverEntries, ...localOnlyEntries].sort(
      (a, b) => getDesignTimestamp(a) - getDesignTimestamp(b),
    );
  }, [localProjectDesigns, partsByDesignId, serverDesignJobs]);

  return generationLogItems;
};

export function CreatePanelContent({
  open,
  hasSelectedPack = false,
  showJavaScriptDownload = false,
  parts = [],
  activePartId = null,
  onDownloadZip,
  onDownloadJavaScript,
  onPreviewPart,
}: CreatePanelContentProps) {
  const generationLogItems = useGenerationLogItems(open);

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <GenerationLog
        pendingDesigns={generationLogItems}
        loadedParts={parts}
        activePartId={activePartId}
        onDownloadZip={hasSelectedPack ? onDownloadZip : undefined}
        onPreviewPart={onPreviewPart}
      />
      {showJavaScriptDownload ? (
        <div className="border-t border-border/70 pt-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full justify-start rounded-lg text-xs text-muted-foreground"
            onClick={onDownloadJavaScript}
            disabled={!hasSelectedPack || !onDownloadJavaScript}
          >
            <FileText className="size-3.5" />
            Dev JavaScript
          </Button>
        </div>
      ) : null}
    </div>
  );
}
