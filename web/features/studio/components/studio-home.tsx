'use client';

import { AlertTriangle, ArrowRight, FolderOpen, Loader2, Sparkles } from 'lucide-react';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { cn } from '@/shared/lib/utils';
import type { ProjectResponseData } from '@/shared/api/generated/schemas';
import type { WorkspaceGenerationStatus } from '../lib/workspace-generation-status';

type StudioHomeProps = {
  projects: Array<ProjectResponseData>;
  workspaceGenerationStatuses: Record<string, WorkspaceGenerationStatus>;
  projectsLoading?: boolean;
  projectsRefreshing?: boolean;
  onCreateNewPack: () => void;
  onOpenProjectManager: () => void;
  onSelectProject: (id: string, name: string) => void;
};

type WorkspaceSectionItem = {
  project: ProjectResponseData;
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
}: {
  title: string;
  description?: string;
  items: Array<WorkspaceSectionItem>;
  emptyLabel?: string;
  onSelectProject: (id: string, name: string) => void;
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

            return (
              <button
                type="button"
                key={project.id}
                className="flex w-full items-start gap-3 rounded-lg border border-border/70 bg-background/70 px-4 py-3 text-left transition-colors hover:bg-accent/40"
                onClick={() => onSelectProject(project.id, project.name)}
              >
                <div className="mt-0.5 rounded-md bg-muted p-2 text-muted-foreground">
                  <FolderOpen className="size-4" />
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
  const sortedProjects = [...projects].sort(
    (a, b) => Date.parse(b.updatedAt || '') - Date.parse(a.updatedAt || ''),
  );
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
    .slice(0, 3);
  const continueWorkingIds = new Set(continueWorking.map((project) => project.id));
  const recentProjects = sortedProjects.filter(
    (project) => !excludedProjectIds.has(project.id) && !continueWorkingIds.has(project.id),
  );

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
        />
        <WorkspaceSection
          title="In progress"
          items={mapSectionItems(activeProjects)}
          onSelectProject={onSelectProject}
        />
        <WorkspaceSection
          title="Needs attention"
          items={mapSectionItems(failedProjects)}
          onSelectProject={onSelectProject}
        />
        <WorkspaceSection
          title="Recent workspaces"
          items={mapSectionItems(recentProjects)}
          emptyLabel="No additional workspaces."
          onSelectProject={onSelectProject}
        />
      </div>
    </main>
  );
}
