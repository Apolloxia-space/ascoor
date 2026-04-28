'use client';

import Link from 'next/link';
import {
  AlertTriangle,
  ChevronDown,
  FolderOpen,
  Loader2,
  LogOut,
  User,
  XCircle,
} from 'lucide-react';
import { useState } from 'react';
import type { ReactNode } from 'react';

import { Button } from '@shared/components/ui/button';
import { Badge } from '@shared/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@shared/components/ui/dropdown-menu';
import { Skeleton } from '@shared/components/ui/skeleton';
import { cn } from '@shared/lib/utils';

type WorkspaceGenerationStatus = {
  kind: 'queued' | 'running' | 'succeeded' | 'failed';
  label: string;
  promptPreview?: string | null;
  errorMessage?: string | null;
  detailTitle?: string | null;
};

const formatWorkspaceListName = (name: string) => {
  return name.length > 30 ? `${name.slice(0, 27)}...` : name;
};

type AppHeaderProps = {
  className?: string;
  workspaceMenuOpen: boolean;
  onWorkspaceMenuChange: (open: boolean) => void;
  workspaceName?: string | null;
  workspaceId?: string | null;
  workspaces: Array<{ id: string; name: string }>;
  workspaceGenerationStatuses?: Record<string, WorkspaceGenerationStatus>;
  onSelectWorkspace: (id: string, name: string) => void;
  onCloseWorkspace: () => void;
  onOpenWorkspaceManager?: () => void;
  workspacesLoading?: boolean;
  workspacesRefreshing?: boolean;
  showWorkspaceMenu?: boolean;
  hideWorkspaceMenuOnMobile?: boolean;
  showBrand?: boolean;
  brandHref?: string;
  workspaceMenuRightSlot?: ReactNode;
  userMenuLeftSlot?: ReactNode;
  user: { displayName?: string | null; email?: string | null } | null;
  authStatus?: string;
  onSignIn?: () => void;
  onSignOut: () => void;
  showSignIn?: boolean;
};

