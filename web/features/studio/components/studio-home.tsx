'use client';

import Image from 'next/image';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, ArrowRight, FolderOpen, Loader2, Sparkles } from 'lucide-react';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { WorkspaceThumbnailPlaceholder } from '@/shared/components/ui/workspace-thumbnail-placeholder';
import { cn } from '@/shared/lib/utils';
import { getWorkspaceThumbnailContent } from '@/shared/api/generated/client';
import type { WorkspaceResponseData } from '@/shared/api/generated/schemas';
import type { WorkspaceGenerationStatus } from '../lib/workspace-generation-status';

type StudioHomeWorkspace = WorkspaceResponseData & {
  thumbnailAssetUri?: string | null;
};

type StudioHomeProps = {
  workspaces: Array<StudioHomeWorkspace>;
  workspaceGenerationStatuses: Record<string, WorkspaceGenerationStatus>;
  workspacesLoading?: boolean;
  workspacesRefreshing?: boolean;
  onCreateNewPack: () => void;
  onOpenWorkspaceManager: () => void;
  onSelectWorkspace: (id: string, name: string) => void;
};

type WorkspaceSectionItem = {
  workspace: StudioHomeWorkspace;
  generationStatus?: WorkspaceGenerationStatus;
};

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

const formatUpdatedAt = (value: string) => {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return null;
  return dateFormatter.format(new Date(timestamp));
};

const formatCreatedAt = (value: string) => {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return null;
  return dateFormatter.format(new Date(timestamp));
};

const getStatusTone = (status?: WorkspaceGenerationStatus) => {
  if (!status) return 'outline' as const;
  if (status.kind === 'failed') return 'destructive' as const;
  return 'outline' as const;
};

