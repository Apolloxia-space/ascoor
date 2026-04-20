'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Loader2, MoreHorizontal, Pencil, Search, Trash2 } from 'lucide-react';

import { Button } from '@shared/components/ui/button';
import { Badge } from '@shared/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@shared/components/ui/dialog';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@shared/components/ui/input-group';
import { Input } from '@shared/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@shared/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@shared/components/ui/alert-dialog';
import { Skeleton } from '@shared/components/ui/skeleton';
import { toast } from 'sonner';
import { useAuthStore } from '@/features/auth/use-auth-store';
import { listProjects } from '@/shared/api/generated/client';
import { DEFAULT_FORM_MAX_CHARS } from '@/shared/constants/form-limits';
import { useStudioStore } from '../../stores/use-studio-store';
import { useStudioApi } from '../../hooks/use-studio-api';
import { getWorkspaceGenerationStatuses, type WorkspaceGenerationStatus } from '../../lib/workspace-generation-status';

const formatWorkspaceListName = (name: string) => {
  return name.length > 30 ? `${name.slice(0, 27)}...` : name;
};

type ProjectListDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectProject: (id: string, name: string) => void;
  onDeleteCurrentProject: () => void;
};

export function ProjectListDialog({
  open,
  onOpenChange,
  onSelectProject,
  onDeleteCurrentProject,
}: ProjectListDialogProps) {
  const PROJECTS_PAGE_SIZE = 20;
  const { projects, projectId, pendingDesigns, setProject, setProjects } = useStudioStore();
  const [query, setQuery] = useState('');
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [renameTarget, setRenameTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const { status } = useAuthStore();
  const queryClient = useQueryClient();
  const { updateProject, deleteProject, invalidateProjects } = useStudioApi();
  const listContainerRef = useRef<HTMLDivElement | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const normalizedQuery = query.trim();
  const projectManagerQueryKey = ['projects-manager', normalizedQuery] as const;

  const projectPagesQuery = useInfiniteQuery({
    queryKey: projectManagerQueryKey,
    initialPageParam: undefined as string | undefined,
    enabled: open && status === 'authenticated',
    queryFn: async ({ pageParam, signal }) => {
      const response = await listProjects(
        {
          limit: PROJECTS_PAGE_SIZE,
          cursor: pageParam,
          q: normalizedQuery.length > 0 ? normalizedQuery : undefined,
        },
        { signal },
      );
      if (response.status !== 200) {
        throw new Error('Unexpected response status');
      }
      return response.data;
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });

  const pagedProjects = useMemo(
    () => projectPagesQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [projectPagesQuery.data],
  );
  const projectGenerationStatuses = useMemo(
    () => getWorkspaceGenerationStatuses(pendingDesigns),
    [pendingDesigns],
  );

  const renderGenerationStatus = (generationStatus?: WorkspaceGenerationStatus) => {
    if (!generationStatus) return null;
    const isFailed = generationStatus.kind === 'failed';
    const isGenerating = generationStatus.kind === 'queued' || generationStatus.kind === 'running';

    return (
      <Badge
        variant={isFailed ? 'destructive' : 'outline'}
        className="max-w-[140px] gap-1 truncate"
        title={
          isFailed
            ? (generationStatus.errorMessage ?? generationStatus.promptPreview)
            : generationStatus.promptPreview
        }
      >
        {isFailed ? <AlertTriangle className="size-3" /> : null}
        {isGenerating ? <Loader2 className="size-3 animate-spin" /> : null}
        <span className="truncate">{generationStatus.label}</span>
      </Badge>
    );
  };

  useEffect(() => {
    if (!open) return;
    if (!projectPagesQuery.hasNextPage || projectPagesQuery.isFetchingNextPage) return;

    const root = listContainerRef.current;
    const target = loadMoreRef.current;
    if (!root || !target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        void projectPagesQuery.fetchNextPage();
      },
      { root, rootMargin: '160px' },
    );
    observer.observe(target);

    return () => observer.disconnect();
  }, [
    open,
    projectPagesQuery.hasNextPage,
    projectPagesQuery.isFetchingNextPage,
    projectPagesQuery.fetchNextPage,
    pagedProjects.length,
  ]);

  const handleRenameDialogChange = (nextOpen: boolean) => {
    setRenameOpen(nextOpen);
    if (!nextOpen) {
      setRenameTarget(null);
      setRenameValue('');
    }
  };

  const handleDeleteDialogChange = (nextOpen: boolean) => {
    setDeleteOpen(nextOpen);
    if (!nextOpen) {
      setDeleteTarget(null);
    }
  };

  const handleRename = async () => {
    if (!renameTarget) return;
    const normalized = renameValue.trim();
    if (!normalized) {
      toast.error('Please enter a workspace name.');
      return;
    }
    if (normalized === renameTarget.name) {
      handleRenameDialogChange(false);
      return;
    }
    try {
      await updateProject(renameTarget.id, normalized);
      const updatedProjects = projects.map((project) =>
        project.id === renameTarget.id ? { ...project, name: normalized } : project,
      );
      setProjects(updatedProjects);
      if (projectId === renameTarget.id) {
        setProject(renameTarget.id, normalized);
      }
      queryClient.invalidateQueries({ queryKey: ['projects-manager'] });
      invalidateProjects();
      handleRenameDialogChange(false);
      toast.success('Workspace name updated.');
    } catch (_error) {
      toast.error('Failed to update workspace name.');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteProject(deleteTarget.id);
      const updatedProjects = projects.filter((project) => project.id !== deleteTarget.id);
      setProjects(updatedProjects);
      if (projectId === deleteTarget.id) {
        onDeleteCurrentProject();
      }
      queryClient.invalidateQueries({ queryKey: ['projects-manager'] });
      invalidateProjects();
      handleDeleteDialogChange(false);
      toast.success('Workspace deleted.');
    } catch (_error) {
      toast.error('Failed to delete workspace.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0">
        <div className="sr-only">
          <DialogTitle>Select a workspace</DialogTitle>
          <DialogDescription>Select a workspace to get started.</DialogDescription>
        </div>
        <div
          className="flex min-h-[520px] flex-col bg-[color:var(--background-panel)] text-[color:var(--text-primary)]"
          style={{ height: 'min(90vh, 900px)' }}
        >
          <div className="flex flex-col gap-3 border-b border-white/10 px-6 py-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--text-muted)]">
              Workspaces
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <div className="min-w-[220px] flex-1">
                <InputGroup>
                  <InputGroupAddon>
                    <Search className="size-4" />
                  </InputGroupAddon>
                  <InputGroupInput
                    placeholder="Search workspaces"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                  />
                </InputGroup>
              </div>
            </div>
          </div>

          <div ref={listContainerRef} className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
            {projectPagesQuery.isPending ? (
              <div className="space-y-2 py-1">
                {[0, 1, 2, 3, 4].map((index) => (
                  <div key={index} className="flex items-center gap-3 rounded-lg px-2 py-3">
                    <Skeleton className="h-8 w-8 rounded-md bg-white/10" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-2/3 bg-white/10" />
                      <Skeleton className="h-3 w-1/3 bg-white/10" />
                    </div>
                  </div>
                ))}
              </div>
            ) : projectPagesQuery.isError ? (
              <div className="rounded-lg border border-dashed border-white/10 px-6 py-10 text-center text-sm text-[color:var(--text-muted)]">
                <p>Could not load workspaces.</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => {
                    void projectPagesQuery.refetch();
                  }}
                >
                  Retry
                </Button>
              </div>
            ) : pagedProjects.length === 0 ? (
              <div className="rounded-lg border border-dashed border-white/10 px-6 py-10 text-center text-sm text-[color:var(--text-muted)]">
                {normalizedQuery.length === 0 ? (
                  <p>No workspaces yet. Create an asset pack to get started.</p>
                ) : (
                  <p>No workspaces match your search.</p>
                )}
              </div>
            ) : (
              <div className="space-y-1">
                {pagedProjects.map((project) => (
                  <div key={project.id} className="flex items-center gap-2">
                    <div className="flex-1 [&_[data-slot=button]]:w-full [&_[data-slot=button]]:justify-start [&_[data-slot=button]]:text-left">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          onSelectProject(project.id, project.name);
                          onOpenChange(false);
                        }}
                      >
                        <span
                          className="min-w-0 flex-1 truncate text-sm font-semibold text-[color:var(--text-primary)]"
                          title={project.name}
                        >
                          {formatWorkspaceListName(project.name)}
                        </span>
                        {renderGenerationStatus(projectGenerationStatuses[project.id])}
                        {projectId === project.id && <Badge variant="secondary">Selected</Badge>}
                      </Button>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label="Workspace actions">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onSelect={() => {
                            setRenameTarget({ id: project.id, name: project.name });
                            setRenameValue(project.name);
                            setRenameOpen(true);
                          }}
                        >
                          <Pencil className="size-4" />
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onSelect={() => {
                            setDeleteTarget({ id: project.id, name: project.name });
                            setDeleteOpen(true);
                          }}
                        >
                          <Trash2 className="size-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
                <div
                  ref={loadMoreRef}
                  className="py-2 text-center text-xs text-[color:var(--text-muted)]"
                >
                  {projectPagesQuery.isFetchingNextPage ? (
                    <div className="flex items-center justify-center">
                      <Loader2 className="size-4 animate-spin" aria-label="Loading more workspaces" />
                    </div>
                  ) : projectPagesQuery.hasNextPage ? (
                    'Scroll to load more'
                  ) : null}
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>

      <Dialog open={renameOpen} onOpenChange={handleRenameDialogChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename workspace</DialogTitle>
            <DialogDescription>Enter a new name.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pb-2">
            <Input
              autoFocus
              placeholder="Enter a workspace name"
              value={renameValue}
              onChange={(event) =>
                setRenameValue(event.target.value.slice(0, DEFAULT_FORM_MAX_CHARS))
              }
              maxLength={DEFAULT_FORM_MAX_CHARS}
            />
            <p className="text-right text-xs text-muted-foreground">
              {renameValue.length}/{DEFAULT_FORM_MAX_CHARS}
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => handleRenameDialogChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleRename}>Rename</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={handleDeleteDialogChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this workspace?</AlertDialogTitle>
            <AlertDialogDescription>
              Deleting {deleteTarget?.name ?? 'this workspace'} cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
