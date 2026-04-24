'use client';

import Image from 'next/image';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, ArrowRight, FolderOpen, Loader2, Sparkles } from 'lucide-react';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { cn } from '@/shared/lib/utils';
import { getProjectThumbnailContent } from '@/shared/api/generated/client';
import type { ProjectResponseData } from '@/shared/api/generated/schemas';
import type { WorkspaceGenerationStatus } from '../lib/workspace-generation-status';

type StudioHomeProject = ProjectResponseData & {
  thumbnailAssetUri?: string | null;
};

type StudioHomeProps = {
  projects: Array<StudioHomeProject>;
  workspaceGenerationStatuses: Record<string, WorkspaceGenerationStatus>;
  projectsLoading?: boolean;
  projectsRefreshing?: boolean;
  onCreateNewPack: () => void;
  onOpenProjectManager: () => void;
  onSelectProject: (id: string, name: string) => void;
};

type WorkspaceSectionItem = {
  project: StudioHomeProject;
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
  onSelectProject,
  thumbnailUrls,
  variant = 'list',
}: {
  title: string;
  description?: string;
  items: Array<WorkspaceSectionItem>;
  emptyLabel?: string;
  onSelectProject: (id: string, name: string) => void;
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
        <p className="text-sm text-muted-foreground">{emptyLabel}</p>
      ) : variant === 'cards' ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {items.map(({ project }) => {
            const thumbnailUrl = thumbnailUrls[project.id] ?? null;
            const createdAt = formatCreatedAt(project.createdAt);

            return (
              <button
                type="button"
                key={project.id}
                className="flex w-full flex-col text-left transition-opacity hover:opacity-90"
                onClick={() => onSelectProject(project.id, project.name)}
              >
                <div className="aspect-square w-full overflow-hidden rounded-md bg-muted">
                  {thumbnailUrl ? (
                    <Image
                      src={thumbnailUrl}
                      alt={`${project.name} thumbnail`}
                      unoptimized
                      width={480}
                      height={480}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                      <FolderOpen className="size-5" />
                    </div>
                  )}
                </div>
                <div className="pt-2">
                  <p className="line-clamp-2 text-sm font-medium text-foreground">
                    {project.name}
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
          {items.map(({ project, generationStatus }) => {
            const updatedAt = formatUpdatedAt(project.updatedAt);
            const isGenerating =
              generationStatus?.kind === 'queued' || generationStatus?.kind === 'running';
            const subtitle =
              generationStatus?.errorMessage ??
              generationStatus?.promptPreview ??
              (updatedAt ? `Updated ${updatedAt}` : null);
            const thumbnailUrl = thumbnailUrls[project.id] ?? null;

            return (
              <button
                type="button"
                key={project.id}
                className="flex w-full items-start gap-3 rounded-lg border border-border/70 bg-background/70 px-4 py-3 text-left transition-colors hover:bg-accent/40"
                onClick={() => onSelectProject(project.id, project.name)}
              >
                <div className="mt-0.5 flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border/70 bg-muted text-muted-foreground">
                  {thumbnailUrl ? (
                    <Image
                      src={thumbnailUrl}
                      alt={`${project.name} thumbnail`}
                      unoptimized
                      width={56}
                      height={56}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <FolderOpen className="size-4" />
                  )}
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                      {project.name}
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
  projects,
  workspaceGenerationStatuses,
  projectsLoading = false,
  projectsRefreshing = false,
  onCreateNewPack,
  onOpenProjectManager,
  onSelectProject,
}: StudioHomeProps) {
  const [thumbnailUrls, setThumbnailUrls] = useState<Record<string, string>>({});
  const thumbnailUrlMapRef = useRef<Record<string, string>>({});
  const sortedProjects = useMemo(
    () =>
      [...projects].sort((a, b) => Date.parse(b.updatedAt || '') - Date.parse(a.updatedAt || '')),
    [projects],
  );
  const thumbnailProjects = useMemo(
    () =>
      sortedProjects.filter(
        (project) => typeof project.thumbnailAssetUri === 'string' && project.thumbnailAssetUri,
      ),
    [sortedProjects],
  );
  const thumbnailProjectsKey = useMemo(
    () =>
      thumbnailProjects.map((project) => `${project.id}:${project.thumbnailAssetUri ?? ''}`).join('|'),
    [thumbnailProjects],
  );
  const thumbnailProjectsSnapshot = useMemo(() => thumbnailProjects, [thumbnailProjectsKey]);

  useEffect(() => {
    if (!thumbnailProjectsKey) {
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
        thumbnailProjectsSnapshot.map(async (project) => {
          try {
            const response = await getProjectThumbnailContent(project.id);
            if (response.status !== 200) {
              return null;
            }
            return [project.id, URL.createObjectURL(response.data)] as const;
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
  }, [thumbnailProjectsKey, thumbnailProjectsSnapshot]);

  useEffect(() => {
    return () => {
      Object.values(thumbnailUrlMapRef.current).forEach((url) => {
        URL.revokeObjectURL(url);
      });
    };
  }, []);

  const activeProjects = sortedProjects.filter((project) => {
    const status = workspaceGenerationStatuses[project.id];
    return status?.kind === 'queued' || status?.kind === 'running';
  });
  const failedProjects = sortedProjects.filter(
    (project) => workspaceGenerationStatuses[project.id]?.kind === 'failed',
  );
  const excludedProjectIds = new Set([...activeProjects, ...failedProjects].map((p) => p.id));
  const continueWorking = sortedProjects
    .filter((project) => !excludedProjectIds.has(project.id))
    .slice(0, 10);

  const mapSectionItems = (items: Array<ProjectResponseData>) =>
    items.map((project) => ({
      project,
      generationStatus: workspaceGenerationStatuses[project.id],
    }));

  if (!projectsLoading && sortedProjects.length === 0) {
    return (
      <main className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto bg-[color:var(--background-panel)]/80 px-4 py-8 md:px-6">
        <div className="flex w-full max-w-3xl flex-col items-start gap-5">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
              Studio
            </h1>
            <p className="text-sm text-muted-foreground md:text-base">
              Create your first asset pack and it will appear here.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button type="button" size="lg" className="rounded-lg" onClick={onCreateNewPack}>
              <Sparkles className="size-4" />
              Create asset pack
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="rounded-lg"
              onClick={onOpenProjectManager}
            >
              <FolderOpen className="size-4" />
              Manage workspaces
            </Button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-0 flex-1 justify-center overflow-y-auto bg-[color:var(--background-panel)]/80 px-4 py-6 md:px-6 md:py-8">
      <div className="flex w-full max-w-6xl min-h-0 flex-col gap-8">
        <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
              Studio
            </h1>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button type="button" className="rounded-lg" onClick={onCreateNewPack}>
              <Sparkles className="size-4" />
              Create asset pack
            </Button>
            <Button
              type="button"
              variant="outline"
              className="rounded-lg"
              onClick={onOpenProjectManager}
            >
              <FolderOpen className="size-4" />
              Manage workspaces
            </Button>
          </div>
        </section>

        {projectsRefreshing && !projectsLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Refreshing workspaces
          </div>
        ) : null}

        <WorkspaceSection
          title="Continue working"
          items={mapSectionItems(continueWorking)}
          emptyLabel="No completed workspaces yet."
          onSelectProject={onSelectProject}
          thumbnailUrls={thumbnailUrls}
          variant="cards"
        />
        <WorkspaceSection
          title="In progress"
          items={mapSectionItems(activeProjects)}
          onSelectProject={onSelectProject}
          thumbnailUrls={thumbnailUrls}
        />
        <WorkspaceSection
          title="Needs attention"
          items={mapSectionItems(failedProjects)}
          onSelectProject={onSelectProject}
          thumbnailUrls={thumbnailUrls}
        />
      </div>
    </main>
  );
}
