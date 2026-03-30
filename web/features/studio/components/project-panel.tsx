'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  CircleDashed,
  Copy,
  File,
  Loader2,
  Pencil,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

import { Button } from '@shared/components/ui/button';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@shared/components/ui/context-menu';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@shared/components/ui/dialog';
import { Input } from '@shared/components/ui/input';
import { ScrollArea } from '@shared/components/ui/scroll-area';
import { Skeleton } from '@shared/components/ui/skeleton';
import { cn } from '@shared/lib/utils';
import { toast } from 'sonner';
import {
  getListProjectDesignsQueryKey,
  useDeleteDesign,
  useUpdateDesign,
} from '@/shared/api/generated/client';
import type { ProjectDesignSummary } from '@/shared/api/generated/schemas';
import { DEFAULT_FORM_MAX_CHARS } from '@/shared/constants/form-limits';
import { type PendingDesign, useStudioStore } from '../stores/use-studio-store';

type ProjectPanelProps = {
  designs: Array<ProjectDesignSummary>;
  loading?: boolean;
  refreshing?: boolean;
  open: boolean;
  variant?: 'desktop' | 'mobile';
  onToggle: () => void;
  onOpenNewDesign: () => void;
  onSelectDesign?: (designId: string, name: string) => void;
  onRenameDesign?: (designId: string, name: string) => void;
  onDeleteDesign?: (designId: string) => void;
  selectedDesignId?: string | null;
};

type DesignTarget = {
  id: string;
  rawName: string;
  displayName: string;
};

const PENDING_STAGE_TIMELINE: Array<{ afterMs: number; title: string }> = [
  {
    afterMs: 0,
    title: 'Preparing design',
  },
  {
    afterMs: 6_000,
    title: 'Assembling draft',
  },
];

const getPendingStageTitle = (pending: PendingDesign, now: number): string => {
  const createdAt = Date.parse(pending.createdAt);
  const elapsedMs = Number.isFinite(createdAt) ? Math.max(now - createdAt, 0) : 0;

  let activeStage = PENDING_STAGE_TIMELINE[0];
  for (let index = 0; index < PENDING_STAGE_TIMELINE.length; index += 1) {
    const candidate = PENDING_STAGE_TIMELINE[index];
    if (elapsedMs >= candidate.afterMs) {
      activeStage = candidate;
    }
  }

  return activeStage.title;
};