export function AppHeader({
  className,
  workspaceMenuOpen,
  onWorkspaceMenuChange,
  workspaceName,
  workspaceId,
  workspaces,
  workspaceGenerationStatuses = {},
  onSelectWorkspace,
  onCloseWorkspace,
  onOpenWorkspaceManager,
  workspacesLoading = false,
  workspacesRefreshing = false,
  showWorkspaceMenu = true,
  hideWorkspaceMenuOnMobile = false,
  showBrand = true,
  brandHref,
  workspaceMenuRightSlot,
  userMenuLeftSlot,
  user,
  authStatus,
  onSignIn,
  onSignOut,
  showSignIn = true,
}: AppHeaderProps) {
  const canCloseWorkspace = Boolean(workspaceId);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const canShowSignIn = !user && showSignIn && onSignIn;
  const recentWorkspaces = workspaces.slice(0, 10);
  const showWorkspaceSkeleton = workspacesLoading && recentWorkspaces.length === 0;
  const workspaceLabel = showWorkspaceSkeleton
    ? workspaceId
      ? 'Loading workspace...'
      : 'Loading workspaces...'
    : workspaceName || 'No workspace selected';

  const renderGenerationStatus = (status?: WorkspaceGenerationStatus) => {
    if (!status) return null;
    const isFailed = status.kind === 'failed';
    const isGenerating = status.kind === 'queued' || status.kind === 'running';
    if (!isFailed && !isGenerating) return null;

    return (
      <Badge
        variant={isFailed ? 'destructive' : 'outline'}
        className="ml-auto max-w-[120px] gap-1 truncate"
        title={
          status.detailTitle ??
          (isFailed
            ? (status.errorMessage ?? status.promptPreview ?? status.label)
            : (status.promptPreview ?? status.label))
        }
      >
        {isFailed ? <AlertTriangle className="size-3" /> : null}
        {isGenerating ? <Loader2 className="size-3 animate-spin" /> : null}
        <span className="truncate">{status.label}</span>
      </Badge>
    );
  };

  return (
    <header
      className={cn(
        'flex items-center justify-between border-b border-border bg-background/70 px-4 py-3 backdrop-blur md:px-6',
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        {showBrand ? (
          <div className="flex items-center gap-2">
            {brandHref ? (
              <Link href={brandHref} className="text-lg font-semibold leading-tight">
                Ascoor
              </Link>
            ) : (
              <h1 className="text-lg font-semibold leading-tight">Ascoor</h1>
            )}
          </div>
        ) : null}
        {showWorkspaceMenu && (
          <div className={cn(hideWorkspaceMenuOnMobile && 'hidden md:block')}>
            <DropdownMenu open={workspaceMenuOpen} onOpenChange={onWorkspaceMenuChange}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="max-w-[200px] gap-2 md:max-w-none">
                  <FolderOpen className="size-4 text-muted-foreground" />
                  <span className="truncate font-medium">{workspaceLabel}</span>
                  <ChevronDown
                    className={cn(
                      'size-4 text-muted-foreground transition-transform',
                      workspaceMenuOpen && 'rotate-180',
                    )}
                  />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem
                  onSelect={() => {
                    onCloseWorkspace();
                    onWorkspaceMenuChange(false);
                  }}
                  disabled={!canCloseWorkspace}
                >
                  <XCircle className="size-4" />
                  Close workspace
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <div className="max-h-60 overflow-y-auto py-1 pr-1">
                  <div className="flex items-center gap-2 px-2 py-1 text-xs font-medium tracking-wide text-muted-foreground">
                    <span>Recent workspace</span>
                    {workspacesRefreshing && !showWorkspaceSkeleton ? (
                      <Loader2
                        className="size-3.5 animate-spin"
                        aria-label="Refreshing recent workspaces"
                      />
                    ) : null}
                  </div>
                  {showWorkspaceSkeleton ? (
                    <div className="space-y-2 px-2 py-1">
                      {[0, 1, 2].map((index) => (
                        <div key={index} className="flex items-center gap-2 rounded-sm px-2 py-2">
                          <Skeleton className="h-4 w-4 rounded-sm" />
                          <Skeleton className="h-4 flex-1" />
                        </div>
                      ))}
                    </div>
                  ) : recentWorkspaces.length === 0 ? (
                    <p className="px-2 py-2 text-sm text-muted-foreground">No workspaces</p>
                  ) : (
                    recentWorkspaces.map((workspace) => (
                      <DropdownMenuItem
                        key={workspace.id}
                        onSelect={() => {
                          onSelectWorkspace(workspace.id, workspace.name);
                          onWorkspaceMenuChange(false);
                        }}
                      >
                        <span className="min-w-0 flex-1 truncate" title={workspace.name}>
                          {formatWorkspaceListName(workspace.name)}
                        </span>
                        {renderGenerationStatus(workspaceGenerationStatuses[workspace.id])}
                        {workspaceId === workspace.id && (
                          <span className="text-xs text-primary">Current</span>
                        )}
                      </DropdownMenuItem>
                    ))
                  )}
                </div>
                {onOpenWorkspaceManager && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onSelect={() => {
                        onOpenWorkspaceManager();
                        onWorkspaceMenuChange(false);
                      }}
                    >
                      <FolderOpen className="size-4" />
                      Manage workspaces
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
        {workspaceMenuRightSlot}
      </div>
      <div className="hidden items-center gap-6 md:flex" />
      <div className="flex items-center gap-2">
        {userMenuLeftSlot}
        {user ? (
          <DropdownMenu open={userMenuOpen} onOpenChange={setUserMenuOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="User menu">
                <User className="size-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onSelect={() => {
                  setUserMenuOpen(false);
                  onSignOut();
                }}
              >
                <LogOut className="size-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : canShowSignIn ? (
          <Button variant="ghost" size="sm" onClick={onSignIn} disabled={authStatus === 'loading'}>
            <User className="size-4" />
            Sign in with Google
          </Button>
        ) : null}
      </div>
    </header>
  );
}