const WorkspaceSection = ({
  title,
  description,
  items,
  emptyLabel,
  onSelectWorkspace,
  thumbnailUrls,
  variant = 'list',
}: {
  title: string;
  description?: string;
  items: Array<WorkspaceSectionItem>;
  emptyLabel?: string;
  onSelectWorkspace: (id: string, name: string) => void;
  thumbnailUrls: Record<string, string>;
  variant?: 'list' | 'cards';
}) => {
  if (items.length === 0 && !emptyLabel) return null;

  return (
    <section className="space-y-3">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {items.length === 0 ? (
        <p
          className={cn(
            'text-sm text-muted-foreground',
            variant === 'cards' && 'py-12 text-center',
          )}
        >
          {emptyLabel}
        </p>
      ) : variant === 'cards' ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {items.map(({ workspace }) => {
            const thumbnailUrl = thumbnailUrls[workspace.id] ?? null;
            const createdAt = formatCreatedAt(workspace.createdAt);

            return (
              <button
                type="button"
                key={workspace.id}
                className="flex w-full flex-col text-left transition-opacity hover:opacity-90"
                onClick={() => onSelectWorkspace(workspace.id, workspace.name)}
              >
                <div className="aspect-square w-full overflow-hidden rounded-md bg-muted">
                  {thumbnailUrl ? (
                    <Image
                      src={thumbnailUrl}
                      alt={`${workspace.name} thumbnail`}
                      unoptimized
                      width={480}
                      height={480}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <WorkspaceThumbnailPlaceholder />
                  )}
                </div>
                <div className="pt-2">
                  <p className="line-clamp-2 text-sm font-medium text-foreground">
                    {workspace.name}
                  </p>
                  {createdAt ? (
                    <p className="pt-1 text-xs text-muted-foreground">{createdAt}</p>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="space-y-2">
          {items.map(({ workspace, generationStatus }) => {
            const updatedAt = formatUpdatedAt(workspace.updatedAt);
            const isGenerating =
              generationStatus?.kind === 'queued' || generationStatus?.kind === 'running';
            const subtitle =
              generationStatus?.errorMessage ??
              generationStatus?.promptPreview ??
              (updatedAt ? `Updated ${updatedAt}` : null);
            const thumbnailUrl = thumbnailUrls[workspace.id] ?? null;

            return (
              <button
                type="button"
                key={workspace.id}
                className="flex w-full items-start gap-3 rounded-lg border px-4 py-3 text-left transition-colors hover:bg-accent/40"
                onClick={() => onSelectWorkspace(workspace.id, workspace.name)}
              >
                <div className="mt-0.5 flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border/70 bg-muted text-muted-foreground">
                  {thumbnailUrl ? (
                    <Image
                      src={thumbnailUrl}
                      alt={`${workspace.name} thumbnail`}
                      unoptimized
                      width={56}
                      height={56}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <WorkspaceThumbnailPlaceholder iconClassName="h-4 w-4" />
                  )}
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                      {workspace.name}
                    </p>
                    {generationStatus ? (
                      <Badge
                        variant={getStatusTone(generationStatus)}
                        className="max-w-[180px] gap-1 truncate"
                        title={generationStatus.detailTitle}
                      >
                        {generationStatus.kind === 'failed' ? (
                          <AlertTriangle className="size-3" />
                        ) : null}
                        {isGenerating ? <Loader2 className="size-3 animate-spin" /> : null}
                        <span className="truncate">{generationStatus.label}</span>
                      </Badge>
                    ) : null}
                  </div>
                  {subtitle ? (
                    <p
                      className={cn(
                        'line-clamp-2 text-sm text-muted-foreground',
                        generationStatus?.kind === 'failed' && 'text-destructive/90',
                      )}
                    >
                      {subtitle}
                    </p>
                  ) : null}
                </div>
                <ArrowRight className="mt-1 size-4 shrink-0 text-muted-foreground" />
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
};

export function StudioHome({
  workspaces,
  workspaceGenerationStatuses,
  workspacesLoading = false,
  workspacesRefreshing = false,
  onCreateNewPack,
  onOpenWorkspaceManager,
  onSelectWorkspace,
}: StudioHomeProps) {
  const [thumbnailUrls, setThumbnailUrls] = useState<Record<string, string>>({});
  const thumbnailUrlMapRef = useRef<Record<string, string>>({});
  const sortedWorkspaces = useMemo(
    () =>
      [...workspaces].sort((a, b) => Date.parse(b.updatedAt || '') - Date.parse(a.updatedAt || '')),
    [workspaces],
  );
  const thumbnailWorkspaces = useMemo(
    () =>
      sortedWorkspaces.filter(
        (workspace) =>
          typeof workspace.thumbnailAssetUri === 'string' && workspace.thumbnailAssetUri,
      ),
    [sortedWorkspaces],
  );
  const thumbnailWorkspacesKey = useMemo(
    () =>
      thumbnailWorkspaces
        .map((workspace) => `${workspace.id}:${workspace.thumbnailAssetUri ?? ''}`)
        .join('|'),
    [thumbnailWorkspaces],
  );
  const thumbnailWorkspacesSnapshot = useMemo(() => thumbnailWorkspaces, [thumbnailWorkspacesKey]);

  useEffect(() => {
    if (!thumbnailWorkspacesKey) {
      Object.values(thumbnailUrlMapRef.current).forEach((url) => {
        URL.revokeObjectURL(url);
      });
      thumbnailUrlMapRef.current = {};
      setThumbnailUrls({});
      return;
    }

    let cancelled = false;
    void (async () => {
      const entries = await Promise.all(
        thumbnailWorkspacesSnapshot.map(async (workspace) => {
          try {
            const response = await getWorkspaceThumbnailContent(workspace.id);
            if (response.status !== 200) {
              return null;
            }
            return [workspace.id, URL.createObjectURL(response.data)] as const;
          } catch {
            return null;
          }
        }),
      );

      if (cancelled) {
        entries.forEach((entry) => {
          if (entry) URL.revokeObjectURL(entry[1]);
        });
        return;
      }

      const nextUrls = Object.fromEntries(entries.filter((entry) => entry !== null));
      Object.values(thumbnailUrlMapRef.current).forEach((url) => {
        URL.revokeObjectURL(url);
      });
      thumbnailUrlMapRef.current = nextUrls;
      setThumbnailUrls(nextUrls);
    })();

    return () => {
      cancelled = true;
    };
  }, [thumbnailWorkspacesKey, thumbnailWorkspacesSnapshot]);

  useEffect(() => {
    return () => {
      Object.values(thumbnailUrlMapRef.current).forEach((url) => {
        URL.revokeObjectURL(url);
      });
    };
  }, []);

  const activeWorkspaces = sortedWorkspaces.filter((workspace) => {
    const status = workspaceGenerationStatuses[workspace.id];
    return status?.kind === 'queued' || status?.kind === 'running';
  });
  const failedWorkspaces = sortedWorkspaces.filter(
    (workspace) => workspaceGenerationStatuses[workspace.id]?.kind === 'failed',
  );
  const excludedWorkspaceIds = new Set([...activeWorkspaces, ...failedWorkspaces].map((p) => p.id));
  const continueWorking = sortedWorkspaces
    .filter((workspace) => !excludedWorkspaceIds.has(workspace.id))
    .slice(0, 10);
  const showAssetPackOnboarding = sortedWorkspaces.length === 0;

  const mapSectionItems = (items: Array<WorkspaceResponseData>) =>
    items.map((workspace) => ({
      workspace,
      generationStatus: workspaceGenerationStatuses[workspace.id],
    }));

  return (
    <main className="flex min-h-0 flex-1 justify-center overflow-y-auto px-4 py-6 md:px-6 md:py-8">
      <div className="flex w-full max-w-6xl min-h-0 flex-col gap-8">
        <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
              Studio
            </h1>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              className={cn('rounded-lg', showAssetPackOnboarding && 'relative overflow-hidden')}
              onClick={onCreateNewPack}
            >
              {showAssetPackOnboarding ? (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 -left-2/3 z-0 w-1/2 animate-[studio-cta-shine_2.2s_ease-in-out_infinite] skew-x-[-18deg] bg-white/80"
                />
              ) : null}
              <Sparkles className="relative z-10 size-4" />
              <span className="relative z-10">Create asset pack</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              className="rounded-lg"
              onClick={onOpenWorkspaceManager}
            >
              <FolderOpen className="size-4" />
              Manage workspaces
            </Button>
          </div>
        </section>

        {workspacesRefreshing && !workspacesLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Refreshing workspaces
          </div>
        ) : null}

        <WorkspaceSection
          title="Continue working"
          items={mapSectionItems(continueWorking)}
          emptyLabel={
            showAssetPackOnboarding
              ? 'Create your first asset pack.'
              : 'No completed workspaces yet.'
          }
          onSelectWorkspace={onSelectWorkspace}
          thumbnailUrls={thumbnailUrls}
          variant="cards"
        />
        <WorkspaceSection
          title="In progress"
          items={mapSectionItems(activeWorkspaces)}
          onSelectWorkspace={onSelectWorkspace}
          thumbnailUrls={thumbnailUrls}
        />
        <WorkspaceSection
          title="Needs attention"
          items={mapSectionItems(failedWorkspaces)}
          onSelectWorkspace={onSelectWorkspace}
          thumbnailUrls={thumbnailUrls}
        />
      </div>
    </main>
  );
}
