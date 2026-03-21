'use client';

import { ChevronDown, File, FolderOpen, LogOut, PlusCircle, User, XCircle } from 'lucide-react';
import { useState } from 'react';
import type { ReactNode } from 'react';

import { Button } from '@shared/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@shared/components/ui/dropdown-menu';
import { cn } from '@shared/lib/utils';

type AppHeaderProps = {
  projectMenuOpen: boolean;
  onProjectMenuChange: (open: boolean) => void;
  onOpenNewProject: () => void;
  projectName?: string | null;
  projectId?: string | null;
  projects: Array<{ id: string; name: string }>;
  onSelectProject: (id: string, name: string) => void;
  onCloseProject: () => void;
  onOpenProjectManager?: () => void;
  showProjectMenu?: boolean;
  hideProjectMenuOnMobile?: boolean;
  showBrand?: boolean;
  projectMenuRightSlot?: ReactNode;
  user: { displayName?: string | null; email?: string | null } | null;
  authStatus?: string;
  onSignIn?: () => void;
  onSignOut: () => void;
  showSignIn?: boolean;
};

export function AppHeader({
  projectMenuOpen,
  onProjectMenuChange,
  onOpenNewProject,
  projectName,
  projectId,
  projects,
  onSelectProject,
  onCloseProject,
  onOpenProjectManager,
  showProjectMenu = true,
  hideProjectMenuOnMobile = false,
  showBrand = true,
  projectMenuRightSlot,
  user,
  authStatus,
  onSignIn,
  onSignOut,
  showSignIn = true,
}: AppHeaderProps) {
  const canCloseProject = Boolean(projectId);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const canShowSignIn = !user && showSignIn && onSignIn;

  return (
    <header className="flex items-center justify-between border-b border-white/10 bg-background/70 px-4 py-3 backdrop-blur md:px-6">
      <div className="flex min-w-0 items-center gap-3">
        {showBrand ? (
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold leading-tight">Ascoor</h1>
          </div>
        ) : null}
        {showProjectMenu && (
          <div className={cn(hideProjectMenuOnMobile && 'hidden md:block')}>
            <DropdownMenu open={projectMenuOpen} onOpenChange={onProjectMenuChange}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="max-w-[200px] gap-2 md:max-w-none">
                  <FolderOpen className="size-4 text-[color:var(--text-secondary)]" />
                  <span className="truncate font-medium">
                    {projectName || 'No project selected'}
                  </span>
                  <ChevronDown
                    className={cn(
                      'size-4 text-[color:var(--text-secondary)] transition-transform',
                      projectMenuOpen && 'rotate-180',
                    )}
                  />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem
                  onSelect={() => {
                    onOpenNewProject();
                    onProjectMenuChange(false);
                  }}
                >
                  <PlusCircle className="size-4" />
                  New project
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => {
                    onCloseProject();
                    onProjectMenuChange(false);
                  }}
                  disabled={!canCloseProject}
                >
                  <XCircle className="size-4" />
                  Close Project
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <div className="max-h-60 overflow-y-auto py-1 pr-1">
                  <p className="px-2 py-1 text-xs font-medium tracking-wide text-muted-foreground">
                    Recent project
                  </p>
                  {projects.slice(0, 10).map((project) => (
                    <DropdownMenuItem
                      key={project.id}
                      onSelect={() => {
                        onSelectProject(project.id, project.name);
                        onProjectMenuChange(false);
                      }}
                    >
                      <File className="size-4" />
                      <span className="truncate">{project.name}</span>
                      {projectId === project.id && (
                        <span className="ml-auto text-xs text-primary">Current</span>
                      )}
                    </DropdownMenuItem>
                  ))}
                </div>
                {onOpenProjectManager && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onSelect={() => {
                        onOpenProjectManager();
                        onProjectMenuChange(false);
                      }}
                    >
                      <FolderOpen className="size-4" />
                      Manage projects
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
        {projectMenuRightSlot}
      </div>
      <div className="hidden items-center gap-6 md:flex" />
      <div className="flex items-center gap-2">
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