export function ProjectPanel({
  designs,
  loading = false,
  refreshing = false,
  open,
  variant = 'desktop',
  onToggle,
  onSelectDesign,
  onRenameDesign,
  onDeleteDesign,
  selectedDesignId,
}: ProjectPanelProps) {
  const isMobileVariant = variant === 'mobile';
  const { projectId, pendingDesigns } = useStudioStore();
  const queryClient = useQueryClient();
  const updateDesign = useUpdateDesign();
  const deleteDesign = useDeleteDesign();
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [renameTarget, setRenameTarget] = useState<DesignTarget | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DesignTarget | null>(null);
  const [filterValue, setFilterValue] = useState('');
  const [stageNow, setStageNow] = useState(() => Date.now());

  const sortedDesigns = useMemo<Array<ProjectDesignSummary>>(() => {
    return [...designs].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [designs]);
  const filteredDesigns = useMemo(() => {
    const query = filterValue.trim().toLowerCase();
    if (!query) return sortedDesigns;
    return sortedDesigns.filter((design) =>
      (design.displayName ?? 'Untitled').toLowerCase().includes(query),
    );
  }, [sortedDesigns, filterValue]);

  const projectPendingDesigns = useMemo(() => {
    if (!projectId) return [];
    return pendingDesigns
      .filter((item) => item.projectId === projectId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [pendingDesigns, projectId]);

  const activePendingDesigns = useMemo(
    () => projectPendingDesigns.filter((item) => item.status !== 'failed'),
    [projectPendingDesigns],
  );
  const hasActiveDesigns = activePendingDesigns.length > 0;
  const showDesignSkeleton = loading && !hasActiveDesigns && designs.length === 0;

  useEffect(() => {
    if (!hasActiveDesigns) return;

    setStageNow(Date.now());
    const intervalId = window.setInterval(() => {
      setStageNow(Date.now());
    }, 1_200);

    return () => window.clearInterval(intervalId);
  }, [hasActiveDesigns]);

  const handleCopyName = (name: string) => {
    if (!name) return;
    void navigator.clipboard?.writeText(name);
  };
  const handleOpenRename = (target: DesignTarget) => {
    setRenameTarget(target);
    setRenameValue(target.rawName);
    setRenameDialogOpen(true);
  };
  const handleOpenDelete = (target: DesignTarget) => {
    setDeleteTarget(target);
    setDeleteDialogOpen(true);
  };
  const handleRenameDialogChange = (open: boolean) => {
    setRenameDialogOpen(open);
    if (!open) {
      setRenameTarget(null);
      setRenameValue('');
    }
  };
  const handleDeleteDialogChange = (open: boolean) => {
    setDeleteDialogOpen(open);
    if (!open) {
      setDeleteTarget(null);
    }
  };
  const invalidateDesigns = () => {
    if (!projectId) return;
    queryClient.invalidateQueries({ queryKey: getListProjectDesignsQueryKey(projectId) });
  };
  const handleRenameSubmit = async () => {
    if (!renameTarget) return;
    const normalized = renameValue.trim();
    if (!normalized) {
      toast.error('Please enter a design name.');
      return;
    }
    if (normalized === renameTarget.rawName.trim()) {
      handleRenameDialogChange(false);
      return;
    }
    try {
      await updateDesign.mutateAsync({
        designId: renameTarget.id,
        data: { displayName: normalized },
      });
      toast.success('Design name updated.');
      invalidateDesigns();
      onRenameDesign?.(renameTarget.id, normalized);
      handleRenameDialogChange(false);
    } catch (_error) {
      toast.error('Failed to update design name.');
    }
  };
  const handleDeleteSubmit = async () => {
    if (!deleteTarget) return;
    try {
      await deleteDesign.mutateAsync({ designId: deleteTarget.id });
      toast.success('Design deleted.');
      invalidateDesigns();
      onDeleteDesign?.(deleteTarget.id);
      handleDeleteDialogChange(false);
    } catch (_error) {
      toast.error('Failed to delete design.');
    }
  };

  return (
    <aside
      className={cn(
        'min-h-0 overflow-hidden border-r border-border transition-all duration-300',
        isMobileVariant ? 'flex h-full w-full flex-col' : 'hidden md:flex md:flex-col',
        open ? 'opacity-100' : 'border-transparent opacity-0',
        isMobileVariant ? (open ? 'w-full' : 'w-0') : open ? 'w-72' : 'w-0',
      )}
    >
      <div className={cn('flex h-full min-h-0 min-w-0 flex-col', !open && 'pointer-events-none')}>
        <div className="flex items-center justify-between border-b border-border/70 px-4 py-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold">Designs</p>
              {refreshing && !showDesignSkeleton ? (
                <Loader2
                  className="size-3.5 animate-spin text-muted-foreground"
                  aria-label="Refreshing designs"
                />
              ) : null}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onToggle}>
              <X className="size-4" />
            </Button>
          </div>
        </div>

        <div className="px-4 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Filter"
              className="h-10 pl-9 text-sm"
              aria-label="Filter designs"
              value={filterValue}
              onChange={(event) => setFilterValue(event.target.value)}
              disabled={showDesignSkeleton}
            />
          </div>
        </div>

        <ScrollArea className="min-h-0 min-w-0 flex-1 [&_[data-slot=scroll-area-viewport]>div]:!block [&_[data-slot=scroll-area-viewport]>div]:!w-full [&_[data-slot=scroll-area-viewport]>div]:!min-w-0 [&_[data-slot=scroll-area-viewport]>div]:!max-w-full">
          <div className="min-w-0 space-y-1 pb-3 pl-2 pr-3">
            {activePendingDesigns.map((pending) => {
              const stageTitle = getPendingStageTitle(pending, stageNow);

              return (
                <div
                  key={pending.designId}
                  className={cn(
                    'w-full min-w-0 max-w-full rounded-lg border border-border/60 bg-muted/20 px-3 py-3 text-left',
                    'animate-pulse',
                  )}
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border bg-background text-xs font-semibold">
                      <Loader2
                        className="size-4 animate-spin text-primary"
                        aria-label="Generating"
                      />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {pending.promptPreview}
                      </p>
                      <p className="mt-0.5 truncate text-xs font-medium text-primary">
                        {stageTitle}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
            {showDesignSkeleton ? (
              <div className="space-y-2 px-1 py-2">
                {[0, 1, 2, 3, 4].map((index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 rounded-lg px-3 py-2"
                    aria-hidden="true"
                  >
                    <Skeleton className="h-7 w-7 rounded-md" />
                    <Skeleton className="h-4 flex-1" />
                  </div>
                ))}
              </div>
            ) : sortedDesigns.length === 0 ? (
              hasActiveDesigns ? null : (
                <div className="px-3 py-2 text-sm text-muted-foreground">No designs yet</div>
              )
            ) : filteredDesigns.length === 0 ? (
              <div className="px-3 py-2 text-sm text-muted-foreground">No matching designs</div>
            ) : (
              <nav className="w-full min-w-0 space-y-1">
                {filteredDesigns.map((file) => {
                  if (!file) {
                    return null;
                  }
                  const rawName = file.displayName ?? 'Untitled';
                  const displayName = rawName;
                  const isSelected = file.id === selectedDesignId;
                  const isFailed = file.previewStatus === 'failed';
                  const isSucceeded = file.previewStatus === 'succeeded';
                  const isUnverified = !isFailed && !isSucceeded;
                  const target: DesignTarget = {
                    id: file.id,
                    rawName,
                    displayName,
                  };
                  return (
                    <ContextMenu key={file.id}>
                      <ContextMenuTrigger asChild>
                        <button
                          type="button"
                          className={cn(
                            'flex w-full min-w-0 max-w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-[color:var(--text-primary)]',
                            !isSelected && 'hover:bg-muted/80',
                            isSelected && 'bg-primary/10 text-primary',
                          )}
                          aria-current={isSelected ? 'page' : undefined}
                          onClick={() => onSelectDesign?.(file.id, rawName)}
                        >
                          <span
                            className={cn(
                              'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border bg-background text-xs font-semibold',
                              isSucceeded &&
                                'border-emerald-500/40 bg-emerald-500/10 text-emerald-700',
                              isFailed &&
                                'border-destructive/40 bg-destructive/10 text-destructive',
                              isUnverified && 'border-amber-500/40 bg-amber-500/10 text-amber-700',
                            )}
                          >
                            {isFailed ? (
                              <AlertTriangle className="size-3.5" aria-label="Design failed" />
                            ) : isSucceeded ? (
                              <Check className="size-3.5" aria-label="Design succeeded" />
                            ) : (
                              <CircleDashed
                                className="size-3.5"
                                aria-label="Preview pending confirmation"
                              />
                            )}
                          </span>
                          <span className="block min-w-0 flex-1 truncate">{displayName}</span>
                        </button>
                      </ContextMenuTrigger>
                      <ContextMenuContent className="w-52">
                        <ContextMenuItem onSelect={() => onSelectDesign?.(file.id, rawName)}>
                          <File className="size-4" />
                          Open
                        </ContextMenuItem>
                        <ContextMenuItem
                          onSelect={() => handleOpenRename(target)}
                          disabled={updateDesign.isPending || deleteDesign.isPending}
                        >
                          <Pencil className="size-4" />
                          Rename
                        </ContextMenuItem>
                        <ContextMenuSeparator className="bg-white/10" />
                        <ContextMenuItem onSelect={() => handleCopyName(displayName)}>
                          <Copy className="size-4" />
                          Copy design name
                        </ContextMenuItem>
                        <ContextMenuSeparator className="bg-white/10" />
                        <ContextMenuItem
                          variant="destructive"
                          className="focus:bg-destructive/15 focus:text-destructive"
                          onSelect={() => handleOpenDelete(target)}
                          disabled={deleteDesign.isPending}
                        >
                          <Trash2 className="size-4" />
                          Delete
                        </ContextMenuItem>
                      </ContextMenuContent>
                    </ContextMenu>
                  );
                })}
              </nav>
            )}
          </div>
        </ScrollArea>
      </div>
      <Dialog open={renameDialogOpen} onOpenChange={handleRenameDialogChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename design</DialogTitle>
            <DialogDescription>Enter a new design name.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 px-4 pb-2">
            <Input
              autoFocus
              value={renameValue}
              onChange={(event) =>
                setRenameValue(event.target.value.slice(0, DEFAULT_FORM_MAX_CHARS))
              }
              placeholder="Mechanical arm base"
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
            <Button
              onClick={handleRenameSubmit}
              disabled={!renameValue.trim() || updateDesign.isPending}
            >
              Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={deleteDialogOpen} onOpenChange={handleDeleteDialogChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this design?</AlertDialogTitle>
            <AlertDialogDescription>
              Deleting "{deleteTarget?.displayName ?? ''}" cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void handleDeleteSubmit();
              }}
              disabled={deleteDesign.isPending}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </aside>
  );
}
